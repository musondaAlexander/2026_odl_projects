"""URL feature extraction (structural + lexical), shared by training and serving.

Pure-Python structural features + character n-gram lexical features (via a
scikit-learn vectorizer fitted at training time). No NLTK dependency.
"""
from __future__ import annotations

import math
import re
from urllib.parse import urlparse

import tldextract

SHORTENERS = {"bit.ly", "goo.gl", "tinyurl.com", "t.co", "ow.ly", "is.gd", "buff.ly", "cutt.ly"}
SUSPICIOUS_TLDS = {"zip", "review", "country", "kim", "cricket", "science", "work", "party",
                   "gq", "link", "top", "xyz", "tk", "ml", "ga", "cf"}
IP_RE = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$")

STRUCTURAL_FEATURES = [
    "url_length", "host_length", "path_length", "num_dots", "num_hyphens",
    "num_digits", "num_special", "subdomain_depth", "domain_entropy",
    "is_ip_host", "is_shortener", "suspicious_tld", "has_at", "https",
]


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def structural_features(url: str) -> dict:
    if "://" not in url:
        url = "http://" + url
    parsed = urlparse(url)
    host = parsed.netloc.split("@")[-1].split(":")[0]
    ext = tldextract.extract(url)
    subdomain_depth = len([p for p in ext.subdomain.split(".") if p]) if ext.subdomain else 0
    special = len(re.findall(r"[^a-zA-Z0-9.\-/:]", url))
    return {
        "url_length": len(url),
        "host_length": len(host),
        "path_length": len(parsed.path),
        "num_dots": url.count("."),
        "num_hyphens": url.count("-"),
        "num_digits": sum(c.isdigit() for c in url),
        "num_special": special,
        "subdomain_depth": subdomain_depth,
        "domain_entropy": round(shannon_entropy(ext.domain), 4),
        "is_ip_host": int(bool(IP_RE.match(host))),
        "is_shortener": int(f"{ext.domain}.{ext.suffix}" in SHORTENERS),
        "suspicious_tld": int(ext.suffix.split(".")[-1] in SUSPICIOUS_TLDS),
        "has_at": int("@" in url),
        "https": int(parsed.scheme == "https"),
    }


def structural_vector(url: str) -> list[float]:
    f = structural_features(url)
    return [float(f[k]) for k in STRUCTURAL_FEATURES]


def lexical_text(url: str) -> str:
    """The string fed to the char n-gram vectorizer."""
    return url.lower()
