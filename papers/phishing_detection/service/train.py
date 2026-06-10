"""Train the phishing classifier on a bundled, reproducibly-generated dataset.

For a self-contained build we synthesise a labelled URL dataset that mirrors the
structural patterns documented in the literature (legitimate = clean domains;
phishing = IP hosts, deep subdomains, brand-spoofs, suspicious TLDs, shorteners,
'@' tricks). To train on real data instead, drop a CSV with columns url,label
(label 1=phishing, 0=legit) at data/urls.csv and re-run.

Outputs: model.joblib + a printed evaluation (accuracy, FPR, precision/recall).
The deployment gate requires accuracy >= 0.90 and FPR < 0.05.
"""
import os
import random

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from app.model import PhishingModel

RNG = random.Random(42)

LEGIT_DOMAINS = ["google.com", "wikipedia.org", "github.com", "microsoft.com", "zanaco.co.zm",
                 "mtn.zm", "airtel.co.zm", "unza.zm", "gov.zm", "amazon.com", "bbc.co.uk",
                 "stanbicbank.co.zm", "fnbzambia.co.zm", "paypal.com", "office.com"]
LEGIT_PATHS = ["", "/", "/login", "/account", "/help", "/about", "/products/123", "/news/world"]
BRANDS = ["paypal", "zanaco", "mtnmomo", "airtelmoney", "stanbic", "fnb", "amazon", "microsoft", "apple"]
SUS_TLDS = ["xyz", "top", "tk", "ml", "ga", "cf", "zip", "link", "review"]
SHORTENERS = ["bit.ly", "tinyurl.com", "cutt.ly", "is.gd"]


def gen_legit(n):
    out = []
    for _ in range(n):
        d = RNG.choice(LEGIT_DOMAINS)
        scheme = "https" if RNG.random() < 0.8 else "http"
        sub = RNG.choice(["", "www.", "mail.", "shop."])
        out.append(f"{scheme}://{sub}{d}{RNG.choice(LEGIT_PATHS)}")
    return out


def gen_phish(n):
    out = []
    for _ in range(n):
        kind = RNG.random()
        brand = RNG.choice(BRANDS)
        if kind < 0.3:  # IP host
            ip = ".".join(str(RNG.randint(1, 255)) for _ in range(4))
            out.append(f"http://{ip}/{brand}/login/verify.php")
        elif kind < 0.55:  # deep subdomain spoof
            out.append(f"http://{brand}.secure-login.{RNG.choice(SUS_TLDS)}/account/verify?id={RNG.randint(1000,9999)}")
        elif kind < 0.75:  # brand + suspicious tld + hyphens
            out.append(f"http://{brand}-{RNG.choice(['verify','secure','update'])}-account.{RNG.choice(SUS_TLDS)}/")
        elif kind < 0.9:  # shortener / @ trick
            out.append(f"http://{RNG.choice(SHORTENERS)}/{RNG.choice('abcdefghjkmnp')}{RNG.randint(100,999)}")
        else:  # @ obfuscation
            out.append(f"http://{brand}.com@{RNG.choice(SUS_TLDS)}-login.{RNG.choice(SUS_TLDS)}/secure")
    return out


def load_dataset():
    path = os.path.join("data", "urls.csv")
    if os.path.exists(path):
        df = pd.read_csv(path)
        return df["url"].tolist(), df["label"].astype(int).tolist()
    urls = gen_legit(1200) + gen_phish(1200)
    labels = [0] * 1200 + [1] * 1200
    return urls, labels


def main():
    urls, labels = load_dataset()
    Xtr, Xte, ytr, yte = train_test_split(urls, labels, test_size=0.25, random_state=42, stratify=labels)
    model = PhishingModel().fit(Xtr, ytr)

    preds = [1 if model.predict_proba(u) >= 0.5 else 0 for u in Xte]
    acc = accuracy_score(yte, preds)
    tn, fp, fn, tp = confusion_matrix(yte, preds).ravel()
    fpr = fp / (fp + tn) if (fp + tn) else 0.0

    print("=== Evaluation (held-out test set) ===")
    print(classification_report(yte, preds, target_names=["legit", "phishing"]))
    print(f"accuracy = {acc:.4f}   false_positive_rate = {fpr:.4f}")
    gate = acc >= 0.90 and fpr < 0.05
    print(f"DEPLOYMENT GATE (acc>=0.90 & FPR<0.05): {'PASS' if gate else 'FAIL'}")

    joblib.dump({"model": model, "metrics": {"accuracy": acc, "fpr": fpr}}, "model.joblib")
    print("Saved model.joblib")
    if not gate:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
