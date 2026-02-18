/**
 * Self-Checkout: scanner, basket, session, checkout flow.
 * - Start session on mount
 * - Add/remove items, log to backend
 * - Checkout: lock basket, create order, show QR
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import BarcodeScanner from '../components/BarcodeScanner';
import Basket from '../components/Basket';
import CheckoutQR from '../components/CheckoutQR';
import { productApi, basketApi, sessionApi, orderApi, networkApi } from '../api';

function buildBasketItem(product, quantity = 1, scanKey = '') {
  return {
    productId: product._id,
    barcode: product.barcode,
    name: product.name,
    price: product.price,
    weight: product.weight,
    quantity,
    scanKey: scanKey || product._id,
  };
}

export default function Checkout() {
  const [sessionId, setSessionId] = useState(null);
  const [basket, setBasket] = useState([]);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [mobileUrl, setMobileUrl] = useState(null);
  const sessionStarted = useRef(false);

  useEffect(() => {
    networkApi.getUrl().then((r) => r.url && setMobileUrl(r.url)).catch(() => {});
  }, []);

  // Start session on mount
  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    sessionApi
      .start()
      .then((res) => {
        setSessionId(res.sessionId);
      })
      .catch((err) => {
        const msg = err.message || 'Failed to start session';
        const hint = err.status === 500 ? ' Ensure the backend is running (cd backend && npm run dev) and MongoDB is available.' : '';
        setError(msg + hint);
      })
      .finally(() => setLoading(false));
  }, []);

  const logBasketAction = useCallback(
    (event, payload) => {
      if (!sessionId) return;
      basketApi.log(event, sessionId, payload).catch(() => {});
    },
    [sessionId]
  );

  const handleScan = useCallback(
    async (barcode) => {
      if (!sessionId || checkoutResult) return;
      setError('');
      try {
        const res = await productApi.getByBarcode(barcode);
        const product = res.product;
        setBasket((prev) => {
          const existing = prev.find((i) => i.productId === product._id);
          let next;
          if (existing) {
            next = prev.map((i) =>
              i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i
            );
          } else {
            next = [...prev, buildBasketItem(product, 1)];
          }
          return next;
        });
        logBasketAction('ADD_ITEM', { barcode, productId: product._id, name: product.name });
      } catch (err) {
        if (err.status === 404) setError('Product not found');
        else setError(err.message || 'Lookup failed');
      }
    },
    [sessionId, checkoutResult, logBasketAction]
  );

  const handleRemove = useCallback(
    (item) => {
      if (checkoutResult) return;
      setBasket((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (!existing) return prev;
        const newQty = existing.quantity - 1;
        logBasketAction('REMOVE_ITEM', { productId: item.productId, name: item.name, quantity: newQty });
        if (newQty <= 0) return prev.filter((i) => i.productId !== item.productId);
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: newQty } : i
        );
      });
    },
    [checkoutResult, logBasketAction]
  );

  const handleCheckout = useCallback(async () => {
    if (!sessionId || basket.length === 0 || checkoutResult) return;
    setCheckoutLoading(true);
    setError('');
    try {
      const items = basket.map((i) => ({ productId: i.productId, quantity: i.quantity }));
      const res = await orderApi.create(sessionId, items);
      setCheckoutResult({
        orderId: res.orderId,
        qrToken: res.qrToken,
        totalPrice: res.totalPrice,
        expectedWeightSum: res.expectedWeightSum,
        expiresAt: res.expiresAt,
        riskScore: res.riskScore,
        flagged: res.flagged,
      });
    } catch (err) {
      setError(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  }, [sessionId, basket, checkoutResult]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const barcode = manualBarcode.trim();
    if (barcode) {
      handleScan(barcode);
      setManualBarcode('');
    }
  };

  const handleCloseQR = () => {
    setCheckoutResult(null);
    setBasket([]);
    sessionApi.start().then((res) => setSessionId(res.sessionId)).catch(() => {});
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 max-w-[900px] mx-auto">
        <div className="flex items-center justify-center min-h-[40vh] text-muted">Starting session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-[900px] mx-auto">
      <header className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="m-0 text-2xl font-bold">Scan & Pay</h1>
        <a href="/admin" className="text-sm text-accent">Admin</a>
      </header>
      {mobileUrl && (
        <p className="text-muted text-sm mb-4">
          Open on phone (Safari): <a href={mobileUrl} className="text-accent break-all" target="_blank" rel="noopener noreferrer">{mobileUrl}</a>
        </p>
      )}

      {error && (
        <div className="bg-error/15 border border-error text-error py-3 px-4 rounded-lg mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <section className="flex flex-col gap-3">
          <BarcodeScanner onScan={handleScan} disabled={!!checkoutResult} />
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Or enter barcode"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              disabled={!!checkoutResult}
              autoComplete="off"
              className="flex-1 py-2.5 px-3 border border-border rounded-lg bg-surface text-[#e6edf3]"
            />
            <button
              type="submit"
              disabled={!!checkoutResult}
              className="py-2.5 px-4 bg-accent text-white border-0 rounded-lg font-semibold"
            >
              Add
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-4">
          <Basket items={basket} onRemove={handleRemove} disabled={!!checkoutResult} />
          <button
            type="button"
            className="w-full py-4 bg-success text-white border-0 rounded-lg text-lg font-bold disabled:bg-border disabled:text-muted disabled:cursor-not-allowed hover:brightness-110"
            onClick={handleCheckout}
            disabled={basket.length === 0 || checkoutLoading}
          >
            {checkoutLoading ? 'Processing…' : 'Checkout'}
          </button>
        </section>
      </div>

      {checkoutResult && (
        <CheckoutQR
          orderId={checkoutResult.orderId}
          qrToken={checkoutResult.qrToken}
          totalPrice={checkoutResult.totalPrice}
          expectedWeightSum={checkoutResult.expectedWeightSum}
          expiresAt={checkoutResult.expiresAt}
          onClose={handleCloseQR}
        />
      )}
    </div>
  );
}
