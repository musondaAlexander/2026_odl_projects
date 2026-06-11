"""TF-IDF plagiarism engine tests."""
from app.plagiarism import check, preprocess


def test_preprocess_removes_stopwords_and_stems():
    out = preprocess("The students are running quickly to the libraries")
    assert "the" not in out.split()
    assert "run" in out  # 'running' -> 'run'


def test_near_duplicate_is_flagged():
    corpus = [{"id": "src1", "text": "Photosynthesis converts sunlight into chemical energy in plant cells."}]
    submission = "Photosynthesis converts sunlight into chemical energy within the cells of plants."
    res = check(submission, corpus, threshold=0.5)
    assert res["flagged"] is True
    assert res["matched_id"] == "src1"
    assert res["max_similarity"] >= 0.5
    assert res["evidence"]


def test_original_text_is_not_flagged():
    corpus = [{"id": "src1", "text": "Photosynthesis converts sunlight into chemical energy in plant cells."}]
    submission = "The mitochondria is responsible for cellular respiration and ATP production."
    res = check(submission, corpus, threshold=0.5)
    assert res["flagged"] is False
    assert res["max_similarity"] < 0.5


def test_empty_corpus_is_safe():
    res = check("anything", [], threshold=0.6)
    assert res["flagged"] is False and res["max_similarity"] == 0.0
