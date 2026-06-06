import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api';

export default function AdminFlagged() {
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.flagged();
      setFlagged(res.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlagged();
  }, [loadFlagged]);

  const tableClass = 'w-full border-collapse text-sm';
  const thTdClass = 'py-2 px-3 text-left border-b border-border';
  const thClass = thTdClass + ' text-muted font-semibold';

  return (
    <section className="animate-fade-in">
      <h2 className="m-0 mb-4 text-lg font-semibold">Flagged Orders</h2>
      
      {error && (
        <div className="flex justify-between items-center bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-4" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} className="bg-transparent border-0 text-inherit text-xl py-0 px-1">×</button>
        </div>
      )}

      {loading && !flagged.length ? <p className="text-muted">Loading...</p> : (
        <div className="overflow-x-auto bg-surface rounded-lg border border-border">
          <table className={tableClass}>
            <thead>
              <tr className="bg-bg-dark">
                <th className={thClass}>ID</th>
                <th className={thClass}>Total</th>
                <th className={thClass}>Risk</th>
                <th className={thClass}>Manual check</th>
                <th className={thClass}>Created</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((o) => (
                <tr key={o._id} className="hover:bg-bg-dark/50 transition-colors">
                  <td className={thTdClass}><code className="text-[0.85em]">{o._id?.slice(-8)}</code></td>
                  <td className={thTdClass}>₹{o.totalPrice?.toFixed(2)}</td>
                  <td className={thTdClass}>
                    <span className="text-error font-bold">{o.riskScore ?? 0}</span>
                  </td>
                  <td className={thTdClass}>{o.manualCheck ? 'Yes' : 'No'}</td>
                  <td className={thTdClass}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '–'}</td>
                </tr>
              ))}
              {flagged.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-muted">No flagged orders.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
