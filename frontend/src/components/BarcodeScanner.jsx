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
  const lastScannedRef = useRef('');

  useEffect(() => {
    if (disabled) {
      setStatus('idle');
      return;
    }

    let isMounted = true;
    let html5Qr = null;

    async function doStart() {
      try {
        if (!isMounted) return;
        setStatus('starting');
        setErrorMessage('');
        
        // Wait a brief moment to ensure DOM element is ready (helps with React 18 strict mode unmount/remount)
        await new Promise(r => setTimeout(r, 50));
        if (!isMounted) return;

        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          if (isMounted) {
            setStatus('unavailable');
            setErrorMessage('No camera found');
          }
          return;
        }

        html5Qr = new Html5Qrcode(SCANNER_CONTAINER_ID);
        
        await html5Qr.start(
          { facingMode: 'environment' }, // Better than devices[0].id for mobile
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (!isMounted || !onScan) return;
            if (decodedText && decodedText !== lastScannedRef.current) {
              lastScannedRef.current = decodedText;
              onScan(decodedText);
              setTimeout(() => { lastScannedRef.current = ''; }, 2000);
            }
          },
          () => {} // ignore scan errors
        );
        
        if (isMounted) {
          setStatus('scanning');
        } else {
          // If unmounted while starting, stop it immediately
          html5Qr.stop().catch(() => {});
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Scanner error:', err);
        setStatus(err.name === 'NotAllowedError' ? 'unavailable' : 'error');
        setErrorMessage(err.message || 'Camera access failed');
      }
    }

    doStart();

    return () => {
      isMounted = false;
      if (html5Qr) {
        try {
          // Html5Qrcode.getState() might be available, but blindly calling stop inside a try-catch is safer
          html5Qr.stop().catch(() => {});
        } catch (e) {
          // ignore
        }
      }
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
    <div className="relative w-full max-w-[400px] mx-auto rounded-lg overflow-hidden bg-surface border border-border shadow-md">
      <div id={SCANNER_CONTAINER_ID} className="w-full min-h-[240px]" />
      {status === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm z-10 animate-pulse font-medium">
          Starting camera…
        </div>
      )}
      {status === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
          {/* Laser scanning line */}
          <div className="w-[calc(100%-3rem)] h-[2px] bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.8)] animate-laser absolute left-6"></div>
          
          {/* Scanner framing guide corners */}
          <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-accent"></div>
          <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-accent"></div>
          <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-accent"></div>
          <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-accent"></div>
          
          {/* Top banner overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-accent/20 border border-accent/30 text-accent font-semibold text-[10px] px-2 py-0.5 rounded-full tracking-wider uppercase flex items-center gap-1.5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            Scan Barcode
          </div>
        </div>
      )}
    </div>
  );
}
