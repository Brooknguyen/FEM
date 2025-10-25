# services/entity_matcher.py
import re
from difflib import get_close_matches
from services.nlp_utils import normalize, canonicalize_entity_phrase


def match_device(df, name_query: str):
    if df.empty or not name_query:
        return None
    name_query_norm = normalize(name_query)

    # exact / startswith
    for _, row in df.iterrows():
        n = row.get("name", "")
        if normalize(n) == name_query_norm:
            return row.to_dict()
    for _, row in df.iterrows():
        n = row.get("name", "")
        if normalize(n).startswith(name_query_norm):
            return row.to_dict()

    # gần đúng
    names = df["name"].astype(str).tolist()
    cand = get_close_matches(name_query, names, n=1, cutoff=0.6)
    if cand:
        return df[df["name"] == cand[0]].iloc[0].to_dict()
    return None


def find_entity_in_text(text: str, df) -> str | None:
    if not text:
        return None
    t = canonicalize_entity_phrase(text)
    names = df["name"].dropna().astype(str).tolist()
    names_sorted = sorted(names, key=lambda x: -len(x.lower()))
    for n in names_sorted:
        if re.search(rf"\b{re.escape(n.lower())}\b", t):
            return n
    m = re.search(r"\bahu([0-9]{1,3})\b", t)
    if m:
        return f"AHU{m.group(1)}"
    m2 = re.search(r"\b([A-Za-z]{2,}\d{0,3})\b", text)
    if m2:
        return m2.group(1)
    return None
