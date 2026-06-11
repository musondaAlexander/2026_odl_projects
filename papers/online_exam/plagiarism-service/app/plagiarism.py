"""TF-IDF cosine-similarity plagiarism engine (proposal objective 2).

Preprocess (lowercase, tokenise, stopword removal, Porter stemming) → TF-IDF
vectorise the submission alongside a reference corpus → cosine similarity →
flag if the maximum similarity exceeds a configurable threshold, returning the
best-matching corpus document and an evidence excerpt (highest-overlap window).

No model training and no NLTK downloads required (Porter stemmer is rule-based;
stop words come from scikit-learn).
"""
from __future__ import annotations

import re

from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from sklearn.metrics.pairwise import cosine_similarity

_stemmer = PorterStemmer()
_token_re = re.compile(r"[a-zA-Z']+")


def preprocess(text: str) -> str:
    tokens = _token_re.findall((text or "").lower())
    return " ".join(_stemmer.stem(t) for t in tokens if t not in ENGLISH_STOP_WORDS and len(t) > 1)


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text or "") if s.strip()]


def _best_excerpt(submission: str, matched: str) -> str:
    """Return the submission sentence most similar to any sentence in the match."""
    sub_sents = _sentences(submission)
    match_sents = _sentences(matched)
    if not sub_sents or not match_sents:
        return submission[:160]
    vec = TfidfVectorizer(preprocessor=preprocess)
    try:
        m = vec.fit_transform(sub_sents + match_sents)
    except ValueError:
        return submission[:160]
    sims = cosine_similarity(m[:len(sub_sents)], m[len(sub_sents):])
    best_i = sims.max(axis=1).argmax()
    return sub_sents[best_i][:240]


def check(submission: str, corpus: list[dict], threshold: float = 0.6) -> dict:
    """corpus: [{id, text}]. Returns similarity verdict + evidence."""
    docs = [preprocess(submission)] + [preprocess(d["text"]) for d in corpus]
    if not corpus or not docs[0].strip():
        return {"max_similarity": 0.0, "flagged": False, "threshold": threshold,
                "matched_id": None, "evidence": "", "scores": []}

    vec = TfidfVectorizer()
    matrix = vec.fit_transform(docs)
    sims = cosine_similarity(matrix[0:1], matrix[1:])[0]

    scores = [{"id": corpus[i]["id"], "similarity": round(float(sims[i]), 4)} for i in range(len(corpus))]
    best_idx = int(sims.argmax())
    max_sim = float(sims[best_idx])
    flagged = max_sim >= threshold
    evidence = _best_excerpt(submission, corpus[best_idx]["text"]) if flagged else ""
    return {
        "max_similarity": round(max_sim, 4),
        "flagged": flagged,
        "threshold": threshold,
        "matched_id": corpus[best_idx]["id"] if flagged else None,
        "evidence": evidence,
        "scores": sorted(scores, key=lambda s: s["similarity"], reverse=True)[:10],
    }
