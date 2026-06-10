"""Combined phishing classifier: structural features + char n-gram lexical features
fed into a Random Forest. Serialised as a single joblib artifact.
"""
from __future__ import annotations

import numpy as np
from scipy.sparse import hstack, csr_matrix
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer

from .features import lexical_text, structural_vector


class PhishingModel:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2, max_features=3000)
        self.clf = RandomForestClassifier(
            n_estimators=200, max_depth=None, class_weight="balanced", n_jobs=-1, random_state=42
        )

    def _features(self, urls, fit=False):
        struct = csr_matrix(np.array([structural_vector(u) for u in urls], dtype=float))
        texts = [lexical_text(u) for u in urls]
        lex = self.vectorizer.fit_transform(texts) if fit else self.vectorizer.transform(texts)
        return hstack([struct, lex]).tocsr()

    def fit(self, urls, labels):
        X = self._features(urls, fit=True)
        self.clf.fit(X, labels)
        return self

    def predict_proba(self, url: str) -> float:
        X = self._features([url], fit=False)
        # probability of the positive (phishing=1) class
        return float(self.clf.predict_proba(X)[0][list(self.clf.classes_).index(1)])

    def predict(self, url: str, threshold: float = 0.5) -> dict:
        p = self.predict_proba(url)
        return {"label": "phishing" if p >= threshold else "legitimate",
                "phishing_probability": round(p, 4), "threshold": threshold}
