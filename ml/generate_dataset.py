import numpy as np
import pandas as pd
import os

# Set random seed for reproducibility
np.random.seed(42)

def generate_checkout_dataset(num_samples=1500):
    data = []
    
    # Target: 0 = Honest checkout, 1 = Suspicious checkout (Fraud)
    # Target distribution: ~85% honest, ~15% suspicious
    
    for _ in range(num_samples):
        is_fraud = np.random.choice([0, 1], p=[0.85, 0.15])
        
        if is_fraud == 0:
            # --- HONEST CUSTOMER PROFILE ---
            item_count = np.random.randint(1, 25)
            # Normal order value based on item count (average item price ~50 - 300 INR)
            avg_price = np.random.uniform(50.0, 300.0)
            order_value = item_count * avg_price
            
            # Normal scanning speed: 10 to 30 seconds per item
            scan_duration_seconds = item_count * np.random.uniform(10.0, 30.0) + np.random.uniform(5.0, 20.0)
            
            # Weight mismatch is very small (usually within 1-2% tolerance)
            weight_mismatch_ratio = np.random.exponential(0.015) # cluster around 0-3%
            weight_mismatch_ratio = min(weight_mismatch_ratio, 0.05) # cap normal at 5%
            
            # Standard shopping hours (8 AM to 10 PM)
            hour_of_day = int(np.random.choice(
                list(range(8, 22)) + list(range(0, 8)) + list(range(22, 24)),
                p=[0.06]*14 + [0.01]*8 + [0.04]*2
            ))
            
            # Category diversity: higher item count, higher diversity
            max_diversity = min(item_count, 5)
            category_diversity = np.random.randint(1, max_diversity + 1) if max_diversity > 0 else 1
            
        else:
            # --- SUSPICIOUS CUSTOMER PROFILE (FRAUD) ---
            # Scenario A: Theft by weight substitution (e.g. scanning onion, bagging electronics)
            # Scenario B: Theft by scanning too fast / skipping items
            # Scenario C: Late night / rush hour exploitation
            
            fraud_type = np.random.choice(['weight_mismatch', 'speed_scan', 'price_mismatch'])
            
            if fraud_type == 'weight_mismatch':
                # Bagging unscanned items -> high weight mismatch
                item_count = np.random.randint(3, 15)
                avg_price = np.random.uniform(40.0, 150.0)
                order_value = item_count * avg_price
                scan_duration_seconds = item_count * np.random.uniform(8.0, 20.0)
                # Significant weight mismatch (10% to 50% discrepancy)
                weight_mismatch_ratio = np.random.uniform(0.12, 0.45)
                category_diversity = np.random.randint(1, min(item_count, 4) + 1)
                
            elif fraud_type == 'speed_scan':
                # Scanning items extremely fast or bypassing items
                item_count = np.random.randint(5, 30)
                avg_price = np.random.uniform(80.0, 500.0)
                order_value = item_count * avg_price
                # Suspiciously fast: less than 4 seconds per item
                scan_duration_seconds = item_count * np.random.uniform(1.5, 4.5)
                # Might have normal weight mismatch or slight mismatch
                weight_mismatch_ratio = np.random.uniform(0.01, 0.08)
                category_diversity = np.random.randint(1, min(item_count, 5) + 1)
                
            else: # price_mismatch / high value
                # High value items scanned, fast duration, odd hours
                item_count = np.random.randint(2, 8)
                avg_price = np.random.uniform(300.0, 1500.0)
                order_value = item_count * avg_price
                scan_duration_seconds = item_count * np.random.uniform(4.0, 8.0)
                weight_mismatch_ratio = np.random.uniform(0.05, 0.20)
                category_diversity = np.random.randint(1, 3)
            
            # Fraud peaks slightly during late nights or peak hours
            hour_of_day = int(np.random.choice(
                list(range(0, 24)),
                p=[0.02]*6 + [0.05]*12 + [0.06]*4 + [0.02]*2 # sums to exactly 1.0 (0.12 + 0.60 + 0.24 + 0.04)
            ))
        
        # Calculate derived average item price
        avg_price_derived = order_value / item_count if item_count > 0 else 0
        
        data.append({
            'order_value': round(order_value, 2),
            'item_count': item_count,
            'average_item_price': round(avg_price_derived, 2),
            'scan_duration_seconds': round(scan_duration_seconds, 1),
            'weight_mismatch_ratio': round(weight_mismatch_ratio, 4),
            'hour_of_day': hour_of_day,
            'category_diversity': category_diversity,
            'is_fraud': is_fraud
        })
        
    df = pd.DataFrame(data)
    return df

if __name__ == '__main__':
    print("Generating checkout transaction dataset...")
    df = generate_checkout_dataset(1500)
    
    # Ensure ml directory exists
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'orders_dataset.csv')
    df.to_csv(csv_path, index=False)
    
    print(f"Dataset successfully generated and saved to: {csv_path}")
    print("\nDataset Summary:")
    print(df['is_fraud'].value_counts(normalize=True))
    print("\nSample Data:")
    print(df.head())
