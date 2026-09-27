"""Máy chủ nhỏ bọc GPT Researcher cho trang tranthaihoa.id.vn/ai-tools/.

Mô hình "mang key của bạn" (BYOK):
  - Người dùng gửi API key của họ cùng yêu cầu, qua HTTPS.
  - Key chỉ được đặt vào biến môi trường của MỘT tiến trình con chạy đúng
    lượt nghiên cứu đó; không ghi log, không lưu đĩa, mất khi tiến trình dừng.
  - Máy chủ không dùng key nào của chủ trang.

Tiến độ được trả về dạng NDJSON (mỗi dòng một JSON) để trang web hiển thị trực tiếp.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import sys
import tempfile
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

HERE = Path(__file__).resolve().parent
WORKER = HERE / "worker.py"


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://tranthaihoa.id.vn,https://www.tranthaihoa.id.vn,https://hoahce.github.io,"
        "http://localhost:4000,http://127.0.0.1:4000",
    ).split(",")
    if o.strip()
]
MAX_CONCURRENT = _env_int("MAX_CONCURRENT", 2)
RUN_TIMEOUT = _env_int("RUN_TIMEOUT", 900)  # giây
RATE_LIMIT_PER_HOUR = _env_int("RATE_LIMIT_PER_HOUR", 8)  # lượt / IP / giờ

# Mô hình mặc định cho từng nhà cung cấp. Có thể đổi trong Settings của Space
# (ví dụ GOOGLE_SMART_LLM=gemini-...) mà không cần sửa mã.
PROVIDERS = {
    "google": {
        "label": "Google Gemini",
        "prefix": "google_genai",
        "key_env": "GOOGLE_API_KEY",
        "fast": os.environ.get("GOOGLE_FAST_LLM", "gemini-3.5-flash-lite"),
        "smart": os.environ.get("GOOGLE_SMART_LLM", "gemini-3.8-flash"),
        "embedding": os.environ.get("GOOGLE_EMBEDDING", "google_genai:gemini-embedding-001"),
    },
    "openai": {
        "label": "OpenAI",
        "prefix": "openai",
        "key_env": "OPENAI_API_KEY",
        "fast": os.environ.get("OPENAI_FAST_LLM", "gpt-4.1-mini"),
        "smart": os.environ.get("OPENAI_SMART_LLM", "gpt-4.1"),
        "embedding": os.environ.get("OPENAI_EMBEDDING", "openai:text-embedding-3-small"),
    },
    "anthropic": {
        "label": "Anthropic Claude",
        "prefix": "anthropic",
        "key_env": "ANTHROPIC_API_KEY",
        "fast": os.environ.get("ANTHROPIC_FAST_LLM", "claude-haiku-4-5-20251001"),
        "smart": os.environ.get("ANTHROPIC_SMART_LLM", "claude-sonnet-5"),
        # Anthropic không có API embedding → dùng mô hình đa ngôn ngữ chạy ngay trên Space.
        "embedding": os.environ.get(
            "ANTHROPIC_EMBEDDING",
            "huggingface:sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        ),
    },
}

REPORT_TYPES = ["research_report", "resource_report", "outline_report", "detailed_report"]
TONES = ["Objective", "Formal", "Analytical", "Critical", "Explanatory"]
CITATION_STYLES = ["APA", "IEEE", "Harvard", "MLA", "Chicago"]
ACADEMIC_RETRIEVERS = ["arxiv", "semantic_scholar", "pubmed_central"]

# Chỉ chuyển những biến môi trường cần thiết sang tiến trình con.
PASSTHROUGH_ENV = [
    "PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "PYTHONPATH",
    "HF_HOME", "SENTENCE_TRANSFORMERS_HOME", "TRANSFORMERS_CACHE", "TIKTOKEN_CACHE_DIR",
    "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE",
    "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy",
]

MODEL_RE = re.compile(r"^[A-Za-z0-9._:\-/]{1,100}$")


class ResearchRequest(BaseModel):
    query: str = Field(min_length=5, max_length=1500)
    report_type: Literal[tuple(REPORT_TYPES)] = "research_report"  # type: ignore[valid-type]
    tone: Literal[tuple(TONES)] = "Objective"  # type: ignore[valid-type]
    language: Literal["vietnamese", "english"] = "vietnamese"
    citation_style: Literal[tuple(CITATION_STYLES)] = "APA"  # type: ignore[valid-type]
    total_words: int = Field(default=1200, ge=300, le=4000)
    provider: Literal["google", "openai", "anthropic"] = "google"
    llm_api_key: str = Field(min_length=8, max_length=400)
    smart_model: str | None = None
    fast_model: str | None = None
    web_search: Literal["tavily", "duckduckgo", "none"] = "tavily"
    tavily_api_key: str | None = Field(default=None, max_length=400)
    academic: list[str] = Field(default_factory=list)

    @field_validator("smart_model", "fast_model")
    @classmethod
    def _model_name(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        v = v.strip()
        if not MODEL_RE.match(v):
            raise ValueError("Tên mô hình không hợp lệ.")
        return v

    @field_validator("academic")
    @classmethod
    def _academic(cls, v: list[str]) -> list[str]:
        return [r for r in dict.fromkeys(v) if r in ACADEMIC_RETRIEVERS]

    @field_validator("llm_api_key", "tavily_api_key")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        return v.strip() if isinstance(v, str) else v


app = FastAPI(title="Trợ lý nghiên cứu (GPT Researcher)", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    max_age=600,
)

_slots = asyncio.Semaphore(MAX_CONCURRENT)
_running = 0
_history: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")


def _check_rate(ip: str) -> None:
    now = time.time()
    q = _history[ip]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= RATE_LIMIT_PER_HOUR:
        wait = int(3600 - (now - q[0])) // 60 + 1
        raise HTTPException(429, f"Bạn đã chạy {RATE_LIMIT_PER_HOUR} lượt trong một giờ. Thử lại sau khoảng {wait} phút.")
    q.append(now)


def _build_env(req: ResearchRequest) -> dict[str, str]:
    p = PROVIDERS[req.provider]
    smart = req.smart_model or p["smart"]
    fast = req.fast_model or p["fast"]

    retrievers: list[str] = []
    if req.web_search != "none":
        retrievers.append(req.web_search)
    retrievers += req.academic

    env = {k: os.environ[k] for k in PASSTHROUGH_ENV if k in os.environ}
    env.update(
        {
            p["key_env"]: req.llm_api_key,
            "FAST_LLM": f"{p['prefix']}:{fast}",
            "SMART_LLM": f"{p['prefix']}:{smart}",
            "STRATEGIC_LLM": f"{p['prefix']}:{smart}",
            "EMBEDDING": p["embedding"],
            "RETRIEVER": ",".join(retrievers),
            "LANGUAGE": req.language,
            "REPORT_FORMAT": req.citation_style,
            "TOTAL_WORDS": str(req.total_words),
            "MAX_SUBTOPICS": "3",
            "PYTHONUNBUFFERED": "1",
            "PYTHONIOENCODING": "utf-8",
            "TOKENIZERS_PARALLELISM": "false",
        }
    )
    if req.web_search == "tavily" and req.tavily_api_key:
        env["TAVILY_API_KEY"] = req.tavily_api_key
    return env


def _redact(text: str, secrets: list[str]) -> str:
    for s in secrets:
        if s:
            text = text.replace(s, "•••")
    return text


def _line(obj: dict) -> bytes:
    return (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8")


@app.get("/")
@app.get("/api/health")
async def health() -> dict:
    return {
        "ok": True,
        "busy": _running,
        "max_concurrent": MAX_CONCURRENT,
        "providers": {k: {"label": v["label"], "smart": v["smart"], "fast": v["fast"]} for k, v in PROVIDERS.items()},
        "report_types": REPORT_TYPES,
        "academic": ACADEMIC_RETRIEVERS,
    }


@app.post("/api/research")
async def research(req: ResearchRequest, request: Request) -> StreamingResponse:
    if req.web_search == "tavily" and not req.tavily_api_key:
        raise HTTPException(422, "Chọn Tavily thì cần nhập Tavily API key (hoặc đổi sang DuckDuckGo).")
    if req.web_search == "none" and not req.academic:
        raise HTTPException(422, "Cần chọn ít nhất một nguồn tìm kiếm.")
    if _slots.locked():
        raise HTTPException(503, "Máy chủ đang bận với các lượt khác. Vui lòng thử lại sau ít phút.")
    _check_rate(_client_ip(request))

    job = _Job(req)
    task = asyncio.create_task(job.run())

    async def stream():
        try:
            while True:
                item = await job.queue.get()
                job.last_read = time.monotonic()
                if item is None:
                    break
                yield _line(item)
        finally:
            # Người dùng đóng trang / bấm Dừng: dừng luôn tiến trình nghiên cứu.
            if not task.done():
                task.cancel()

    return StreamingResponse(
        stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


class _Job:
    """Một lượt nghiên cứu. Tự giải phóng tài nguyên kể cả khi trình duyệt ngắt kết nối."""

    # Không ai đọc luồng sự kiện trong chừng này giây (vẫn có ping mỗi 15 giây)
    # nghĩa là trình duyệt đã đóng → dừng tiến trình.
    ABANDON_AFTER = 60

    def __init__(self, req: ResearchRequest):
        self.req = req
        self.env = _build_env(req)
        self.secrets = [req.llm_api_key, req.tavily_api_key or ""]
        self.params = {"query": req.query.strip(), "report_type": req.report_type, "tone": req.tone}
        self.queue: asyncio.Queue = asyncio.Queue()
        self.last_read = time.monotonic()

    def put(self, event: dict) -> None:
        self.queue.put_nowait(event)

    def abandoned(self) -> bool:
        return self.queue.qsize() > 0 and time.monotonic() - self.last_read > self.ABANDON_AFTER

    async def run(self) -> None:
        global _running
        async with _slots:
            _running += 1
            workdir = tempfile.mkdtemp(prefix="gptr-")
            proc = None
            err_task = None
            stderr_tail: deque[str] = deque(maxlen=40)
            try:
                p = PROVIDERS[self.req.provider]
                self.put({
                    "type": "log",
                    "text": f"🚀 Bắt đầu nghiên cứu với {p['label']} ({self.req.smart_model or p['smart']}), "
                            f"nguồn: {self.env['RETRIEVER'].replace(',', ', ')}",
                })
                proc = await asyncio.create_subprocess_exec(
                    sys.executable, str(WORKER),
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=workdir,
                    env=self.env,
                    limit=8 * 1024 * 1024,
                )
                proc.stdin.write(json.dumps(self.params, ensure_ascii=False).encode("utf-8"))
                await proc.stdin.drain()
                proc.stdin.close()

                async def drain_stderr():
                    async for raw in proc.stderr:
                        stderr_tail.append(raw.decode("utf-8", "replace").rstrip())

                err_task = asyncio.create_task(drain_stderr())
                deadline = time.monotonic() + RUN_TIMEOUT
                finished = False

                while True:
                    if self.abandoned():
                        return
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        self.put({"type": "error", "message": f"Quá thời gian cho phép ({RUN_TIMEOUT // 60} phút). Hãy thu hẹp câu hỏi hoặc chọn loại báo cáo ngắn hơn."})
                        return
                    try:
                        raw = await asyncio.wait_for(proc.stdout.readline(), timeout=min(15, remaining))
                    except asyncio.TimeoutError:
                        self.put({"type": "ping"})  # giữ kết nối qua proxy
                        continue
                    if not raw:
                        break
                    text = _redact(raw.decode("utf-8", "replace").strip(), self.secrets)
                    if not text:
                        continue
                    try:
                        event = json.loads(text)
                    except json.JSONDecodeError:
                        continue
                    if event.get("type") in ("done", "error"):
                        finished = True
                    self.put(event)

                try:
                    await asyncio.wait_for(proc.wait(), timeout=5)
                    await asyncio.wait_for(err_task, timeout=5)
                except asyncio.TimeoutError:
                    pass
                if not finished:
                    tail = _redact("\n".join(list(stderr_tail)[-6:]), self.secrets)
                    self.put({"type": "error", "message": "Tiến trình nghiên cứu dừng bất thường.\n" + tail[-800:]})
            except Exception as exc:
                self.put({"type": "error", "message": f"Lỗi máy chủ: {type(exc).__name__}"})
            finally:
                if proc and proc.returncode is None:
                    proc.kill()
                    try:
                        await asyncio.wait_for(proc.wait(), timeout=5)
                    except BaseException:
                        pass
                if err_task and not err_task.done():
                    err_task.cancel()
                shutil.rmtree(workdir, ignore_errors=True)
                _running -= 1
                self.queue.put_nowait(None)
