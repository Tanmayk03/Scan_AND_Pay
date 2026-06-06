import { useState, useEffect } from 'react';
import { adminApi } from '../../api';

export default function AdminMlGuard() {
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Simulator states
  const [orderValue, setOrderValue] = useState(250);
  const [itemCount, setItemCount] = useState(5);
  const [scanDuration, setScanDuration] = useState(120);
  const [weightMismatch, setWeightMismatch] = useState('none');
  const [hourOfDay, setHourOfDay] = useState(14);
  const [categoryDiversity, setCategoryDiversity] = useState(2);
  
  // Simulation results
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState('');

  // Fetch model status and metrics from our backend (which proxies to FastAPI)
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getMlStatus();
      setMlData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch ML service status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimulationLoading(true);
    setSimulationError('');
    setSimulationResult(null);
    
    // Map weight mismatch state to a numeric ratio
    const ratio = weightMismatch === 'none' ? 0.01 : 0.25;
    const avgPrice = roundToTwo(orderValue / itemCount);
    
    const payload = {
      order_value: parseFloat(orderValue),
      item_count: parseInt(itemCount, 10),
      average_item_price: parseFloat(avgPrice),
      scan_duration_seconds: parseFloat(scanDuration),
      weight_mismatch_ratio: parseFloat(ratio),
      hour_of_day: parseInt(hourOfDay, 10),
      category_diversity: parseInt(categoryDiversity, 10)
    };
    
    try {
      // Direct call to FastAPI predict endpoint (with CORS enabled)
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`FastAPI returned status ${response.status}`);
      }
      
      const mlPredict = await response.json();
      
      // Calculate legacy rule-based score for comparison
      const legacyScore = calculateLegacyRuleScore(orderValue, scanDuration, weightMismatch === 'mismatch');
      
      setSimulationResult({
        mlScore: mlPredict.riskScore,
        mlFlagged: mlPredict.flagged,
        legacyScore,
        legacyFlagged: legacyScore >= (mlData?.metrics?.riskThreshold || 50),
        featuresUsed: payload
      });
    } catch (err) {
      setSimulationError('FastAPI offline or prediction failed. Is the ML microservice running on port 8000?');
    } finally {
      setSimulationLoading(false);
    }
  };

  const calculateLegacyRuleScore = (val, secs, hasMismatch) => {
    let score = 0;
    if (val > 200) score += 30;
    else if (val > 100) score += 25;
    else if (val > 50) score += 15;
    else if (val > 20) score += 5;

    if (secs < 20) score += 25;
    else if (secs < 45) score += 15;
    else if (secs < 60) score += 5;

    if (hasMismatch) score += 35;
    return Math.min(100, score);
  };

  const formatSeconds = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const roundToTwo = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const formatHour = (h) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  const getRiskExplanation = (mlScore, features) => {
    const scanSpeed = roundToTwo(features.scan_duration_seconds / features.item_count);
    const explanations = [];
    
    if (features.weight_mismatch_ratio > 0.05) {
      explanations.push("a significant weight mismatch ratio (25%) detected at bagging scale");
    }
    if (scanSpeed < 4.0) {
      explanations.push(`an extremely fast scanning rate of ${scanSpeed}s per item`);
    }
    if (features.order_value > 500 && scanSpeed < 10.0) {
      explanations.push("high value basket checkout with relatively fast scanning times");
    }
    if (features.hour_of_day >= 22 || features.hour_of_day <= 5) {
      explanations.push(`checkout occurring during late night hours (${formatHour(features.hour_of_day)})`);
    }
    
    if (explanations.length === 0) {
      return "Transaction shows normal, low-risk customer behavior. Scanner speed, items bagging weight, and checkout times are consistent with regular profiles.";
    }
    
    return `Flagged due to: ${explanations.join(', and ')}.`;
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted animate-pulse font-medium">
        Loading ML Model Status & Metrics...
      </div>
    );
  }

  const isOnline = mlData?.status === 'online' && mlData?.modelLoaded;
  const metrics = mlData?.metrics;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in text-[#e6edf3]">
      
      {/* LEFT & CENTER PANELS: Model Information & Metrics */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        
        {/* Status Indicator Banner */}
        <div className={`p-5 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-300 ${
          isOnline 
            ? 'bg-success/10 border-success/30 shadow-md shadow-success/5' 
            : 'bg-error/10 border-error/30 shadow-md shadow-error/5'
        }`}>
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`w-3.5 h-3.5 rounded-full inline-block animate-pulse ${isOnline ? 'bg-success' : 'bg-error'}`}></span>
              <h3 className="m-0 text-lg font-bold">
                {isOnline ? 'ML Risk Guard: Active & Online' : 'ML Risk Guard: Offline / Standby'}
              </h3>
            </div>
            <p className="m-0 mt-1.5 text-sm text-muted">
              {isOnline 
                ? 'Transactions are currently evaluated in real-time using a trained Random Forest model.' 
                : 'The Express backend has automatically fallen back to the rule-based safety algorithm.'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={fetchStatus}
            className="self-start sm:self-auto py-2 px-4 bg-border hover:bg-muted border-0 rounded-lg text-sm font-semibold transition-colors active:scale-95"
          >
            Refresh Status
          </button>
        </div>

        {isOnline && metrics ? (
          <>
            {/* Metric Gauges Grid */}
            <div>
              <h4 className="m-0 mb-3.5 text-sm font-semibold uppercase tracking-wider text-muted">Model Evaluation Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Accuracy', val: metrics.accuracy, desc: 'Overall prediction accuracy', color: 'text-accent border-accent/20' },
                  { label: 'Precision', val: metrics.precision, desc: 'Avoids false fraud flags', color: 'text-success border-success/20' },
                  { label: 'Recall', val: metrics.recall, desc: 'Catches actual fraud cases', color: 'text-warning border-warning/20' },
                  { label: 'F1-Score', val: metrics.f1_score, desc: 'Balanced model score', color: 'text-accent border-accent/20' }
                ].map((metric, i) => (
                  <div key={i} className="bg-surface p-4 rounded-xl border border-border flex flex-col items-center text-center shadow-sm">
                    <span className="text-xs text-muted font-medium mb-2">{metric.label}</span>
                    <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                      {/* SVG circle track */}
                      <svg className="absolute w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="34" className="stroke-border fill-transparent" strokeWidth="6" />
                        <circle 
                          cx="40" 
                          cy="40" 
                          r="34" 
                          className={`fill-transparent transition-all duration-1000 ${
                            metric.label === 'Accuracy' ? 'stroke-accent' : 
                            metric.label === 'Precision' ? 'stroke-success' : 
                            metric.label === 'Recall' ? 'stroke-warning' : 'stroke-accent'
                          }`}
                          strokeWidth="6" 
                          strokeDasharray="213.6"
                          strokeDashoffset={213.6 - (213.6 * metric.val)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-lg font-bold">{(metric.val * 100).toFixed(1)}%</span>
                    </div>
                    <span className="text-[0.7rem] text-muted leading-tight">{metric.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Importance & Confusion Matrix Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Feature Importance (Pure Tailwind Horizontal Progress bars) */}
              <div className="md:col-span-3 bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="m-0 mb-1 text-sm font-semibold uppercase tracking-wider text-muted">Feature Importance</h4>
                  <p className="m-0 mb-5 text-xs text-muted">Variables the Random Forest relies on to flag transaction risks.</p>
                  
                  <div className="flex flex-col gap-4">
                    {Object.entries(metrics.feature_importances).map(([feature, val]) => (
                      <div key={feature} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                          <span className="text-accent">{(val * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-bg-dark h-2 rounded-full overflow-hidden border border-border">
                          <div 
                            className="bg-gradient-to-r from-accent/70 to-accent h-full rounded-full transition-all duration-1000"
                            style={{ width: `${val * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confusion Matrix Card */}
              <div className="md:col-span-2 bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col">
                <h4 className="m-0 mb-1 text-sm font-semibold uppercase tracking-wider text-muted">Confusion Matrix</h4>
                <p className="m-0 mb-4 text-xs text-muted">Evaluation of predictions against actual test data labels.</p>
                
                <div className="grid grid-cols-2 gap-2 text-center flex-1 my-auto">
                  <div className="bg-bg-dark/40 p-3 rounded border border-border flex flex-col justify-center">
                    <span className="text-[0.65rem] text-muted font-bold uppercase">True Negative (Legit)</span>
                    <span className="text-xl font-bold text-[#e6edf3]">{metrics.confusion_matrix[0][0]}</span>
                    <span className="text-[0.6rem] text-muted">Correctly passed</span>
                  </div>
                  <div className="bg-error/5 p-3 rounded border border-error/25 flex flex-col justify-center">
                    <span className="text-[0.65rem] text-error font-bold uppercase">False Positive</span>
                    <span className="text-xl font-bold text-error">{metrics.confusion_matrix[0][1]}</span>
                    <span className="text-[0.6rem] text-error">Wrongly flagged</span>
                  </div>
                  <div className="bg-warning/5 p-3 rounded border border-warning/25 flex flex-col justify-center">
                    <span className="text-[0.65rem] text-warning font-bold uppercase">False Negative</span>
                    <span className="text-xl font-bold text-warning">{metrics.confusion_matrix[1][0]}</span>
                    <span className="text-[0.6rem] text-warning">Missed fraud</span>
                  </div>
                  <div className="bg-success/5 p-3 rounded border border-success/25 flex flex-col justify-center">
                    <span className="text-[0.65rem] text-success font-bold uppercase">True Positive (Fraud)</span>
                    <span className="text-xl font-bold text-success">{metrics.confusion_matrix[1][1]}</span>
                    <span className="text-[0.6rem] text-success">Correctly flagged</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-border/50 text-[0.7rem] text-muted">
                  Tested on <span className="font-semibold">{metrics.dataset_size}</span> total records. Last trained on <span className="font-semibold">{metrics.trained_at}</span>.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-surface p-8 rounded-xl border border-border text-center shadow-sm">
            <svg className="w-12 h-12 text-error mx-auto mb-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <h4 className="m-0 mb-1 text-base font-semibold">Model Parameters Unavailable</h4>
            <p className="m-0 text-sm text-muted max-w-md mx-auto">
              We cannot load metrics because the Python FastAPI service is unreachable on port 8000 or the model files have not been generated yet.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="text-xs bg-bg-dark border border-border px-3 py-1.5 rounded text-muted">
                1. Start service: <code>uvicorn api:app --port 8000</code>
              </span>
              <span className="text-xs bg-bg-dark border border-border px-3 py-1.5 rounded text-muted">
                2. Run pipeline: <code>python train_model.py</code>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Interactive Simulator Sandbox */}
      <div className="flex flex-col gap-4">
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col h-full">
          <h3 className="m-0 mb-1.5 text-base font-bold">Interactive Risk Simulator</h3>
          <p className="m-0 mb-5 text-xs text-muted">
            Simulate a customer checkout checkout to test model risk scoring in real-time.
          </p>

          <form onSubmit={handleSimulate} className="flex flex-col gap-4">
            
            {/* Input fields */}
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              <div className="flex justify-between">
                <span>Basket Value (₹)</span>
                <span className="text-[#e6edf3] font-bold">₹{orderValue}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="5000" 
                step="10"
                value={orderValue} 
                onChange={(e) => setOrderValue(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-accent border border-border"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                <div className="flex justify-between">
                  <span>Item Count</span>
                  <span className="text-[#e6edf3] font-bold">{itemCount} items</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="40" 
                  value={itemCount} 
                  onChange={(e) => setItemCount(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-accent border border-border"
                />
              </label>

              <div className="flex flex-col justify-end text-right pb-1">
                <span className="text-[0.65rem] text-muted uppercase font-bold">Avg Price/Item</span>
                <span className="text-xs font-bold text-[#e6edf3]">₹{roundToTwo(orderValue / itemCount)}</span>
              </div>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              <div className="flex justify-between">
                <span>Scan Duration</span>
                <span className="text-[#e6edf3] font-bold">{formatSeconds(scanDuration)}</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="600" 
                step="5"
                value={scanDuration} 
                onChange={(e) => setScanDuration(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-accent border border-border"
              />
              <span className="text-[0.65rem] text-muted font-normal text-right">
                Scanner Speed: <span className="font-semibold text-accent">{roundToTwo(scanDuration / itemCount)}s/item</span>
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              Weight Discrepancy (Scale Verification)
              <select
                value={weightMismatch}
                onChange={(e) => setWeightMismatch(e.target.value)}
                className="w-full py-2 px-3 border border-border rounded-lg bg-bg-dark text-[#e6edf3] font-medium outline-none focus:border-accent"
              >
                <option value="none">None (Scale matches expected weight)</option>
                <option value="mismatch">Discrepancy (Weight mismatch detected!)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              <div className="flex justify-between">
                <span>Time of Checkout</span>
                <span className="text-[#e6edf3] font-bold">{formatHour(hourOfDay)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="23" 
                value={hourOfDay} 
                onChange={(e) => setHourOfDay(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-accent border border-border"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              <div className="flex justify-between">
                <span>Category Diversity</span>
                <span className="text-[#e6edf3] font-bold">{categoryDiversity} categories</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max={Math.min(itemCount, 8)} 
                value={categoryDiversity} 
                onChange={(e) => setCategoryDiversity(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-accent border border-border"
              />
            </label>

            <button
              type="submit"
              disabled={simulationLoading || !isOnline}
              className="mt-2 py-3 bg-accent text-white border-0 rounded-lg font-bold shadow-lg shadow-accent/15 hover:bg-accent/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {simulationLoading ? 'Running ML Inference...' : 'Evaluate Transaction Risk'}
            </button>
          </form>

          {simulationError && (
            <div className="bg-error/10 border border-error/30 text-error p-3 rounded-lg text-xs mt-4 leading-normal">
              {simulationError}
            </div>
          )}

          {/* Simulation Output Card */}
          {simulationResult && (
            <div className="mt-5 p-4 rounded-lg bg-bg-dark border border-border animate-fade-in flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[0.65rem] text-muted font-bold uppercase">Prediction Result</span>
                  <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase ${
                    simulationResult.mlFlagged ? 'bg-error/15 text-error border border-error/20' : 'bg-success/15 text-success border border-success/20'
                  }`}>
                    {simulationResult.mlFlagged ? 'FLAGGED FOR MANUAL CHECK' : 'SAFE / LOW RISK'}
                  </span>
                </div>
                
                {/* Risk score visual bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>ML Fraud Probability</span>
                    <span className={simulationResult.mlScore >= 50 ? 'text-error' : 'text-success'}>
                      {simulationResult.mlScore}%
                    </span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        simulationResult.mlScore >= 75 ? 'bg-error' :
                        simulationResult.mlScore >= 50 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${simulationResult.mlScore}%` }}
                    ></div>
                  </div>
                </div>

                <p className="text-[0.7rem] text-muted leading-relaxed m-0 italic mb-4">
                  "{getRiskExplanation(simulationResult.mlScore, simulationResult.featuresUsed)}"
                </p>
              </div>

              {/* Side-by-side comparison */}
              <div className="border-t border-border/60 pt-3 mt-2 grid grid-cols-2 gap-4 text-center">
                <div>
                  <span className="text-[0.6rem] text-muted font-bold uppercase block">RandomForest ML</span>
                  <span className={`text-base font-bold ${simulationResult.mlScore >= 50 ? 'text-error' : 'text-success'}`}>
                    {simulationResult.mlScore}/100
                  </span>
                  <span className="text-[0.55rem] text-muted block">({simulationResult.mlFlagged ? 'Flagged' : 'Pass'})</span>
                </div>
                <div className="border-l border-border/60">
                  <span className="text-[0.6rem] text-muted font-bold uppercase block">Legacy Rules</span>
                  <span className={`text-base font-bold ${simulationResult.legacyScore >= 50 ? 'text-warning' : 'text-muted'}`}>
                    {simulationResult.legacyScore}/100
                  </span>
                  <span className="text-[0.55rem] text-muted block">({simulationResult.legacyFlagged ? 'Flagged' : 'Pass'})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
