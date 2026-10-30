import { BRAND, STAGES, TOOLS } from "@/lib/registry";

export const metadata = { title: `Hướng dẫn — ${BRAND.name}` };

export default function Guide() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-bold">Hướng dẫn sử dụng</h1>
      <p className="text-sm">{BRAND.name} đồng hành cùng nhà nghiên cứu qua 6 giai đoạn của một đề tài. Dùng <strong>Trợ lý chính</strong> để hỏi nhanh, <strong>Dự án</strong> để theo dõi tiến độ, và các <strong>công cụ</strong> theo từng giai đoạn.</p>
      {STAGES.map((s) => (
        <section key={s.id}>
          <h2 className="font-semibold">{s.id}. {s.name}</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {TOOLS.filter((t) => t.stage === s.id).map((t) => (
              <li key={t.alias}><strong>{t.name}</strong>{t.status === "soon" ? " (sắp có)" : ""} — {t.desc}</li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <h2 className="font-semibold">Lưu ý</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          <li>Dữ liệu bài báo, chuyên gia, quỹ, biểu mẫu hiện là dữ liệu mẫu.</li>
          <li>Dự án, hội thoại, phiếu khảo sát được lưu trên trình duyệt của bạn.</li>
          <li>Câu trả lời của AI cần được kiểm chứng trước khi dùng trong công bố khoa học.</li>
        </ul>
      </section>
    </div>
  );
}
