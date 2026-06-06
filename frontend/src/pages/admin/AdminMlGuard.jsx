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

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getMlStatus();
      setMlData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch risk engine status');
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
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Risk engine returned status ${response.status}`);
      }
      
      const mlPredict = await response.json();
      const legacyScore = calculateLegacyRuleScore(orderValue, scanDuration, weightMismatch === 'mismatch');
      
      setSimulationResult({
        mlScore: mlPredict.riskScore,
        mlFlagged: mlPredict.flagged,
        legacyScore,
        legacyFlagged: legacyScore >= (mlData?.metrics?.riskThreshold || 50),
        featuresUsed: payload
      });
    } catch (err) {
      setSimulationError('Risk engine offline. Ensure backend services are running.');
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

  const getRiskVectors = (features) => {
    const scanSpeed = roundToTwo(features.scan_duration_seconds / features.item_count);
    const vectors = [];
    
    if (features.weight_mismatch_ratio > 0.05) {
      vectors.push({ label: 'Scale Deviation', desc: 'Weight mismatch (25% variance) detected at bagging scale' });
    }
    if (scanSpeed < 4.0) {
      vectors.push({ label: 'Velocity Threshold', desc: `Scan speed (${scanSpeed}s/item) exceeds standard speed limits` });
    }
    if (features.order_value > 500 && scanSpeed < 10.0) {
      vectors.push({ label: 'Checkout Anomalies', desc: 'High basket value combined with short scan intervals' });
    }
    if (features.hour_of_day >= 22 || features.hour_of_day <= 5) {
      vectors.push({ label: 'Late Checkout Window', desc: `Checkout occurred during late night hours (${formatHour(features.hour_of_day)})` });
    }
    
    return vectors;
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted font-medium">
        Loading system metrics...
      </div>
    );
  }

  const isOnline = mlData?.status === 'online' && mlData?.modelLoaded;
  const metrics = mlData?.metrics;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in text-[#e6edf3]">
      
      {/* LEFT & CENTER PANELS: Status & Metrics */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        
        {/* Status Indicator Banner */}
        <div className={`p-5 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-300 ${
          isOnline 
            ? 'bg-success/5 border-success/20 shadow-sm' 
            : 'bg-error/5 border-error/20 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${isOnline ? 'bg-success' : 'bg-error'}`}></span>
              <h3 className="m-0 text-base font-bold">
                {isOnline ? 'Fraud Detection System: Active' : 'Fraud Detection System: Standby'}
              </h3>
            </div>
            <p className="m-0 mt-1 text-sm text-muted">
              {isOnline 
                ? 'Transaction logs are dynamically analyzed by the security risk engine.' 
                : 'Security engine offline. Terminal checkout logs are processed via static heuristic rules.'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={fetchStatus}
            className="self-start sm:self-auto py-1.5 px-3 bg-surface border border-border text-[#e6edf3] text-xs font-semibold rounded-lg hover:bg-bg-dark transition-colors active:scale-95"
          >
            Refresh Status
          </button>
        </div>

        {isOnline && metrics ? (
          <>
            {/* Metric Cards Grid */}
            <div>
              <h4 className="m-0 mb-3 text-xs font-bold uppercase tracking-wider text-muted">Security Engine Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Overall Accuracy', val: metrics.accuracy, desc: 'Correct classification rate', color: 'bg-accent' },
                  { label: 'False Alarm Avoidance', val: metrics.precision, desc: 'Prevents false theft flags', color: 'bg-success' },
                  { label: 'Theft Catch Rate', val: metrics.recall, desc: 'Catches actual theft cases', color: 'bg-warning' },
                  { label: 'Combined Efficiency', val: metrics.f1_score, desc: 'Balanced detection rating', color: 'bg-accent' }
                ].map((metric, i) => (
                  <div key={i} className="bg-surface p-4 rounded-xl border border-border flex flex-col shadow-sm">
                    <span className="text-xs text-muted font-medium mb-1">{metric.label}</span>
                    <span className="text-2xl font-bold mb-3">{(metric.val * 100).toFixed(1)}%</span>
                    
                    {/* Linear metric bar */}
                    <div className="w-full bg-bg-dark h-1 rounded overflow-hidden mb-2">
                      <div className={`h-full ${metric.color}`} style={{ width: `${metric.val * 100}%` }}></div>
                    </div>
                    <span className="text-[0.65rem] text-muted leading-tight">{metric.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Weights & Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Feature Weights */}
              <div className="md:col-span-3 bg-surface p-5 rounded-xl border border-border shadow-sm">
                <h4 className="m-0 mb-1 text-xs font-bold uppercase tracking-wider text-muted">Risk Factors Weight</h4>
                <p className="m-0 mb-5 text-xs text-muted">Core parameters weight evaluated by the engine to assess theft likelihood.</p>
                
                <div className="flex flex-col gap-4">
                  {Object.entries(metrics.feature_importances).map(([feature, val]) => (
                    <div key={feature} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize text-muted font-medium">{feature.replace(/_/g, ' ')}</span>
                        <span className="text-[#e6edf3] font-bold">{(val * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-bg-dark h-1.5 rounded overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded"
                          style={{ width: `${val * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confusion Matrix Card */}
              <div className="md:col-span-2 bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="m-0 mb-1 text-xs font-bold uppercase tracking-wider text-muted">Detection Matrix</h4>
                  <p className="m-0 mb-4 text-xs text-muted">Validation matrix comparing transaction flags against test data sets.</p>
                  
                  <div className="border border-border rounded-lg overflow-hidden text-xs">
                    <div className="grid grid-cols-2 bg-bg-dark/40 border-b border-border p-2.5 text-center font-semibold">
                      <div>Actual legit</div>
                      <div className="border-l border-border">Actual theft</div>
                    </div>
                    <div className="grid grid-cols-2 text-center">
                      <div className="border-b border-r border-border p-2.5">
                        <div className="text-muted text-[0.65rem] uppercase">Passed</div>
                        <div className="text-base font-bold mt-0.5">{metrics.confusion_matrix[0][0]}</div>
                      </div>
                      <div className="border-b border-border p-2.5 bg-error/5">
                        <div className="text-error text-[0.65rem] uppercase font-semibold">Missed</div>
                        <div className="text-base font-bold text-error mt-0.5">{metrics.confusion_matrix[1][0]}</div>
                      </div>
                      <div className="border-r border-border p-2.5 bg-warning/5">
                        <div className="text-warning text-[0.65rem] uppercase font-semibold">False Flag</div>
                        <div className="text-base font-bold text-warning mt-0.5">{metrics.confusion_matrix[0][1]}</div>
                      </div>
                      <div className="p-2.5 bg-success/5">
                        <div className="text-success text-[0.65rem] uppercase font-semibold">Flagged</div>
                        <div className="text-base font-bold text-success mt-0.5">{metrics.confusion_matrix[1][1]}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-border/50 text-[0.7rem] text-muted">
                  Validated on <span className="font-semibold">{metrics.dataset_size}</span> records. Update date: <span className="font-semibold">{metrics.trained_at}</span>.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-surface p-8 rounded-xl border border-border text-center shadow-sm">
            <h4 className="m-0 mb-1 text-sm font-semibold">Risk Engine Offline</h4>
            <p className="m-0 text-xs text-muted max-w-sm mx-auto mt-1">
              Connect the security daemon service on port 8000 to fetch system parameters and status information.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Risk Simulator Sandbox */}
      <div className="flex flex-col gap-4">
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col h-full">
          <h3 className="m-0 mb-1 text-sm font-bold uppercase tracking-wide">Risk Simulator</h3>
          <p className="m-0 mb-5 text-xs text-muted">
            Configure mock transaction variables to evaluate security scores.
          </p>

          <form onSubmit={handleSimulate} className="flex flex-col gap-4">
            
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              <div className="flex justify-between">
                <span>Basket Value</span>
                <span className="text-[#e6edf3] font-bold">₹{orderValue}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="5000" 
                step="10"
                value={orderValue} 
                onChange={(e) => setOrderValue(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-bg-dark rounded appearance-none cursor-pointer accent-accent"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                <div className="flex justify-between">
                  <span>Item Count</span>
                  <span className="text-[#e6edf3] font-bold">{itemCount}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="40" 
                  value={itemCount} 
                  onChange={(e) => setItemCount(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-bg-dark rounded appearance-none cursor-pointer accent-accent"
                />
              </label>

              <div className="flex flex-col justify-end text-right pb-0.5">
                <span className="text-[0.6rem] text-muted uppercase font-bold">Avg Price/Item</span>
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
                className="w-full h-1 bg-bg-dark rounded appearance-none cursor-pointer accent-accent"
              />
              <span className="text-[0.65rem] text-muted font-normal text-right">
                Scanner speed: <span className="font-semibold text-accent">{roundToTwo(scanDuration / itemCount)}s/item</span>
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              Verification Scale State
              <select
                value={weightMismatch}
                onChange={(e) => setWeightMismatch(e.target.value)}
                className="w-full py-2 px-3 border border-border rounded-lg bg-bg-dark text-[#e6edf3] font-medium outline-none focus:border-accent text-xs"
              >
                <option value="none">Scale match (Expected weight)</option>
                <option value="mismatch">Scale variance (Weight mismatch)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              <div className="flex justify-between">
                <span>Checkout Hour</span>
                <span className="text-[#e6edf3] font-bold">{formatHour(hourOfDay)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="23" 
                value={hourOfDay} 
                onChange={(e) => setHourOfDay(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-bg-dark rounded appearance-none cursor-pointer accent-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              <div className="flex justify-between">
                <span>Product Categories</span>
                <span className="text-[#e6edf3] font-bold">{categoryDiversity}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max={Math.min(itemCount, 8)} 
                value={categoryDiversity} 
                onChange={(e) => setCategoryDiversity(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-bg-dark rounded appearance-none cursor-pointer accent-accent"
              />
            </label>

            <button
              type="submit"
              disabled={simulationLoading || !isOnline}
              className="mt-2 py-2.5 bg-accent text-[#0f1419] hover:bg-accent/90 border-0 rounded-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide"
            >
              {simulationLoading ? 'Analyzing...' : 'Analyze Transaction'}
            </button>
          </form>

          {simulationError && (
            <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg text-xs mt-4">
              {simulationError}
            </div>
          )}

          {/* Simulation Output Card */}
          {simulationResult && (
            <div className="mt-5 p-4 rounded-lg bg-bg-dark/40 border border-border animate-fade-in flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[0.6rem] text-muted font-bold uppercase">Assessment</span>
                  <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase ${
                    simulationResult.mlFlagged ? 'bg-error/10 text-error border border-error/20' : 'bg-success/10 text-success border border-success/20'
                  }`}>
                    {simulationResult.mlFlagged ? 'FLAGGED (MANUAL CHECK)' : 'PASS (LOW RISK)'}
                  </span>
                </div>
                
                {/* Risk score bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Score Probability</span>
                    <span className={simulationResult.mlScore >= 50 ? 'text-error' : 'text-success'}>
                      {simulationResult.mlScore}%
                    </span>
                  </div>
                  <div className="w-full bg-border h-1 rounded overflow-hidden">
                    <div 
                      className={`h-full rounded transition-all duration-500 ${
                        simulationResult.mlScore >= 75 ? 'bg-error' :
                        simulationResult.mlScore >= 50 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${simulationResult.mlScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Risk vectors list */}
                <div className="mb-4">
                  <span className="text-[0.6rem] text-muted font-bold uppercase block mb-1.5">Identified Risk Vectors</span>
                  {getRiskVectors(simulationResult.featuresUsed).length > 0 ? (
                    <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                      {getRiskVectors(simulationResult.featuresUsed).map((vector, idx) => (
                        <li key={idx} className="text-[0.7rem] leading-relaxed flex items-start gap-1.5">
                          <span className="text-warning text-xs inline-block mt-0.5">⚠️</span>
                          <div>
                            <span className="font-semibold text-muted block text-[0.65rem] uppercase">{vector.label}</span>
                            <span className="text-muted">{vector.desc}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[0.7rem] text-muted italic leading-relaxed">
                      No security anomalies identified. Transaction profile fits normal checkout behaviors.
                    </div>
                  )}
                </div>
              </div>

              {/* Side-by-side comparison */}
              <div className="border-t border-border/40 pt-3 grid grid-cols-2 gap-4 text-center">
                <div>
                  <span className="text-[0.55rem] text-muted font-bold uppercase block">Risk Engine Score</span>
                  <span className={`text-base font-bold ${simulationResult.mlScore >= 50 ? 'text-error' : 'text-success'}`}>
                    {simulationResult.mlScore}/100
                  </span>
                </div>
                <div className="border-l border-border/40">
                  <span className="text-[0.55rem] text-muted font-bold uppercase block">Heuristic Rules</span>
                  <span className={`text-base font-bold ${simulationResult.legacyScore >= 50 ? 'text-warning' : 'text-muted'}`}>
                    {simulationResult.legacyScore}/100
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
