# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import requests
import pandas as pd
import re
from difflib import get_close_matches
import time
import threading

# ================== CONFIG ==================
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:1b")  # dùng LLM khi cần chat/IE
INFO_API = os.getenv("INFO_API", "http://10.100.201.25:4000/api/info")
CSV_PATH = os.getenv("CSV_PATH", "devices.csv")
ALIAS_PATH = os.getenv("ALIAS_PATH", "alias.csv")  # tùy chọn: map alias -> name
REFRESH_INTERVAL_SECONDS = int(os.getenv("REFRESH_INTERVAL_SECONDS", "3600"))  # 1 giờ

app = Flask(__name__)
CORS(app)


# ================== TIỆN ÍCH CHUNG ==================
def normalize(s: str) -> str:
    return (s or "").strip().lower().replace(" ", "")


def call_llm_basic(user_text: str) -> str:
    """Chat tự do khi câu hỏi KHÔNG liên quan tới devices.csv."""
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


# ================== TẢI & LƯU CSV ==================
def fetch_info_from_api():
    try:
        r = requests.get(INFO_API, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"[INFO_API ERROR] {e}")
        return None


def extract_devices(payload: dict) -> list[dict]:
    if not isinstance(payload, dict):
        return []
    items = payload.get("items") or []
    for it in items:
        if isinstance(it, dict) and it.get("sheetName") == "THIET_BI":
            devs = it.get("devices")
            return devs if isinstance(devs, list) else []
    if items and isinstance(items[0], dict):
        devs = items[0].get("devices")
        return devs if isinstance(devs, list) else []
    return []


CSV_COLUMNS = [
    "name",
    "type",
    "model",
    "power",
    "voltage",
    "capa",
    "gas",
    "brand",
    "year",
    "location",
    "note",
    "image",
]


def save_devices_to_csv(devices: list[dict], path: str = CSV_PATH):
    rows = [{col: d.get(col, "") for col in CSV_COLUMNS} for d in devices]
    pd.DataFrame(rows, columns=CSV_COLUMNS).to_csv(
        path, index=False, encoding="utf-8-sig"
    )
    return len(rows)


def refresh_csv() -> tuple[bool, str]:
    data = fetch_info_from_api()
    if data is None:
        return False, "Không gọi được INFO_API."
    devices = extract_devices(data)
    if not devices:
        return False, "Không tìm thấy 'devices' trong INFO_API."
    n = save_devices_to_csv(devices, CSV_PATH)
    return True, f"Đã lưu {n} thiết bị vào {CSV_PATH}"


# ================== ALIAS (tùy chọn) ==================
def load_alias_map(path=ALIAS_PATH):
    try:
        df = pd.read_csv(path)
        if df.empty:
            return {}
        df["alias_norm"] = df["alias"].astype(str).str.strip().str.lower()
        return {
            row["alias_norm"]: str(row["entity"]).strip() for _, row in df.iterrows()
        }
    except FileNotFoundError:
        return {}
    except Exception as e:
        print(f"[ALIAS ERROR] {e}")
        return {}


ALIAS_MAP = load_alias_map()


# ================== ĐỌC CSV & TRỢ GIÚP ==================
def load_devices_from_csv(path: str = CSV_PATH) -> pd.DataFrame:
    if not os.path.exists(path):
        return pd.DataFrame(columns=CSV_COLUMNS)
    return pd.read_csv(path)


def format_device_info(rec: dict) -> str:
    name = rec.get("name", "Thiết bị")
    parts = []

    def add(label, key):
        v = rec.get(key)
        if isinstance(v, str) and v.strip():
            parts.append(f"{label}: {v}")

    add("Loại", "type")
    add("Model", "model")
    add("Công suất", "power")
    add("Điện áp", "voltage")
    add("Công suất gió", "capa")
    add("Gas", "gas")
    add("Hãng", "brand")
    add("Năm", "year")
    add("Vị trí", "location")
    add("Ghi chú", "note")
    if rec.get("image"):
        parts.append(
            "Ảnh: "
            + " | ".join([u.strip() for u in str(rec["image"]).split("|") if u.strip()])
        )
    return f"{name}: " + ("; ".join(parts) if parts else "Chưa có thông tin.")


def match_device(df: pd.DataFrame, name_query: str) -> dict | None:
    if df.empty or not name_query:
        return None
    name_query_norm = normalize(name_query)
    mapped = ALIAS_MAP.get(name_query_norm)
    if mapped:
        name_query_norm = normalize(mapped)
    # exact
    for _, row in df.iterrows():
        if normalize(row.get("name", "")) == name_query_norm:
            return row.to_dict()
    # startswith
    for _, row in df.iterrows():
        if normalize(row.get("name", "")).startswith(name_query_norm):
            return row.to_dict()
    # gần đúng
    names = df["name"].astype(str).tolist()
    cand = get_close_matches(name_query, names, n=1, cutoff=0.6)
    if cand:
        return df[df["name"] == cand[0]].iloc[0].to_dict()
    return None


