import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function PaymentModal({ total, onSuccess, onClose }) {
  const [method, setMethod] = useState(null); // 'upi' | 'card'
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    if (!method) return;
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      onSuccess();
    }, 2000);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl p-6 max-w-[400px] w-full shadow-2xl relative">
        <div className="flex justify-between items-center mb-6 border-b border-border pb-3">
          <h2 className="m-0 text-xl font-bold">Checkout Payment</h2>
          {!processing && (
            <button type="button" onClick={onClose} className="bg-transparent border-0 text-muted hover:text-white text-2xl leading-none p-1">
              &times;
            </button>
          )}
        </div>

        <div className="text-center mb-6">
          <p className="text-muted text-sm mb-1 m-0">Total Amount Payable</p>
          <p className="text-3xl font-bold text-success m-0">₹{total.toFixed(2)}</p>
        </div>

        {processing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-muted border-t-accent rounded-full animate-spin mb-4"></div>
            <p className="font-semibold text-lg">Processing Payment...</p>
            <p className="text-sm text-muted">Please do not close this window.</p>
          </div>
        ) : (
          <>
            <p className="font-semibold mb-3">Select Payment Method</p>
            <div className="flex flex-col gap-3 mb-6">
              <button
                type="button"
                className={`py-3 px-4 rounded-lg border text-left flex justify-between items-center transition-colors ${method === 'upi' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-dark border-border text-[#e6edf3] hover:border-accent/50'}`}
                onClick={() => setMethod('upi')}
              >
                <span className="font-semibold">UPI (Google Pay, PhonePe)</span>
                {method === 'upi' && <span>✓</span>}
              </button>
              <button
                type="button"
                className={`py-3 px-4 rounded-lg border text-left flex justify-between items-center transition-colors ${method === 'card' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg-dark border-border text-[#e6edf3] hover:border-accent/50'}`}
                onClick={() => setMethod('card')}
              >
                <span className="font-semibold">Credit / Debit Card</span>
                {method === 'card' && <span>✓</span>}
              </button>
            </div>

            <button
              type="button"
              className="w-full py-3.5 bg-success text-white border-0 rounded-lg text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              disabled={!method}
              onClick={handlePay}
            >
              Pay Now
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
