# services/nlp_utils.py
import re


def normalize(s: str) -> str:
    return (s or "").strip().lower().replace(" ", "")


# Synonyms (map field) + labels
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

ENTITY_CANON_RULES = [
    (r"\bair\s*handling\s*unit\b", "ahu"),
    (
        r"\bm[áa]y\s*x[ửu] l[ýy]\s*kh[ôo]ng\s*kh[ií]\b",
        "ahu",
    ),  # máy xử lý không khí (nếu có)
]


def canonicalize_entity_phrase(text: str) -> str:
    t = (text or "").lower()
    for pat, repl in ENTITY_CANON_RULES:
        t = re.sub(pat, repl, t, flags=re.IGNORECASE)
    t = re.sub(r"\bahu[\s\-_]*([0-9]{1,3})\b", r"ahu\1", t, flags=re.IGNORECASE)
    return t


def detect_field_from_text(text: str, available_fields: set[str]) -> str | None:
    txt = (text or "").lower()
    if re.search(r"thuộc\s+hãng|hãng\s+nào", txt):
        return "brand" if "brand" in available_fields else None
    for field, syns in FIELD_SYNONYMS_FULL.items():
        if field not in available_fields:
            continue
        for s in syns:
            if s in txt:
                return field
    return None


def parse_filter_question(
    text: str, available_fields: set[str]
) -> tuple[str | None, str | None]:
    txt = canonicalize_entity_phrase(text or "").lower()
    for field, syns in FIELD_SYNONYMS_FULL.items():
        if field not in available_fields:
            continue
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
