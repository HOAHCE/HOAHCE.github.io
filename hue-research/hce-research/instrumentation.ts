// Chạy một lần khi máy chủ khởi động: tạo/cập nhật bảng xác thực của Better Auth.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { auth } = await import("./lib/auth");
  const { getMigrations } = await import("better-auth/db/migration");
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  const { abortStaleJobs } = await import("./lib/jobs");
  abortStaleJobs();
}
