/**
 * Seed script: create default admin user and sample products.
 * Run: node src/scripts/seed.js (with MONGODB_URI set)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';

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

  await mongoose.disconnect();
  console.log('Seed done.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
