import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api';

export default function AdminConfig() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const res = await adminApi.getConfig();
      setConfig(res.config || {});
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!config) return;
    setSuccess('');
    setError('');
    try {
      const res = await adminApi.setConfig(config);
      setConfig(res.config);
      setSuccess('Configuration saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!config) return <p className="text-muted">Loading config...</p>;

  return (
    <section className="animate-fade-in">
      <h2 className="m-0 mb-4 text-lg font-semibold">System Configuration</h2>
      
      {error && (
        <div className="flex justify-between items-center bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-4" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} className="bg-transparent border-0 text-inherit text-xl py-0 px-1">×</button>
        </div>
      )}

      {success && (
        <div className="flex justify-between items-center bg-success/15 border border-success text-success py-3 px-4 rounded-lg mb-4" role="alert">
          {success}
          <button type="button" onClick={() => setSuccess('')} className="bg-transparent border-0 text-inherit text-xl py-0 px-1">×</button>
        </div>
      )}

      <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 max-w-md bg-surface p-6 rounded-lg border border-border">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Weight Tolerance (g)
          <input
            type="number"
            min="0"
            value={config.weightToleranceGrams ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, weightToleranceGrams: parseInt(e.target.value, 10) || 0 }))}
            className="py-2.5 px-3 border border-border rounded-md bg-bg-dark text-[#e6edf3] focus:border-accent outline-none transition-colors"
          />
        </label>
        
        <label className="flex flex-col gap-2 text-sm font-medium">
          Weight Tolerance (%)
          <input
            type="number"
            min="0"
            step="0.1"
            value={config.weightTolerancePercent ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, weightTolerancePercent: parseFloat(e.target.value) || 0 }))}
            className="py-2.5 px-3 border border-border rounded-md bg-bg-dark text-[#e6edf3] focus:border-accent outline-none transition-colors"
          />
        </label>
        
        <label className="flex flex-col gap-2 text-sm font-medium">
          Risk Threshold (0–100)
          <input
            type="number"
            min="0"
            max="100"
            value={config.riskThreshold ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, riskThreshold: parseInt(e.target.value, 10) || 0 }))}
            className="py-2.5 px-3 border border-border rounded-md bg-bg-dark text-[#e6edf3] focus:border-accent outline-none transition-colors"
          />
        </label>
        
        <label className="flex flex-col gap-2 text-sm font-medium">
          Random Check Probability (%)
          <input
            type="number"
            min="0"
            max="100"
            value={config.randomCheckPercent ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, randomCheckPercent: parseInt(e.target.value, 10) || 0 }))}
            className="py-2.5 px-3 border border-border rounded-md bg-bg-dark text-[#e6edf3] focus:border-accent outline-none transition-colors"
          />
        </label>

        <button type="submit" className="mt-2 py-3 px-4 bg-accent text-white border-0 rounded-md font-semibold transition-transform active:scale-95">
          Save Configuration
        </button>
      </form>
    </section>
  );
}
