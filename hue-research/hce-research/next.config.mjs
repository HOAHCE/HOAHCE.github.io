// Cấu hình dạng .mjs để chạy `next start` trong Docker mà không cần cài TypeScript lúc chạy.
/** @type {import('next').NextConfig} */
const nextConfig = {
  // HCE_STANDALONE=1 khi build để tạo gói tự chứa (.next/standalone).
  output: process.env.HCE_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
