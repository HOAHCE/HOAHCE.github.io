import nodemailer from "nodemailer";
import fs from "node:fs";
import path from "node:path";

type Mail = { to: string; subject: string; text: string };

export async function sendMail(m: Mail) {
  const host = process.env.SMTP_HOST;
  if (host) {
    const t = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await t.sendMail({ from: process.env.SMTP_FROM || "HCE Research <no-reply@localhost>", ...m });
    return;
  }
  if (process.env.NODE_ENV === "production") {
    // Không ghi liên kết đăng nhập vào log ở môi trường thật: ai đọc được log sẽ chiếm được tài khoản.
    throw new Error("SMTP chưa được cấu hình (SMTP_HOST).");
  }
  // Chế độ phát triển: ghi thư ra tệp để thử luồng đăng nhập mà không cần máy chủ thư.
  const f = path.join(process.cwd(), "data", "dev-mail.log");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.appendFileSync(f, `--- ${new Date().toISOString()} → ${m.to}\n${m.subject}\n${m.text}\n\n`);
  console.log(`[dev-mail] thư tới ${m.to} đã ghi vào data/dev-mail.log`);
}
