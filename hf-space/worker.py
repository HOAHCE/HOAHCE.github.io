"""Chạy MỘT lượt GPT Researcher trong tiến trình riêng.

app.py khởi chạy file này cho mỗi yêu cầu, truyền:
  - cấu hình (câu hỏi, loại báo cáo, giọng văn...) qua stdin dưới dạng JSON;
  - API key của người dùng và cấu hình GPT Researcher qua biến môi trường
    của riêng tiến trình này, nên key của hai người dùng không bao giờ lẫn nhau
    và mất đi ngay khi tiến trình kết thúc.

stdout chỉ dùng để gửi sự kiện (mỗi dòng một JSON) về app.py; mọi thứ thư viện
in ra đều bị chuyển sang stderr.
"""

import asyncio
import json
import os
import sys


def _open_event_channel():
    """Giữ stdout gốc làm kênh sự kiện, chuyển mọi output khác sang stderr."""
    channel = os.fdopen(os.dup(1), "w", buffering=1, encoding="utf-8")
    os.dup2(2, 1)
    sys.stdout = sys.stderr
    return channel


CHANNEL = _open_event_channel()


def emit(event: dict) -> None:
    CHANNEL.write(json.dumps(event, ensure_ascii=False) + "\n")
    CHANNEL.flush()


class EventStream:
    """Đóng vai 'websocket' mà GPT Researcher gửi tiến độ tới."""

    async def send_json(self, data: dict) -> None:
        kind = data.get("type")
        output = data.get("output")
        if kind == "logs" and output:
            emit({"type": "log", "text": str(output)})
        elif kind == "report" and output:
            emit({"type": "chunk", "text": str(output)})


async def run(params: dict) -> None:
    from gpt_researcher import GPTResearcher
    from gpt_researcher.utils.enum import Tone

    researcher = GPTResearcher(
        query=params["query"],
        report_type=params["report_type"],
        tone=Tone[params["tone"]],
        websocket=EventStream(),
        verbose=False,
    )
    await researcher.conduct_research()
    emit({"type": "log", "text": "✍️ Đang viết báo cáo..."})
    report = await researcher.write_report()

    emit({"type": "report", "markdown": report})
    emit({"type": "sources", "urls": list(dict.fromkeys(researcher.get_source_urls()))})
    try:
        emit({"type": "cost", "usd": round(float(researcher.get_costs()), 4)})
    except Exception:
        pass


def main() -> None:
    params = json.loads(sys.stdin.read())
    try:
        asyncio.run(run(params))
        emit({"type": "done"})
    except Exception as exc:  # báo lỗi gọn cho người dùng, chi tiết nằm ở stderr
        import traceback

        traceback.print_exc()
        emit({"type": "error", "message": f"{type(exc).__name__}: {exc}"[:600]})
        sys.exit(1)


if __name__ == "__main__":
    main()
