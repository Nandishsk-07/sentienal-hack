import numpy as np
import pandas as pd

def normalize_features(input_data: list | dict) -> np.ndarray:
    """
    Transforms incoming dicts/arrays into standardized shapes for scaling.
    """
    if isinstance(input_data, dict):
        # Flatten dictionary to list of values, assuming alphabetical key sorting 
        # or strict mapping in the caller.
        return np.array([list(input_data.values())])
    elif isinstance(input_data, list):
        if not input_data:
            return np.array([])
        if isinstance(input_data[0], dict):
            # List of dicts
            df = pd.DataFrame(input_data)
            return df.to_numpy()
        else:
            return np.array([input_data])
    return np.array([input_data])

def extract_behavioral_features(raw_transactions: list) -> dict:
    """
    Extracts velocities and aggregations from recent raw events.
    Input format: [{'tx_id': '..', 'amount': 150.0, 'timestamp': '...', ...}]
    """
    if not raw_transactions:
        return {"txn_count_24h": 0, "txn_volume_24h": 0.0, "avg_amount": 0.0}
        
    df = pd.DataFrame(raw_transactions)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Basic aggregations
    count = len(df)
    total_volume = df['amount'].sum() if 'amount' in df.columns else 0.0
    avg_amount = total_volume / count if count > 0 else 0.0
    
    return {
        "txn_count_24h": count,
        "txn_volume_24h": round(total_volume, 2),
        "avg_amount": round(avg_amount, 2)
    }

def compute_rolling_stats(data_series: list, window_size: int = 7) -> list:
    """
    Computes windowed means/sums over a list of historical numerical values.
    """
    if not data_series:
        return []
        
    s = pd.Series(data_series)
    rolling_mean = s.rolling(window=window_size, min_periods=1).mean().tolist()
    return [round(val, 2) for val in rolling_mean]
