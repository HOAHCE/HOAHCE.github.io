"use client";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Providers = { email: boolean; github: boolean; orcid: boolean };

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function OrcidMark() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden>
      <circle cx="128" cy="128" r="128" fill="#A6CE39" />
      <path fill="#fff" d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.7-43.7-39.7h-23.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.6 10.1 10.1z" />
    </svg>
  );
}

export default function Login() {
  const [prov, setProv] = useState<Providers | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/providers").then((r) => r.json()).then(setProv).catch(() => setProv({ email: true, github: false, orcid: false }));
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    const { error } = await authClient.signIn.magicLink({ email: email.trim(), callbackURL: "/" });
    if (error) {
      setState("error");
      setMsg(error.message || "Không gửi được liên kết. Vui lòng thử lại.");
    } else {
      setState("sent");
    }
  }

  const oauthBtn = "flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-xl font-bold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-muted-foreground">Dùng email, GitHub hoặc ORCID iD. Chưa có tài khoản thì hệ thống tự tạo khi đăng nhập lần đầu.</p>

      <div className="mt-6 space-y-3">
        <button className={oauthBtn} disabled={!prov?.github} onClick={() => authClient.signIn.social({ provider: "github", callbackURL: "/" })}>
          <GithubMark /> Đăng nhập bằng GitHub {prov && !prov.github && <span className="text-xs text-muted-foreground">(chưa cấu hình)</span>}
        </button>
        <button className={oauthBtn} disabled={!prov?.orcid} onClick={() => authClient.signIn.social({ provider: "orcid", callbackURL: "/" })}>
          <OrcidMark /> Đăng nhập bằng ORCID {prov && !prov.orcid && <span className="text-xs text-muted-foreground">(chưa cấu hình)</span>}
        </button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />hoặc<span className="h-px flex-1 bg-border" /></div>

      {state === "sent" ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-medium">Đã gửi liên kết đăng nhập.</p>
          <p className="mt-1 text-muted-foreground">Kiểm tra hộp thư của <strong>{email}</strong> (kể cả thư rác). Liên kết có hiệu lực 10 phút và chỉ dùng được một lần.</p>
        </div>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@truong.edu.vn" autoComplete="email" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <button disabled={state === "sending"} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            <Mail size={16} /> {state === "sending" ? "Đang gửi…" : "Gửi liên kết đăng nhập"}
          </button>
          {state === "error" && <p role="alert" className="text-sm text-red-600">{msg}</p>}
        </form>
      )}

      <p className="mt-6 text-xs text-muted-foreground">Không cần mật khẩu. ORCID có thể không cung cấp email, khi đó hồ sơ chỉ gắn với ORCID iD của bạn.</p>
    </div>
  );
}
