/**
 * Seed script: create default admin user and sample products.
 * Run: node src/scripts/seed.js (with MONGODB_URI set)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import VerificationLog from '../models/VerificationLog.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scanpay';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@scanpay.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Prices in ₹ (rupees)
const sampleProducts = [
  { barcode: '5901234123457', name: 'Milk 1L', price: 65, weight: 1030, category: 'Dairy' },
  { barcode: '5901234123458', name: 'Bread White', price: 40, weight: 400, category: 'Bakery' },
  { barcode: '5901234123459', name: 'Water 0.5L', price: 20, weight: 520, category: 'Beverages' },
  { barcode: '5901234123460', name: 'Apple', price: 30, weight: 180, category: 'Fruit' },
  { barcode: '5901234123461', name: 'Chocolate Bar', price: 50, weight: 100, category: 'Snacks' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (!existingAdmin) {
    await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      name: 'Admin',
    });
    console.log('Created admin user:', ADMIN_EMAIL);
  } else {
    console.log('Admin user already exists');
  }

  for (const p of sampleProducts) {
    await Product.findOneAndUpdate({ barcode: p.barcode }, p, { upsert: true });
  }
  console.log('Sample products upserted:', sampleProducts.length);

  // Seed sample orders & verification logs if they don't exist
  const orderCount = await Order.countDocuments();
  if (orderCount < 10) {
    console.log('Seeding mock orders and verification logs...');
    
    const dbProducts = await Product.find({ active: true });
    const statusChoices = ['PAID', 'LOCKED', 'CANCELLED'];
    
    for (let i = 0; i < 35; i++) {
      const orderItems = [];
      const numProducts = Math.floor(Math.random() * 4) + 1;
      let totalPrice = 0;
      let expectedWeightSum = 0;
      
      const shuffledProducts = [...dbProducts].sort(() => Math.random() - 0.5);
      for (let j = 0; j < Math.min(numProducts, shuffledProducts.length); j++) {
        const product = shuffledProducts[j];
        const qty = Math.floor(Math.random() * 2) + 1;
        const subtotal = product.price * qty;
        const weightTotal = product.weight * qty;
        
        orderItems.push({
          productId: product._id,
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          weight: product.weight,
          quantity: qty,
          subtotal,
          weightTotal,
        });
        totalPrice += subtotal;
        expectedWeightSum += weightTotal;
      }
      
      const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
      const qrToken = 'qr_' + Math.random().toString(36).substr(2, 9);
      const status = statusChoices[Math.floor(Math.random() * statusChoices.length)];
      
      const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const avgScanTime = Math.random() * 20 + 5;
      const scanDurationSeconds = Math.round(itemCount * avgScanTime);
      
      const isSuspect = Math.random() < 0.15;
      const riskScore = isSuspect 
        ? Math.floor(Math.random() * 50) + 50
        : Math.floor(Math.random() * 40);
        
      const flagged = riskScore >= 50;
      const verified = status === 'PAID';
      
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 7));
      
      const order = await Order.create({
        sessionId,
        items: orderItems,
        totalPrice,
        expectedWeightSum,
        scanDurationSeconds,
        qrToken,
        expiresAt: new Date(createdAt.getTime() + 10 * 60 * 1000),
        status,
        verified,
        verifiedAt: verified ? new Date(createdAt.getTime() + 3 * 60 * 1000) : null,
        riskScore,
        flagged,
        createdAt,
        updatedAt: createdAt
      });

      if (verified) {
        await VerificationLog.create({
          orderId: order._id,
          type: 'qr',
          createdAt: new Date(createdAt.getTime() + 2 * 60 * 1000),
        });
      }

      if (Math.random() < 0.8) {
        const hasMatch = Math.random() < 0.9;
        const tolerance = Math.max(10, expectedWeightSum * 0.03);
        const actualWeight = hasMatch 
          ? expectedWeightSum + (Math.random() * tolerance * 2 - tolerance) * 0.8
          : expectedWeightSum + tolerance * (Math.random() * 2 + 1.2);
          
        await VerificationLog.create({
          orderId: order._id,
          type: 'weight',
          expectedWeight: expectedWeightSum,
          actualWeight: Math.round(actualWeight),
          tolerance: Math.round(tolerance),
          match: hasMatch,
          createdAt: new Date(createdAt.getTime() + 2 * 60 * 1000),
        });

        if (!hasMatch) {
          order.riskScore = Math.min(100, order.riskScore + 30);
          order.flagged = order.riskScore >= 50;
          await order.save();
        }
      }
    }
    console.log('Seeded mock orders and verification logs successfully.');
  }

  await mongoose.disconnect();
  console.log('Seed done.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
