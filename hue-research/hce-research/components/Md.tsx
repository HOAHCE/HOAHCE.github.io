import { Fragment } from "react";

// Hiển thị Markdown tối giản (đậm, nghiêng, gạch đầu dòng) mà không dùng innerHTML.
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.length > 2 && p.startsWith("_") && p.endsWith("_")) return <em key={i} className="text-muted-foreground">{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Md({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const bullets = lines.filter((l) => l.startsWith("- "));
        if (bullets.length && bullets.length === lines.filter(Boolean).length - (lines[0] && !lines[0].startsWith("- ") ? 1 : 0)) {
          const head = lines[0] && !lines[0].startsWith("- ") ? lines[0] : null;
          return (
            <div key={i}>
              {head && <p>{inline(head)}</p>}
              <ul className="list-disc space-y-1 pl-5">
                {bullets.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}
              </ul>
            </div>
          );
        }
        return <p key={i}>{inline(b)}</p>;
      })}
    </div>
  );
}
