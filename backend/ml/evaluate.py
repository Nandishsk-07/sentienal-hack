import os
import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix

def run_evaluation():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, 'synthetic_data.csv')
    model_path = os.path.join(base_dir, 'model.pkl')
    scaler_path = os.path.join(base_dir, 'scaler.pkl')

    if not all(os.path.exists(p) for p in [data_path, model_path, scaler_path]):
        print("Required artifacts not found. Run generate_dataset.py then train_model.py first.")
        return

    print("Loading data and models...")
    df = pd.read_csv(data_path)
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    features = ['hour_of_access', 'transaction_amount', 'data_volume_mb', 
                'failed_login_attempts', 'geo_delta_km', 'commands_executed', 'privilege_level']
    
    X = df[features]
    y_true = df['is_anomaly'].values

    X_scaled = scaler.transform(X)
    
    print("Running predictions...")
    preds = model.predict(X_scaled)
    # Convert Isolation Forest anomalies (-1) to label 1
    y_pred = np.where(preds == -1, 1, 0)

    # Metrics
    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)

    print("\n--- ML Evaluation Metrics ---")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")

    # Plot Confusion Matrix
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6,5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['Normal (0)', 'Anomaly (1)'], 
                yticklabels=['Normal (0)', 'Anomaly (1)'])
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.title('Confusion Matrix - Sentinel Isolation Forest')
    cm_path = os.path.join(base_dir, 'confusion_matrix.png')
    plt.savefig(cm_path)
    plt.close()
    print(f"✅ Saved Confusion Matrix plot to {cm_path}")

    # For Feature Importances on Isolation Forest, SHAP is best
    # However, for a quick global look, we can sample SHAP values
    import shap
    print("Computing SHAP for Global Feature Importance (Sampled 500 rows)...")
    explainer = shap.TreeExplainer(model)
    # Take a sample to speed up SHAP evaluation
    sample_idx = np.random.choice(X_scaled.shape[0], 500, replace=False)
    X_sample = X_scaled[sample_idx]
    
    shap_values = explainer.shap_values(X_sample)
    
    # Plot global feature importance
    plt.figure()
    shap.summary_plot(shap_values, X_sample, feature_names=features, show=False)
    # shap.summary_plot might alter figure sizing, we grab the current fig
    fig = plt.gcf() 
    fi_path = os.path.join(base_dir, 'feature_importance.png')
    fig.savefig(fi_path, bbox_inches='tight')
    plt.close()
    print(f"✅ Saved Feature Importance plot to {fi_path}")


if __name__ == "__main__":
    run_evaluation()
