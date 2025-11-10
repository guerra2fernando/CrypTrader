from __future__ import annotations

import pandas as pd
import pytest

from models.train_horizon import evaluate_predictions, time_based_split


def test_time_based_split_shapes() -> None:
    X = pd.DataFrame({"feat": range(100)})
    y = pd.Series(range(100))

    splits = time_based_split(X, y, val_ratio=0.1, test_ratio=0.1)

    assert len(splits["X_train"]) == 80
    assert len(splits["X_val"]) == 10
    assert len(splits["X_test"]) == 10
    assert splits["X_train"].index.is_monotonic_increasing


def test_evaluate_predictions_directional_accuracy() -> None:
    y_true = pd.Series([0.1, -0.2, 0.3, 0.0])
    y_pred = pd.Series([0.05, -0.1, -0.2, 0.01])

    metrics = evaluate_predictions(y_true, y_pred)

    assert metrics["rmse"] > 0
    assert metrics["mae"] > 0
    assert pytest.approx(metrics["directional_accuracy"], rel=1e-6) == 0.75

