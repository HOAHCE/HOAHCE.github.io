import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, magicLink } from "better-auth/plugins";
import { db, audit } from "./db";
import { sendMail } from "./mail";

const env = process.env;
const isProd = env.NODE_ENV === "production";

export const providers = {
  email: true,
  github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  orcid: Boolean(env.ORCID_CLIENT_ID && env.ORCID_CLIENT_SECRET),
};

// ORCID dùng OpenID Connect. Dùng sandbox khi ORCID_ENV=sandbox (đăng ký ứng dụng thử tại sandbox.orcid.org).
const orcidBase = env.ORCID_ENV === "sandbox" ? "https://sandbox.orcid.org" : "https://orcid.org";

const allowedDomains = (env.ALLOWED_EMAIL_DOMAINS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const adminEmails = (env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL || "http://localhost:3100",
  // Production thật bắt buộc có BETTER_AUTH_SECRET; chỉ pha build (không phục vụ yêu cầu) mới dùng giá trị tạm.
  secret: env.BETTER_AUTH_SECRET || (isProd && env.NEXT_PHASE !== "phase-production-build" ? undefined : "dev-only-secret-change-me-dev-only-secret"),
  database: db,
  session: { expiresIn: 60 * 60 * 24 * 30 },
  user: {
    additionalFields: {
      orcid: { type: "string", required: false, input: false },
    },
  },
  socialProviders: providers.github
    ? { github: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! } }
    : {},
  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      async sendMagicLink({ email, url }) {
        const domain = email.split("@")[1]?.toLowerCase() ?? "";
        if (allowedDomains.length && !allowedDomains.includes(domain)) {
          // Không tiết lộ danh sách tên miền; chỉ bỏ qua việc gửi.
          audit(null, "login.email.blocked_domain", domain);
          return;
        }
        await sendMail({
          to: email,
          subject: "Đăng nhập HCE Research",
          text: `Bấm vào liên kết để đăng nhập (hiệu lực 10 phút, dùng một lần):\n\n${url}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
        });
        audit(null, "login.email.sent", email);
      },
    }),
    ...(providers.orcid
      ? [
          genericOAuth({
            config: [
              {
                providerId: "orcid",
                clientId: env.ORCID_CLIENT_ID!,
                clientSecret: env.ORCID_CLIENT_SECRET!,
                discoveryUrl: `${orcidBase}/.well-known/openid-configuration`,
                scopes: ["openid"],
                pkce: true,
                // ORCID thường không trả email (người dùng có thể ẩn). Tạo email giả trên TLD ".invalid"
                // (không thể trùng email thật, nên không bao giờ tự liên kết với tài khoản email khác).
                async getUserInfo(tokens) {
                  const res = await fetch(`${orcidBase}/oauth/userinfo`, {
                    headers: { Authorization: `Bearer ${tokens.accessToken}`, Accept: "application/json" },
                  });
                  if (!res.ok) return null;
                  const p = (await res.json()) as { sub: string; name?: string; given_name?: string; family_name?: string };
                  const name = p.name || [p.given_name, p.family_name].filter(Boolean).join(" ") || p.sub;
                  return {
                    id: p.sub,
                    name,
                    email: `${p.sub}@orcid.invalid`,
                    emailVerified: false,
                    orcid: p.sub,
                  };
                },
                mapProfileToUser: (profile) => ({ orcid: String(profile.orcid ?? profile.sub ?? "") }),
              },
            ],
          }),
        ]
      : []),
    nextCookies(),
  ],
  databaseHooks: {
    user: {
      create: { after: async (u) => audit(u.id, "user.created", u.email) },
    },
    session: {
      create: { after: async (s) => audit(s.userId, "login") },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

export async function getSession(headers: Headers) {
  const s = await auth.api.getSession({ headers });
  if (!s) return null;
  return { ...s, isAdmin: adminEmails.includes(s.user.email.toLowerCase()) };
}
