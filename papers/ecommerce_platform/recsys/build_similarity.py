"""Offline collaborative-filtering pipeline (item-to-item, Linden et al. 2003).

Reads the interaction log from MySQL, builds a user-item matrix (weighted by
interaction type), computes item-to-item cosine similarity, and writes the top-N
most similar items per product back into the `ItemSimilarities` table for fast
real-time lookup. Run on a schedule (e.g. nightly cron) to refresh.

Usage:  python build_similarity.py        # reads DATABASE_URL or .env DB_* vars
"""
import os
import sys
from urllib.parse import quote_plus

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import create_engine, text

TOP_N = 5
WEIGHTS = {"view": 1.0, "add_to_cart": 2.0, "purchase": 3.0}


def db_url():
    # Reuse the Node backend's .env if present.
    env = {}
    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    if os.path.exists(env_path):
        for line in open(env_path):
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1)
                env[k] = v
    host = env.get("DB_HOST", "localhost"); port = env.get("DB_PORT", "3306")
    name = env.get("DB_NAME", "ecommerce"); user = env.get("DB_USER", "root")
    pwd = quote_plus(env.get("DB_PASSWORD", ""))
    return os.getenv("DATABASE_URL", f"mysql+pymysql://{user}:{pwd}@{host}:{port}/{name}")


def main():
    engine = create_engine(db_url())
    df = pd.read_sql("SELECT UserId AS user_id, ProductId AS product_id, type FROM Interactions", engine)
    if df.empty:
        print("No interactions yet. Seed the DB and generate activity first.")
        sys.exit(0)

    df["w"] = df["type"].map(WEIGHTS).fillna(1.0)
    # user-item matrix (rows=users, cols=items), values = summed interaction weight
    matrix = df.pivot_table(index="user_id", columns="product_id", values="w", aggfunc="sum", fill_value=0)
    items = matrix.columns.to_list()

    # item-to-item cosine similarity (items as vectors over users)
    sim = cosine_similarity(matrix.T.values)
    np.fill_diagonal(sim, 0.0)

    rows = []
    for i, pid in enumerate(items):
        order = np.argsort(sim[i])[::-1][:TOP_N]
        for rank, j in enumerate(order):
            if sim[i][j] <= 0:
                continue
            rows.append({"productId": int(pid), "similarProductId": int(items[j]),
                         "score": float(round(sim[i][j], 6)), "rank": rank + 1})

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM ItemSimilarities"))
        if rows:
            conn.execute(
                text("INSERT INTO ItemSimilarities (productId, similarProductId, score, `rank`) "
                     "VALUES (:productId, :similarProductId, :score, :rank)"),
                rows,
            )
    print(f"CF pipeline complete: wrote {len(rows)} item-item similarities for {len(items)} products.")


if __name__ == "__main__":
    main()
