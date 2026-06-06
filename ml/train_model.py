import pandas as pd
import numpy as np
import os
from datetime import datetime
import json
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

def train_and_evaluate():
    # Paths
    ml_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(ml_dir, 'orders_dataset.csv')
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Run generate_dataset.py first.")
        
    # Load dataset
    df = pd.read_csv(csv_path)
    
    # Define features and target
    feature_cols = [
        'order_value', 
        'item_count', 
        'average_item_price', 
        'scan_duration_seconds', 
        'weight_mismatch_ratio', 
        'hour_of_day', 
        'category_diversity'
    ]
    
    X = df[feature_cols]
    y = df['is_fraud']
    
    # Split into train and test sets (80/20 split)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
    
    # Fit StandardScaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Initialize Random Forest Classifier
    # Limiting depth to 6 to prevent overfitting and ensure clean, generalizable decision rules
    model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42, class_weight='balanced')
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1] # probability of fraud
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    # Calculate feature importances
    importances = model.feature_importances_
    feature_importances = dict(zip(feature_cols, [float(x) for x in importances]))
    # Sort feature importances descending
    feature_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))
    
    print("\n" + "="*40)
    print("        MODEL EVALUATION RESULTS        ")
    print("="*40)
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f} (When model flags fraud, how often is it right?)")
    print(f"Recall:    {recall:.4f} (How many actual fraud cases did we catch?)")
    print(f"F1-Score:  {f1:.4f}")
    print("\nConfusion Matrix:")
    print(f"True Negatives (Legit predicted Legit):  {cm[0][0]}")
    print(f"False Positives (Legit flagged as Fraud): {cm[0][1]}")
    print(f"False Negatives (Fraud missed):          {cm[1][0]}")
    print(f"True Positives (Fraud flagged):          {cm[1][1]}")
    print("-"*40)
    print("Feature Importances:")
    for feat, imp in feature_importances.items():
        print(f" - {feat:<25}: {imp:.4f} ({imp*100:.1f}%)")
    print("="*40)
    
    # Save model and scaler
    model_path = os.path.join(ml_dir, 'model.joblib')
    scaler_path = os.path.join(ml_dir, 'scaler.joblib')
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    print(f"Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")
    
    # Save metrics JSON
    metrics = {
        'accuracy': round(float(accuracy), 4),
        'precision': round(float(precision), 4),
        'recall': round(float(recall), 4),
        'f1_score': round(float(f1), 4),
        'confusion_matrix': cm.tolist(),
        'feature_importances': feature_importances,
        'trained_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'dataset_size': len(df)
    }
    
    metrics_path = os.path.join(ml_dir, 'model_metrics.json')
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"Model metrics saved to {metrics_path}")

if __name__ == '__main__':
    train_and_evaluate()
