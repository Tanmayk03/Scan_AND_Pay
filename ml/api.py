import os
import json
import joblib
import pandas as pd
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Scan & Pay ML Risk Guard",
    description="Machine Learning service for predicting checkout theft/fraud risk",
    version="1.0.0"
)

# Enable CORS for frontend and backend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and scaler
model = None
scaler = None
ml_dir = os.path.dirname(os.path.abspath(__file__))

class PredictionRequest(BaseModel):
    order_value: float = Field(..., description="Total value of the order in INR")
    item_count: int = Field(..., description="Number of items in the basket")
    average_item_price: float = Field(..., description="Average price per item")
    scan_duration_seconds: float = Field(..., description="Scan duration in seconds")
    weight_mismatch_ratio: float = Field(..., description="Absolute weight difference ratio (0 to 1)")
    hour_of_day: int = Field(..., description="Hour of transaction checkout (0-23)")
    category_diversity: int = Field(..., description="Number of unique categories")

def load_resources():
    global model, scaler
    model_path = os.path.join(ml_dir, 'model.joblib')
    scaler_path = os.path.join(ml_dir, 'scaler.joblib')
    
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        try:
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            print("ML model and scaler loaded successfully.")
            return True
        except Exception as e:
            print(f"Error loading model resources: {e}")
            return False
    else:
        print("Model and/or scaler files not found. Please run train_model.py first.")
        return False

# Load model resources on startup
@app.on_event("startup")
def startup_event():
    load_resources()

@app.get("/status")
def get_status() -> Dict[str, Any]:
    global model, scaler
    is_loaded = (model is not None) and (scaler is not None)
    
    # Check if metrics exist
    metrics_path = os.path.join(ml_dir, 'model_metrics.json')
    has_metrics = os.path.exists(metrics_path)
    
    return {
        "status": "online",
        "model_loaded": is_loaded,
        "has_metrics": has_metrics,
        "api": "FastAPI"
    }

@app.get("/metrics")
def get_metrics() -> Dict[str, Any]:
    metrics_path = os.path.join(ml_dir, 'model_metrics.json')
    if not os.path.exists(metrics_path):
        raise HTTPException(
            status_code=404, 
            detail="Model metrics not found. Run training script to generate metrics."
        )
    try:
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read metrics: {str(e)}")

@app.post("/predict")
def predict_risk(payload: PredictionRequest) -> Dict[str, Any]:
    global model, scaler
    
    # Lazy reload model if it wasn't loaded during startup
    if model is None or scaler is None:
        success = load_resources()
        if not success:
            raise HTTPException(
                status_code=503, 
                detail="ML Model not initialized. Train the model using train_model.py first."
            )
            
    try:
        # Prepare input features as a pandas DataFrame matching column names in training
        input_data = pd.DataFrame([{
            'order_value': payload.order_value,
            'item_count': payload.item_count,
            'average_item_price': payload.average_item_price,
            'scan_duration_seconds': payload.scan_duration_seconds,
            'weight_mismatch_ratio': payload.weight_mismatch_ratio,
            'hour_of_day': payload.hour_of_day,
            'category_diversity': payload.category_diversity
        }])
        
        # Scale inputs using the loaded StandardScaler
        input_scaled = scaler.transform(input_data)
        
        # Predict probability of class 1 (Fraud)
        # model.predict_proba returns array of [prob_class_0, prob_class_1]
        fraud_probability = model.predict_proba(input_scaled)[0][1]
        
        # Convert to 0-100 scale
        risk_score = round(float(fraud_probability) * 100)
        
        # We also make a binary flag based on standard 50% threshold
        flagged = risk_score >= 50
        
        return {
            "success": True,
            "riskScore": risk_score,
            "flagged": flagged,
            "algorithm": "Random Forest Classifier (ML)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
