import pandas as pd
import os
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Features used for the anomaly detection (excluding identifiers and ground truth labels)
FEATURE_COLUMNS = ['hour_of_access', 'transaction_amount', 'data_volume_mb', 'geo_delta_km']

def load_data(filepath):
    """Loads the dataset."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Data file not found: {filepath}")
    return pd.read_csv(filepath)

def preprocess_data(df, scaler=None, is_training=True):
    """
    Scales the feature columns using StandardScaler.
    Returns scaling artifacts (scaler) along with scaled data so we can use it during inference.
    """
    X = df[FEATURE_COLUMNS].copy()
    
    if is_training:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
    else:
        if scaler is None:
            raise ValueError("A fitted scaler must be provided when not training.")
        X_scaled = scaler.transform(X)
        
    X_scaled_df = pd.DataFrame(X_scaled, columns=FEATURE_COLUMNS)
    return X_scaled_df, scaler

def train_isolation_forest(X_scaled_df, contamination=0.05):
    """
    Trains an Isolation Forest model to identify anomalies.
    """
    model = IsolationForest(
        n_estimators=100, 
        contamination=contamination,
        random_state=42, 
        n_jobs=-1
    )
    model.fit(X_scaled_df)
    return model

def save_model_artifacts(model, scaler, output_dir):
    """Saves the trained model and scaler to the specified directory."""
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, 'model.pkl')
    scaler_path = os.path.join(output_dir, 'scaler.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print(f"Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")

def run_pipeline(data_path, output_dir):
    """Runs the modular training pipeline end-to-end."""
    print("Initiating training pipeline...")
    
    # 1. Load Data
    df = load_data(data_path)
    print(f"Loaded dataset: {df.shape[0]} rows.")
    
    # 2. Preprocess Data
    X_scaled_df, scaler = preprocess_data(df, is_training=True)
    print("Preprocessed features using StandardScaler.")
    
    # 3. Train Model
    print("Training Isolation Forest (contamination=0.05)...")
    model = train_isolation_forest(X_scaled_df, contamination=0.05)
    
    # 4. Save Artifacts
    save_model_artifacts(model, scaler, output_dir)
    
    print("Pipeline finished successfully.")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    input_csv = os.path.join(current_dir, "synthetic_data.csv")
    
    run_pipeline(input_csv, current_dir)
