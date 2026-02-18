/**
 * Public endpoint to get this machine's local network URL (for opening app on phone).
 */
import os from 'os';

/** GET /api/network-url - Returns { url } e.g. http://192.168.1.5:3000 */
export function getNetworkUrl(req, res) {
  const port = process.env.FRONTEND_PORT || 3000;
  let ip = null;
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
    if (ip) break;
  }
  const url = ip ? `http://${ip}:${port}` : null;
  res.json({ url, ip, port });
}
