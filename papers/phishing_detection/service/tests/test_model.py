"""Model quality + feature-extraction tests (the proposal's evaluation gates)."""
import random

from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split

from app.features import structural_features
from app.model import PhishingModel
import train as trainmod


def test_structural_features_flag_obvious_phishing_signals():
    f = structural_features("http://192.168.0.1/paypal/login/verify.php")
    assert f["is_ip_host"] == 1
    legit = structural_features("https://www.google.com/")
    assert legit["is_ip_host"] == 0
    assert legit["https"] == 1


def test_model_meets_accuracy_and_fpr_gate():
    urls, labels = trainmod.load_dataset()
    Xtr, Xte, ytr, yte = train_test_split(urls, labels, test_size=0.25, random_state=1, stratify=labels)
    model = PhishingModel().fit(Xtr, ytr)
    preds = [1 if model.predict_proba(u) >= 0.5 else 0 for u in Xte]
    acc = accuracy_score(yte, preds)
    tn, fp, fn, tp = confusion_matrix(yte, preds).ravel()
    fpr = fp / (fp + tn)
    assert acc >= 0.90, f"accuracy {acc} below gate"
    assert fpr < 0.05, f"FPR {fpr} above gate"


def test_known_phishing_url_scores_high():
    urls, labels = trainmod.load_dataset()
    model = PhishingModel().fit(urls, labels)
    assert model.predict_proba("http://paypal-verify-account.tk/") > 0.5
    assert model.predict_proba("https://www.wikipedia.org/") < 0.5
