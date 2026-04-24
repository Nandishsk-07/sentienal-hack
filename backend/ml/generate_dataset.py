import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def generate_synthetic_data(num_rows=10000):
    """
    Generates synthetic system logs and transaction data for fraud detection ML training.
    """
    np.random.seed(42)
    
    # Base user IDs
    user_ids = np.random.randint(1000, 1100, num_rows)
    
    # Timestamps covering a recent month
    start_date = datetime(2026, 3, 1)
    timestamps = [start_date + timedelta(minutes=int(x)) for x in np.random.randint(0, 30*24*60, num_rows)]
    
    # Hours of access (derived from timestamps for normal data)
    hours = np.array([ts.hour for ts in timestamps])
    
    # Normal behavior distributions
    # Transaction amounts: typical amounts skewed lower
    transaction_amount = np.random.lognormal(mean=4.0, sigma=1.0, size=num_rows)
    # Data volume mb: generally small requests
    data_volume_mb = np.random.lognormal(mean=2.0, sigma=1.0, size=num_rows)
    # Geo delta km: usually within same city
    geo_delta_km = np.random.exponential(scale=10.0, size=num_rows)
    
    # Create DataFrame
    df = pd.DataFrame({
        'user_id': user_ids,
        'timestamp': timestamps,
        'hour_of_access': hours,
        'transaction_amount': transaction_amount,
        'data_volume_mb': data_volume_mb,
        'geo_delta_km': geo_delta_km
    })
    
    # Inject correlated anomalies (~5% of data)
    num_anomalies = int(num_rows * 0.05)
    anomaly_indices = np.random.choice(df.index, num_anomalies, replace=False)
    
    # Add a ground truth column for evaluation (optional but helpful for evaluation later)
    df['is_anomaly'] = 0
    df.loc[anomaly_indices, 'is_anomaly'] = 1
    
    for idx in anomaly_indices:
        anomaly_type = np.random.choice(['data_exfil', 'account_takeover'])
        
        if anomaly_type == 'data_exfil':
            # Data Exfiltration: High data volume during off-hours
            df.at[idx, 'hour_of_access'] = np.random.choice([1, 2, 3, 4])  # e.g., 2 AM
            df.at[idx, 'data_volume_mb'] = np.random.uniform(500, 3000)   # massive download
            
        elif anomaly_type == 'account_takeover':
            # Account Takeover: High geo distance + large transaction
            df.at[idx, 'geo_delta_km'] = np.random.uniform(500, 5000)     # far away login
            df.at[idx, 'transaction_amount'] = np.random.uniform(10000, 50000) # massive transfer
            
    # Clean up data framing
    df['transaction_amount'] = df['transaction_amount'].round(2)
    df['data_volume_mb'] = df['data_volume_mb'].round(2)
    df['geo_delta_km'] = df['geo_delta_km'].round(2)
    
    # Sort chronologically
    df = df.sort_values(by='timestamp').reset_index(drop=True)
    
    return df

if __name__ == "__main__":
    print("Generating synthetic dataset...")
    df = generate_synthetic_data(10000)
    
    # Ensure the directory exists
    output_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(output_dir, exist_ok=True)
    
    output_path = os.path.join(output_dir, "synthetic_data.csv")
    df.to_csv(output_path, index=False)
    
    print(f"Generated {len(df)} rows.")
    print(f"Anomalies inserted: {df['is_anomaly'].sum()} rows")
    print(f"Data saved to {output_path}")
