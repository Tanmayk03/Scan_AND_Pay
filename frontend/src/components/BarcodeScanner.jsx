/**
 * Reusable barcode scanner using html5-qrcode.
 * - Live camera preview
 * - Returns barcode value via onScan callback
 * - Graceful fallback if camera not available
 */
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_CONTAINER_ID = 'barcode-scanner-container';

export default function BarcodeScanner({ onScan, disabled = false }) {
  const [status, setStatus] = useState('idle'); // idle | starting | scanning | error | unavailable
  const [errorMessage, setErrorMessage] = useState('');
  const scannerRef = useRef(null);
  const startedRef = useRef(false); // true only after start() has completed successfully
  const lastScannedRef = useRef('');

  function safeStop(instance) {
    if (!instance || typeof instance.stop !== 'function') return;
    try {
      const p = instance.stop();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {
      // "Cannot stop, scanner is not running or paused" when start() never completed
    }
  }

  useEffect(() => {
    if (disabled) {
      if (scannerRef.current && startedRef.current) {
        safeStop(scannerRef.current);
        startedRef.current = false;
      }
      scannerRef.current = null;
      setStatus('idle');
      return;
    }

    let mounted = true;
    startedRef.current = false;
    const html5Qr = new Html5Qrcode(SCANNER_CONTAINER_ID);

    async function doStart() {
      try {
        setStatus('starting');
        setErrorMessage('');
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setStatus('unavailable');
          setErrorMessage('No camera found');
          return;
        }
        if (!mounted) return;
        const cameraId = devices[0].id;
        await html5Qr.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (!mounted || !onScan) return;
            if (decodedText && decodedText !== lastScannedRef.current) {
              lastScannedRef.current = decodedText;
              onScan(decodedText);
              setTimeout(() => { lastScannedRef.current = ''; }, 2000);
            }
          },
          () => {}
        );
        if (!mounted) return;
        startedRef.current = true;
        scannerRef.current = html5Qr;
        setStatus('scanning');
      } catch (err) {
        if (!mounted) return;
        console.error('Scanner error:', err);
        setStatus(err.name === 'NotAllowedError' ? 'unavailable' : 'error');
        setErrorMessage(err.message || 'Camera access failed');
      }
    }

    doStart();
    return () => {
      mounted = false;
      if (startedRef.current) {
        safeStop(html5Qr);
        startedRef.current = false;
      }
      scannerRef.current = null;
      setStatus('idle');
    };
  }, [disabled, onScan]);

  if (disabled) {
    return (
      <div className="relative w-full max-w-[400px] mx-auto rounded-lg overflow-hidden bg-surface border border-border min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
        <p>Scanner paused</p>
      </div>
    );
  }

  if (status === 'unavailable' || status === 'error') {
    return (
      <div className="relative w-full max-w-[400px] mx-auto rounded-lg overflow-hidden bg-surface border border-border min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
        <p>Camera not available</p>
        {errorMessage && <p className="text-error text-sm mt-1">{errorMessage}</p>}
        <p className="text-muted text-xs mt-2">Use a device with a camera or enter barcode manually.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[400px] mx-auto rounded-lg overflow-hidden bg-surface border border-border">
      <div id={SCANNER_CONTAINER_ID} className="w-full min-h-[240px]" />
      {status === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
          Starting camera…
        </div>
      )}
    </div>
  );
}
