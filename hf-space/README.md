---
title: Tro ly nghien cuu
emoji: 🔎
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
short_description: GPT Researcher cho tranthaihoa.id.vn/ai-tools
---

# Trợ lý nghiên cứu — máy chủ GPT Researcher

Máy chủ phía sau công cụ **AI Tools › Trợ lý nghiên cứu** trên
<https://tranthaihoa.id.vn/ai-tools/tro-ly-nghien-cuu/>. Dựa trên
[GPT Researcher](https://github.com/assafelovic/gpt-researcher) (Apache-2.0).

Mô hình **mang key của bạn**: người dùng tự nhập API key trên trang web; key chỉ
tồn tại trong tiến trình chạy đúng lượt nghiên cứu đó, không ghi log, không lưu.
Máy chủ không cần (và không nên đặt) key nào của chủ trang.

## API

- `GET /api/health` — kiểm tra máy chủ, xem mô hình mặc định.
- `POST /api/research` — JSON vào, trả về NDJSON (mỗi dòng một sự kiện:
  `log`, `chunk`, `report`, `sources`, `cost`, `error`, `done`, `ping`).

## Tuỳ chỉnh (Settings → Variables của Space, không bắt buộc)

| Biến                                        | Mặc định                                            | Ý nghĩa                            |
| ------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| `ALLOWED_ORIGINS`                           | tranthaihoa.id.vn, hoahce.github.io, localhost:4000 | Trang nào được gọi máy chủ         |
| `MAX_CONCURRENT`                            | `2`                                                 | Số lượt chạy cùng lúc              |
| `RUN_TIMEOUT`                               | `900`                                               | Giới hạn thời gian mỗi lượt (giây) |
| `RATE_LIMIT_PER_HOUR`                       | `8`                                                 | Số lượt / địa chỉ IP / giờ         |
| `GOOGLE_SMART_LLM`, `GOOGLE_FAST_LLM`       | `gemini-3.8-flash`, `gemini-3.5-flash-lite`         | Mô hình Gemini                     |
| `OPENAI_SMART_LLM`, `OPENAI_FAST_LLM`       | `gpt-4.1`, `gpt-4.1-mini`                           | Mô hình OpenAI                     |
| `ANTHROPIC_SMART_LLM`, `ANTHROPIC_FAST_LLM` | `claude-sonnet-5`, `claude-haiku-4-5-20251001`      | Mô hình Claude                     |

Khi nhà cung cấp đổi tên mô hình, chỉ cần sửa biến tương ứng rồi _Restart_ Space.

## Chạy thử trên máy

```bash
pip install -r requirements.txt
uvicorn app:app --port 7860
```
