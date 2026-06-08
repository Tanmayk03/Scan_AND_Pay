import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { verifyApi } from '../api';

const VERIFY_URL_BASE = import.meta.env.VITE_VERIFY_BASE || (typeof window !== 'undefined' ? window.location.origin : '');

export default function CheckoutQR({ orderId, qrToken, totalPrice, expectedWeightSum, expiresAt, basket = [], onClose }) {
  const [weightInput, setWeightInput] = useState('');
  const [weightResult, setWeightResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verifyUrl = `${VERIFY_URL_BASE}/verify/${qrToken}`;

  async function handleVerifyWeight(e) {
    e.preventDefault();
    const actual = parseFloat(weightInput);
    if (Number.isNaN(actual) || actual < 0) return;
    setLoading(true);
    setWeightResult(null);
    try {
      const res = await verifyApi.weight(qrToken, actual);
      setWeightResult(res);
    } catch (err) {
      setWeightResult({ success: false, match: false, message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const expired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-surface border border-border rounded-lg p-6 max-w-[360px] w-full text-center">
        <h2 className="m-0 mb-1 text-xl">Payment QR</h2>
        <p className="text-muted text-sm mb-4">Show this at the exit or scan to verify</p>
        <div className="p-4 bg-white rounded-lg inline-block mb-4">
          {expired ? (
            <div className="w-[220px] h-[220px] flex items-center justify-center text-error font-semibold">
              Expired
            </div>
          ) : (
            <QRCodeSVG value={verifyUrl} size={220} level="M" includeMargin />
          )}
        </div>
        <p className="text-lg font-bold m-0 mb-1">Total: ₹{totalPrice.toFixed(2)}</p>
        {expectedWeightSum != null && (
          <p className="text-muted text-sm m-0 mb-4">Expected weight: {expectedWeightSum}g</p>
        )}

        <div className="text-left mt-4 pt-4 border-t border-border">
          <h4 className="m-0 mb-2 text-sm">Weight verification (optional)</h4>
          <form onSubmit={handleVerifyWeight} className="flex gap-2 mb-2">
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Actual weight (g)"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-2 py-2 border border-border rounded-md bg-bg-dark text-[#e6edf3]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-white border-0 rounded-md font-semibold"
            >
              Verify
            </button>
          </form>
          {weightResult && (
            <div
              className={
                weightResult.match
                  ? 'text-sm p-2 rounded-md bg-success/20 text-success'
                  : 'text-sm p-2 rounded-md bg-error/20 text-error'
              }
            >
              {weightResult.match ? '✓ Weight OK' : '✗ Weight mismatch'}
              {weightResult.tolerance != null && (
                <span className="block text-muted text-xs mt-1">Tolerance: ±{weightResult.tolerance}g</span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4 print-hidden">
          <button
            type="button"
            className="flex-1 py-3 bg-surface border border-border text-[#e6edf3] rounded-lg font-semibold hover:bg-bg-dark transition-colors"
            onClick={() => window.print()}
          >
            Print Receipt
          </button>
          <button
            type="button"
            className="flex-1 py-3 bg-accent text-white border-0 rounded-lg font-semibold hover:brightness-110 transition-colors"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>

      {/* Hidden printable receipt */}
      <div className="hidden print-receipt p-8 text-black bg-white">
        <h1 className="text-2xl font-bold mb-2">Scan & Pay Receipt</h1>
        <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
        
        <table className="w-full text-left border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {basket.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right">x{item.quantity}</td>
                <td className="py-2 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between font-bold text-xl mb-8">
          <span>Total</span>
          <span>₹{totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex flex-col items-center">
          <QRCodeSVG value={verifyUrl} size={150} level="M" />
          <p className="mt-2 text-sm text-gray-500">Scan to verify</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
