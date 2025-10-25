# services/llm_client.py
import requests
from services.config import OLLAMA_URL, OLLAMA_MODEL


def call_llm_basic(user_text: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Bạn là trợ lý hữu ích. Trả lời ngắn gọn, rõ ràng, lịch sự.",
            },
            {"role": "user", "content": user_text},
        ],
        "stream": False,
        "options": {"temperature": 0.3},
    }
    r = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    return (data.get("message") or {}).get("content", "").strip()
