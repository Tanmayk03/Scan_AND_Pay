import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function OrderDetailModal({ order, onClose }) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!order) return null;

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-success/20 text-success border-success/30';
      case 'CANCELLED':
        return 'bg-error/20 text-error border-error/30';
      default:
        return 'bg-muted/20 text-muted border-border';
    }
  };

  const getRiskBadgeClass = (score) => {
    if (score >= 70) return 'bg-error/25 text-error font-bold border-error/40';
    if (score >= 40) return 'bg-warning/25 text-warning font-semibold border-warning/40';
    return 'bg-success/20 text-success border-success/30';
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-surface border border-border rounded-xl max-w-[750px] w-full max-h-[85vh] flex flex-col shadow-2xl relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex justify-between items-center p-5 border-b border-border">
          <div>
            <h2 className="m-0 text-lg font-bold flex items-center gap-2">
              <span>Order Details</span>
              <code className="text-sm bg-bg-dark px-2 py-0.5 rounded text-accent font-mono">
                {order._id}
              </code>
            </h2>
            <p className="text-xs text-muted m-0 mt-1">
              Checkout Session: <span className="font-mono">{order.sessionId}</span>
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-transparent border-0 text-muted hover:text-white text-2xl leading-none p-1 transition-colors"
            aria-label="Close details"
          >
            &times;
          </button>
        </header>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-bg-dark/60 p-4 rounded-xl border border-border">
            <div>
              <span className="text-xs text-muted block mb-1">Status</span>
              <span className={`inline-block px-2 py-0.5 rounded text-xs border font-medium ${getStatusBadgeClass(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted block mb-1">Risk Score</span>
              <span className={`inline-block px-2 py-0.5 rounded text-xs border font-medium ${getRiskBadgeClass(order.riskScore ?? 0)}`}>
                {order.riskScore ?? 0}%
              </span>
            </div>
            <div>
              <span className="text-xs text-muted block mb-1">Flagged / Checked</span>
              <span className="text-sm font-semibold">
                {order.flagged ? <span className="text-error font-bold">Flagged</span> : 'No'}
                {order.manualCheck && <span className="text-success text-xs font-medium ml-1.5">(Checked)</span>}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted block mb-1">Date Created</span>
              <span className="text-sm font-medium">
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : '–'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-bg-dark/30 p-4 rounded-xl border border-border flex justify-between items-center">
              <div>
                <span className="text-xs text-muted block">Expected Weight</span>
                <span className="text-lg font-bold text-[#e6edf3]">{order.expectedWeightSum}g</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Total Price</span>
                <span className="text-lg font-bold text-success">₹{order.totalPrice?.toFixed(2)}</span>
              </div>
            </div>
            
            {order.manualCheck && (
              <div className="bg-success/5 p-4 rounded-xl border border-success/10 text-sm flex items-center gap-3">
                <span className="text-success text-xl">✓</span>
                <div>
                  <span className="font-semibold block text-success">Manually Checked</span>
                  <span className="text-xs text-muted">
                    Verified at {order.manualCheckedAt ? new Date(order.manualCheckedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="m-0 mb-3 text-sm font-semibold text-muted uppercase tracking-wider">Scanned Items</h3>
            <div className="overflow-hidden border border-border rounded-lg bg-surface">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-bg-dark text-muted font-medium border-b border-border">
                    <th className="py-2.5 px-4 text-left font-semibold">Product</th>
                    <th className="py-2.5 px-4 text-left font-semibold">Barcode</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Weight</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Price</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Qty</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {order.items && order.items.map((item, i) => (
                    <tr key={item.productId || i} className="hover:bg-bg-dark/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-muted">{item.barcode}</td>
                      <td className="py-3 px-4 text-center text-muted">{item.weight}g</td>
                      <td className="py-3 px-4 text-right">₹{item.price?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center font-semibold">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-bold text-accent">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                  {(!order.items || order.items.length === 0) && (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-muted">No items in this order.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-border flex justify-end gap-3 bg-bg-dark/20">
          <button 
            type="button" 
            onClick={onClose} 
            className="py-2 px-4 bg-transparent border border-border text-[#e6edf3] rounded-md text-sm hover:bg-bg-dark font-medium transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
