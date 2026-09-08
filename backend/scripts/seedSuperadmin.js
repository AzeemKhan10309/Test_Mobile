import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/database.js';
import User from '../models/User.js';

const run = async () => {
  const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;
  if (!SUPERADMIN_NAME || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    throw new Error('SUPERADMIN_NAME, SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required');
  }
  await connectDB();
  const existingSuperadmin = await User.countDocuments({ role: 'superadmin' });
  if (existingSuperadmin > 0) {
    console.log('Superadmin already exists. Seed skipped.');
    process.exit(0);
  }
  await User.create({
    name: SUPERADMIN_NAME,
    email: SUPERADMIN_EMAIL.toLowerCase(),
    password: SUPERADMIN_PASSWORD,
    role: 'superadmin',
    isEmailVerified: true,
  });
  console.log('Superadmin seeded successfully.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});