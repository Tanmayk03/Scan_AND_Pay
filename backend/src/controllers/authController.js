/**
 * Auth: login, return JWT.
 */
import * as authService from '../services/authService.js';

/** POST /api/auth/login */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const result = await authService.login(email, password);
    if (!result) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me - Current user (protected) */
export async function me(req, res, next) {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: { id: user._id, email: user.email, role: user.role, name: user.name },
    });
  } catch (err) {
    next(err);
  }
}
