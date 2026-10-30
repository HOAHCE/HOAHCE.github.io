import Link from "next/link";
import { notFound } from "next/navigation";
import { REMOTE_KIND, STAGES, TOOLS, toolByAlias } from "@/lib/registry";
import { Icon } from "@/components/Icon";
import { Lookup } from "@/components/Lookup";
import { RemoteLookup } from "@/components/RemoteLookup";
import { FormsLookup } from "@/components/FormsLookup";
import { FundsTabs } from "@/components/FundsTabs";
import { JournalsTabs } from "@/components/JournalsTabs";
import { SurveyLab } from "@/components/SurveyLab";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ alias: t.alias }));
}

export default async function ToolPage({ params }: { params: Promise<{ alias: string }> }) {
  const { alias } = await params;
  const tool = toolByAlias(alias);
  if (!tool) notFound();
  const stage = STAGES.find((s) => s.id === tool.stage);

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name={tool.icon} size={20} /></span>
        <div>
          <h1 className="text-xl font-bold">{tool.name}</h1>
          <p className="text-sm text-muted-foreground">Giai đoạn {tool.stage}. {stage?.name} — {tool.desc}</p>
        </div>
      </div>

      {tool.status === "soon" ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">Công cụ này đang được phát triển.</p>
          <p className="mt-1 text-sm text-muted-foreground">Cần engine/dịch vụ riêng (xem tài liệu phân tích, mục 6). Trong lúc chờ, bạn có thể hỏi Trợ lý chính.</p>
          <Link href={`/chat?q=${encodeURIComponent(`Hướng dẫn ${tool.name.toLowerCase()}`)}`} className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Hỏi Trợ lý chính</Link>
        </div>
      ) : tool.alias === "surveylab" ? (
        <SurveyLab />
      ) : tool.alias === "journals" ? (
        <JournalsTabs />
      ) : tool.alias === "funds" ? (
        <FundsTabs />
      ) : tool.alias === "regulations" ? (
        <FormsLookup />
      ) : REMOTE_KIND[tool.alias] ? (
        <RemoteLookup kind={REMOTE_KIND[tool.alias]} />
      ) : (
        <Lookup alias={tool.alias} />
      )}
    </div>
  );
}
