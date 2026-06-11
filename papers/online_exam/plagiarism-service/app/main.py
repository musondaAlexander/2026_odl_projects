"""Plagiarism microservice. Spring Boot calls /analyze on each written
submission; the NLP stack stays isolated from the JVM and scales independently.
"""
from fastapi import FastAPI
from pydantic import BaseModel

from .plagiarism import check

app = FastAPI(title="Plagiarism Detection Service")


class CorpusDoc(BaseModel):
    id: str
    text: str


class AnalyzeIn(BaseModel):
    submission: str
    corpus: list[CorpusDoc] = []
    threshold: float = 0.6


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(body: AnalyzeIn):
    return check(body.submission, [d.model_dump() for d in body.corpus], body.threshold)
