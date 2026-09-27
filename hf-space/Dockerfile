FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/home/user/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/home/user/.cache/huggingface \
    TIKTOKEN_CACHE_DIR=/home/user/.cache/tiktoken

# Hugging Face Spaces chạy container với user id 1000.
RUN useradd -m -u 1000 user
WORKDIR /home/user/app

# torch bản CPU cho nhẹ (chỉ dùng cho embedding khi chọn Claude).
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install -r requirements.txt

USER user
# Tải sẵn mô hình embedding đa ngôn ngữ để lượt chạy đầu không phải chờ.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')" \
 && python -c "import tiktoken; [tiktoken.get_encoding(e) for e in ('o200k_base', 'cl100k_base')]"

COPY --chown=user app.py worker.py ./

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers", "--forwarded-allow-ips", "*"]
