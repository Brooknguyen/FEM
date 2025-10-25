# services/qa_logic.py
from services.config import CSV_COLUMNS
from services.nlp_utils import (
    normalize,
    detect_field_from_text,
    parse_filter_question,
    is_summary_ask,
    VI_LABELS,
    FIELD_SYNONYMS_FULL,
)
from services.entity_matcher import match_device, find_entity_in_text


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


def answer_from_csv(user_text: str, df):
    """
    Trả về string nếu câu hỏi liên quan tới CSV, ngược lại return None.
    Luồng:
      1) Hỏi thuộc tính của 1 thiết bị (field + entity)
      2) Lọc field = value
      3) Tóm tắt <thiết bị>
    """
    if df is None or df.empty:
        return None

    available_fields = set(CSV_COLUMNS) - {"name"}

    # 1) Hỏi thuộc tính 1 thiết bị
    field_attr = detect_field_from_text(user_text, available_fields)
    entity_attr = find_entity_in_text(user_text, df)
    if field_attr and entity_attr:
        rec = match_device(df, entity_attr)
        if rec:
            val = rec.get(field_attr)
            if val not in (None, "", []):
                label = VI_LABELS.get(field_attr, field_attr.title())
                return f"{label} của {rec.get('name')} là: {val}"
            else:
                label = VI_LABELS.get(field_attr, field_attr)
                return f"Không có thông tin '{label}' của {rec.get('name')}"

    # 2) Lọc field = value
    filt_field, filt_value = parse_filter_question(user_text, available_fields)
    if filt_field and filt_value:
        series = df.get(filt_field)
        if series is not None:
            mask = series.astype(str).apply(
                lambda x: normalize(x) == normalize(filt_value)
            )
            matched = df[mask]
            if not matched.empty:
                names = matched["name"].astype(str).tolist()
                label = VI_LABELS.get(filt_field, filt_field)
                return f"Thiết bị có {label} = {filt_value}: {', '.join(names)}"
            else:
                uniq = sorted(set(series.dropna().astype(str).tolist()))
                label = VI_LABELS.get(filt_field, filt_field)
                return f"Không tìm thấy thiết bị có {label} = {filt_value}. Giá trị hiện có: {', '.join(uniq[:10])}..."

    # 3) Tóm tắt 1 thiết bị
    if is_summary_ask(user_text):
        entity_sum = find_entity_in_text(user_text, df)
        if entity_sum:
            rec = match_device(df, entity_sum)
            if rec:
                return format_device_info(rec)

    # Không chắc liên quan CSV
    return None
