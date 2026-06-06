import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api';

export default function AdminAudit() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.auditLogs({ limit: 100 });
      setAuditLogs(res.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const tableClass = 'w-full border-collapse text-sm';
  const thTdClass = 'py-2 px-3 text-left border-b border-border';
  const thClass = thTdClass + ' text-muted font-semibold';

  return (
    <section className="animate-fade-in">
      <h2 className="m-0 mb-4 text-lg font-semibold">Audit Logs</h2>
      
      {error && (
        <div className="flex justify-between items-center bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-4" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} className="bg-transparent border-0 text-inherit text-xl py-0 px-1">×</button>
        </div>
      )}

      {loading && !auditLogs.length ? <p className="text-muted">Loading...</p> : (
        <div className="overflow-x-auto bg-surface rounded-lg border border-border">
          <table className={tableClass}>
            <thead>
              <tr className="bg-bg-dark">
                <th className={thClass}>Event</th>
                <th className={thClass}>Session</th>
                <th className={thClass}>Order</th>
                <th className={thClass}>Payload</th>
                <th className={thClass}>Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-bg-dark/50 transition-colors">
                  <td className={thTdClass}>
                    <span className="bg-border px-2 py-1 rounded text-xs font-mono">{log.event}</span>
                  </td>
                  <td className={thTdClass}><code className="text-[0.85em]">{log.sessionId?.slice(0, 8)}…</code></td>
                  <td className={thTdClass}><code className="text-[0.85em]">{log.orderId?.slice(-8) || '-'}</code></td>
                  <td className={`${thTdClass} max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap`}>
                    <code className="text-[0.8em] text-muted">{JSON.stringify(log.payload || {})}</code>
                  </td>
                  <td className={thTdClass}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '–'}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-muted">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
