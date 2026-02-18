/**
 * Shared types for API responses and app state.
 */

export interface Product {
  _id: string;
  barcode: string;
  name: string;
  price: number;
  weight: number;
  unit?: string;
  category?: string;
  active?: boolean;
}

export interface BasketItem {
  productId: string;
  barcode: string;
  name: string;
  price: number;
  weight: number;
  quantity: number;
  scanKey?: string;
}

export interface OrderItem {
  productId: string;
  barcode: string;
  name: string;
  price: number;
  weight: number;
  quantity: number;
  subtotal: number;
  weightTotal: number;
}

export interface Order {
  _id: string;
  sessionId: string;
  items: OrderItem[];
  totalPrice: number;
  expectedWeightSum: number;
  qrToken?: string;
  expiresAt?: string;
  status: 'LOCKED' | 'PAID' | 'CANCELLED';
  verified?: boolean;
  verifiedAt?: string;
  riskScore?: number;
  flagged?: boolean;
  manualCheck?: boolean;
  manualCheckedAt?: string;
  manualCheckedBy?: string;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'exitGuard';
  name?: string;
}

export interface ApiError extends Error {
  status?: number;
  data?: Record<string, unknown>;
}

export interface SystemConfig {
  weightToleranceGrams: number;
  weightTolerancePercent: number;
  randomCheckPercent: number;
  riskThreshold: number;
}

export interface AuditLog {
  _id: string;
  event: string;
  sessionId?: string;
  orderId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
}

export interface VerificationLog {
  _id: string;
  orderId: string | Order;
  type: 'qr' | 'weight';
  expectedWeight?: number;
  actualWeight?: number;
  tolerance?: number;
  match?: boolean;
  createdAt?: string;
}
