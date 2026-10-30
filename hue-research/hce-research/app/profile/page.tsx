"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useProfile } from "@/lib/store";

const LEVELS = ["Sinh viên", "Học viên cao học", "Nghiên cứu sinh", "Giảng viên", "Cán bộ nghiên cứu / quản lý khoa học"];

export default function ProfilePage() {
  const { data: session } = authClient.useSession();
  const [p, setP, ready] = useProfile();
  const orcid = (session?.user as { orcid?: string | null } | undefined)?.orcid;
  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-bold">Hồ sơ của tôi</h1>
        <p className="text-sm text-muted-foreground">Trợ lý dùng hồ sơ này để xưng hô và gợi ý phù hợp. Bạn có thể để trống.</p>
      </div>

      {session ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <div className="font-medium">{session.user.name}</div>
          {!session.user.email.endsWith("@orcid.invalid") && <div className="text-muted-foreground">{session.user.email}</div>}
          {orcid && (
            <a className="mt-1 inline-block text-primary hover:underline" href={`https://orcid.org/${orcid}`} target="_blank" rel="noreferrer">ORCID iD: {orcid}</a>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Bạn đang ở chế độ khách: hồ sơ chỉ lưu trên trình duyệt này. <Link href="/login" className="text-primary underline">Đăng nhập</Link> để lưu theo tài khoản.
        </p>
      )}

      {ready && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Trình độ
            <select className={`${field} mt-1`} value={p.level} onChange={(e) => setP({ ...p, level: e.target.value })}>
              <option value="">— Chọn —</option>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Đơn vị
            <input className={`${field} mt-1`} value={p.unit} onChange={(e) => setP({ ...p, unit: e.target.value })} placeholder="Ví dụ: Khoa Quản trị kinh doanh" />
          </label>
          <label className="block text-sm font-medium">Lĩnh vực nghiên cứu
            <input className={`${field} mt-1`} value={p.field} onChange={(e) => setP({ ...p, field: e.target.value })} placeholder="Ví dụ: marketing số, kinh tế nông thôn" />
          </label>
          <p className="text-xs text-muted-foreground">Tự động lưu.</p>
        </div>
      )}
    </div>
  );
}