# ================== INTENT/FIELD & LỌC ==================
AVAILABLE_FIELDS = set(CSV_COLUMNS) - {"name"}

# Synonyms để nhận cột từ câu hỏi (BỔ SUNG "năm sản xuất", "năm sx", "năm chế tạo")
FIELD_SYNONYMS_FULL = {
    "capa": ["capa", "công suất gió"],
    "brand": ["hãng", "thương hiệu", "brand"],
    "voltage": ["điện áp", "voltage"],
    "power": ["công suất", "load", "power"],
    "location": ["vị trí", "ở đâu", "đặt ở"],
    "model": ["model", "mẫu", "đời"],
    "type": ["loại", "type", "dòng"],
    "year": ["năm", "năm lắp đặt", "năm sản xuất", "năm sx", "năm chế tạo"],
    "note": ["ghi chú", "note"],
    "gas": ["gas", "môi chất"],
    "image": ["ảnh", "hình", "hình ảnh"],
}
FIELD_SYNONYMS = {
    f: syns for f, syns in FIELD_SYNONYMS_FULL.items() if f in AVAILABLE_FIELDS
}

# Nhãn tiếng Việt để trả lời
VI_LABELS = {
    "location": "Vị trí",
    "voltage": "Điện áp",
    "year": "Năm",
    "power": "Công suất",
    "model": "Model",
    "type": "Loại",
    "brand": "Hãng",
    "note": "Ghi chú",
    "capa": "Công suất gió",
    "gas": "Gas",
    "image": "Ảnh",
}

QUESTION_WORDS_RE = re.compile(r"(bao nhiêu|mấy|gì|nhỉ|\?)", re.IGNORECASE)


def detect_field_from_text(text: str) -> str | None:
    txt = (text or "").lower()
    # heuristic riêng
    if re.search(r"thuộc\s+hãng|hãng\s+nào", txt):
        return "brand"
    for field, syns in FIELD_SYNONYMS.items():
        for s in syns:
            if s in txt:
                return field
    return None


# ==== NEW: Chuẩn hoá tên thiết bị từ diễn đạt dài (Air Handling Unit 1 -> AHU1) ====
ENTITY_CANON_RULES = [
    (r"\bair\s*handling\s*unit\b", "ahu"),
    (r"\bm[áa]y\s*x[ửu] l[ýy]\s*kh[ôo]ng\s*kh[ií]\b", "ahu"),  # máy xử lý không khí
]


def canonicalize_entity_phrase(text: str) -> str:
    t = (text or "").lower()
    for pat, repl in ENTITY_CANON_RULES:
        t = re.sub(pat, repl, t, flags=re.IGNORECASE)
    # gom AHU 1 / AHU-1 / ahu_1 -> ahu1
    t = re.sub(r"\bahu[\s\-_]*([0-9]{1,3})\b", r"ahu\1", t, flags=re.IGNORECASE)
    return t


def find_entity_in_text(text: str, df: pd.DataFrame) -> str | None:
    """Tìm entity bằng tên CSV, hỗ trợ diễn đạt dài -> AHU#, AHU-#..."""
    if not text:
        return None
    t = canonicalize_entity_phrase(text)
    names = df["name"].dropna().astype(str).tolist()

    # Thử match thẳng theo tên trong CSV (case-insensitive, biên từ)
    names_sorted = sorted(names, key=lambda x: -len(x))
    for n in names_sorted:
        if re.search(rf"\b{re.escape(n.lower())}\b", t):
            return n

    # Nếu trong câu có pattern 'ahu[digits]' -> dựng candidate rồi match gần đúng
    m = re.search(r"\bahu([0-9]{1,3})\b", t)
    if m:
        cand = f"AHU{m.group(1)}"
        rec = match_device(df, cand)
        if rec:
            return rec.get("name")

    # fallback: token kiểu [A-Za-z]{2,}\d{0,3}
    m2 = re.search(r"\b([A-Za-z]{2,}\d{0,3})\b", text)
    if m2:
        cand2 = m2.group(1)
        rec2 = match_device(df, cand2)
        if rec2:
            return rec2.get("name")
    return None


