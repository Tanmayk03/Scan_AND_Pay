/**
 * Admin/auth: login and JWT issuance.
 */
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import User from '../models/User.js';

export function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expire }
  );
}

export async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase().trim(), active: true }).select('+password');
  if (!user) return null;
  const valid = await user.comparePassword(password);
  if (!valid) return null;
  const token = generateToken(user);
  return { user: { id: user._id, email: user.email, role: user.role, name: user.name }, token };
}
