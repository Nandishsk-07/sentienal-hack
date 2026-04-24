import os
import joblib
import numpy as np
import shap
from sklearn.linear_model import LinearRegression

# Global paths
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, 'model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')

# Lazy loaded singletons for performance
_model = None
_scaler = None
_explainer = None

FEATURE_NAMES = [
    'hour_of_access', 'transaction_amount', 'data_volume_mb', 'geo_delta_km'
]

def _load_artifacts():
    global _model, _scaler, _explainer
    if _model is None or _scaler is None:
        if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
            raise FileNotFoundError("Model or scaler not found. Please run train_model.py first.")
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        
        # Initialize SHAP explainer for IsolationForest
        # For IsolationForest, TreeExplainer works directly
        _explainer = shap.TreeExplainer(_model)

def score_user(features_dict: dict, device_trust_level: int = 1) -> dict:
    """
    Returns risk score mapping (0-100) and is_anomaly boolean.
    device_trust_level modifies final score.
    """
    _load_artifacts()
    
    # Extract feature array in correct order
    feature_arr = np.array([[features_dict.get(f, 0.0) for f in FEATURE_NAMES]])
    
    # Scale features
    feature_scaled = _scaler.transform(feature_arr)
    
    # Isolation forest provides an anomaly score. 
    # Negative scores are outliers, positive are inliers.
    # Score is typically between -0.5 and +0.5.
    raw_score = _model.score_samples(feature_scaled)[0] # Usually in [-.5, .5]
    
    # Convert to 0-100 risk score. More negative = Higher Risk.
    # We will normalize it where baseline inlier ~ 10, strong outlier ~ 99
    # Adjust risk score based on device trust (0: untrusted, 1: partial, 2: trusted)
    if device_trust_level == 0:
        risk_score += 25
    elif device_trust_level == 1:
        risk_score += 10
    elif device_trust_level == 2:
        risk_score -= 10
        
    risk_score = min(max(float(risk_score), 0.0), 100.0)
    
    # Predict directly (-1 is Anomaly, 1 is Normal)
    pred = _model.predict(feature_scaled)[0]
    is_anomaly = bool(pred == -1) or (device_trust_level == 0)
    
    return {
        "risk_score": round(float(risk_score), 1),
        "is_anomaly": is_anomaly,
        "raw_isolation_score": float(raw_score)
    }

def explain_user(features_dict: dict) -> dict:
    """
    Leverages shap.TreeExplainer to extract and return a sorted dict of {feature: contribution}
    """
    _load_artifacts()
    feature_arr = np.array([[features_dict.get(f, 0.0) for f in FEATURE_NAMES]])
    feature_scaled = _scaler.transform(feature_arr)
    
    # Get SHAP values
    shap_values = _explainer.shap_values(feature_scaled)
    # IsolationForest SHAP values might be heavily negative for outliers
    # We take absolute value to determine "importance" of the feature 
    # for pushing it into anomaly territory
    contributions = np.abs(shap_values[0])
    
    # Map to feature names and sort
    feature_contributions = {name: float(val) for name, val in zip(FEATURE_NAMES, contributions)}
    sorted_contributions = dict(sorted(feature_contributions.items(), key=lambda item: item[1], reverse=True))
    
    return sorted_contributions

def forecast_trajectory(score_history: list) -> list:
    """
    Uses LinearRegression to forecast the next 14 days of risk scores 
    based on the last 90 days of history.
    """
    if not score_history or len(score_history) < 2:
        return [0.0] * 14
        
    # Fit simple linear trend
    X_train = np.arange(len(score_history)).reshape(-1, 1)
    y_train = np.array(score_history)
    
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    
    # Predict next 14 days
    last_day = len(score_history)
    X_pred = np.arange(last_day, last_day + 14).reshape(-1, 1)
    y_pred = lr.predict(X_pred)
    
    # Bounds check (0-100)
    forecast = [round(min(max(float(val), 0.0), 100.0), 1) for val in y_pred]
    return forecast