def parse_filter_question(text: str) -> tuple[str | None, str | None]:
    """
    Lọc: '<field> ... (=|là|bằng) <value>' hoặc 'có <field> <value>'.
    Loại trừ giá trị hỏi (bao nhiêu, mấy, gì, nhỉ, ?)
    """
    txt = canonicalize_entity_phrase(text or "")
    txt = txt.lower()
    for field, syns in FIELD_SYNONYMS.items():
        for s in syns:
            if s in txt:
                m = re.search(rf"{re.escape(s)}\s*(?:=|là|bằng)\s*([^?,.;]+)", txt)
                if m:
                    value = re.split(r"[?,.;]", m.group(1).strip())[0].strip()
                    if value and not QUESTION_WORDS_RE.search(value):
                        return field, value
                m2 = re.search(rf"có\s+{re.escape(s)}\s+([^?,.;]+)", txt)
                if m2:
                    value = re.split(r"[?,.;]", m2.group(1).strip())[0].strip()
                    if value and not QUESTION_WORDS_RE.search(value):
                        return field, value
    return None, None


def is_summary_ask(text: str) -> bool:
    t = (text or "").lower()
    return "tóm tắt" in t or "thông tin" in t


# ================== TỰ ĐỘNG LÀM MỚI THEO CHU KỲ ==================
def background_refresh_loop():
    print(f"[REFRESHER] Bắt đầu thread nền. Chu kỳ: {REFRESH_INTERVAL_SECONDS}s")
    while True:
        try:
            ok, msg = refresh_csv()
            ts = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"[REFRESHER {ts}] {msg}")
            time.sleep(
                REFRESH_INTERVAL_SECONDS if ok else min(300, REFRESH_INTERVAL_SECONDS)
            )
        except Exception as e:
            print(f"[REFRESHER ERROR] {e}")
            time.sleep(min(300, REFRESH_INTERVAL_SECONDS))


def start_background_refresher():
    t = threading.Thread(target=background_refresh_loop, daemon=True)
    t.start()
    return t


# ================== ROUTES ==================
@app.route("/refresh", methods=["POST", "GET"])
def refresh():
    ok, msg = refresh_csv()
    return jsonify({"ok": ok, "message": msg}), (200 if ok else 500)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Missing input"}), 400

    print(f"\n\n📝 [USER INPUT]: {text}")

    # Đọc CSV; nếu trống => chat tự do
    df = load_devices_from_csv(CSV_PATH)
    if df.empty:
        return jsonify(
            {"answer": call_llm_basic(text), "note": "CSV trống - chat tự do."}
        )

    # --- ƯU TIÊN 1: HỎI THUỘC TÍNH CỦA MỘT THIẾT BỊ ---
    field_attr = detect_field_from_text(text)
    entity_attr = find_entity_in_text(text, df)
    if field_attr and entity_attr:
        rec = match_device(df, entity_attr)
        if rec:
            val = rec.get(field_attr)
            if val not in (None, "", []):
                label = VI_LABELS.get(field_attr, field_attr.title())
                return jsonify({"answer": f"{label} của {rec.get('name')} là: {val}"})
            else:
                return jsonify(
                    {
                        "answer": f"Không có thông tin '{VI_LABELS.get(field_attr, field_attr)}' của {rec.get('name')}"
                    }
                )

    # --- ƯU TIÊN 2: CÂU HỎI LỌC (field = value) ---
    filt_field, filt_value = parse_filter_question(text)
    if filt_field and filt_value:
        series = df.get(filt_field)
        if series is not None:
            mask = series.astype(str).apply(
                lambda x: normalize(x) == normalize(filt_value)
            )
            matched = df[mask]
            if not matched.empty:
                names = matched["name"].astype(str).tolist()
                return jsonify(
                    {
                        "answer": f"Thiết bị có {VI_LABELS.get(filt_field, filt_field)} = {filt_value}: {', '.join(names)}"
                    }
                )
            else:
                uniq = sorted(set(series.dropna().astype(str).tolist()))
                return jsonify(
                    {
                        "answer": f"Không tìm thấy thiết bị có {VI_LABELS.get(filt_field, filt_field)} = {filt_value}. Giá trị hiện có: {', '.join(uniq[:10])}..."
                    }
                )

    # --- ƯU TIÊN 3: YÊU CẦU TÓM TẮT MỘT THIẾT BỊ ---
    if is_summary_ask(text):
        entity_sum = find_entity_in_text(text, df)
        if entity_sum:
            rec = match_device(df, entity_sum)
            if rec:
                return jsonify({"answer": format_device_info(rec)})

    # --- Không có tín hiệu liên quan CSV -> chat tự do ---
    return jsonify(
        {"answer": call_llm_basic(text), "note": "Ngoài miền CSV - chat tự do."}
    )


# ================== MAIN ==================
if __name__ == "__main__":
    ok, msg = refresh_csv()
    print(f"[STARTUP REFRESH] {msg}")
    start_background_refresher()
    app.run(host="0.0.0.0", port=1080, debug=True)
