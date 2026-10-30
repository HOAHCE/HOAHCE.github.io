"use client";
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

// ORCID (generic OAuth) được đăng ký như một nhà cung cấp xã hội: signIn.social({ provider: "orcid" }).
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
