// users.js
import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(authenticate);

router.get('/profile', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: user.toSafeObject() });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const allowed = ['name', 'darkMode', 'language', 'personalPhone', 'guardianPhone', 'area'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
if (req.user.role !== 'student') {
    delete updates.personalPhone;
    delete updates.guardianPhone;
    delete updates.area;
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: user.toSafeObject() });
}));

router.put('/change-password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!await user.comparePassword(currentPassword)) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
}));

export default router;
