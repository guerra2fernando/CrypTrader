"""Random forest regression model for return forecasting."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

from models.model_utils import save_model


@dataclass
class RFResult:
    model_path: str
    train_score: float
    test_score: float


def train_random_forest(features: pd.DataFrame, target: pd.Series, name: str) -> RFResult:
    X_train, X_test, y_train, y_test = train_test_split(
        features.fillna(0), target.fillna(0), test_size=0.2, shuffle=False
    )
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    path = save_model(model, name, {"train_score": train_score, "test_score": test_score})
    return RFResult(str(path), train_score, test_score)

