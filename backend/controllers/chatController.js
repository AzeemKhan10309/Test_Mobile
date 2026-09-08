import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const normalizeAdminRole = (role) => (role === 'admin' ? 'superadmin' : role);
const isAllowedRole = (role) => {
  const normalized = normalizeAdminRole(String(role || '').trim().toLowerCase());
  return normalized === 'student' || normalized === 'superadmin';
};
export const getChatPartners = asyncHandler(async (req, res) => {
  const myRole = normalizeAdminRole(req.user.role);
    if (!isAllowedRole(myRole)) {
    return res.status(403).json({ success: false, message: 'Chat is only available for students and admins' });
  }

  const query = myRole === 'student'
    ? { role: { $in: ['superadmin', 'admin'] }, isActive: true }
    : { role: 'student', isActive: true };
  const users = await User.find(query).select('name role studentId email').lean();

  const [latestMessages, unreadCounts] = await Promise.all([
    ChatMessage.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', req.user._id] }, '$receiver', '$sender'],
          },
          lastMessageAt: { $first: '$createdAt' },
        },
      },
    ]),
    ChatMessage.aggregate([
      {
        $match: {
          receiver: req.user._id,
          readAt: null,
        },
      },
      {
        $group: {
          _id: '$sender',
          unreadCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const lastMessageAtByUser = new Map(
    latestMessages.map((row) => [String(row._id), row.lastMessageAt])
  );
  const unreadCountByUser = new Map(
    unreadCounts.map((row) => [String(row._id), row.unreadCount])
  );

  const partners = users
    .map((user) => ({
      ...user,
      lastMessageAt: lastMessageAtByUser.get(String(user._id)) || null,
      unreadCount: unreadCountByUser.get(String(user._id)) || 0,
    }))
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });

  res.json({ success: true, data: partners });
});


export const getMessages = asyncHandler(async (req, res) => {
  const myRole = normalizeAdminRole(req.user.role);
    if (!isAllowedRole(myRole)) {
    return res.status(403).json({ success: false, message: 'Chat is only available for students and admins' });
  }

  const partner = await User.findById(req.params.userId).select('role');
  if (!partner) return res.status(404).json({ success: false, message: 'User not found' });

  const validPair =
    (myRole === 'student' && normalizeAdminRole(partner.role) === 'superadmin') ||
        (myRole === 'superadmin' && normalizeAdminRole(partner.role) === 'student');
  if (!validPair) return res.status(403).json({ success: false, message: 'You can only chat between student and admin accounts' });

  const messages = await ChatMessage.find({
    $or: [
      { sender: req.user._id, receiver: req.params.userId },
      { sender: req.params.userId, receiver: req.user._id },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();

  await ChatMessage.updateMany(
    { sender: req.params.userId, receiver: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true, data: messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const myRole = normalizeAdminRole(req.user.role);
    if (!isAllowedRole(myRole)) {
    return res.status(403).json({ success: false, message: 'Chat is only available for students and admins' });
  }

  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  const partner = await User.findById(req.params.userId).select('role name');
  if (!partner) return res.status(404).json({ success: false, message: 'User not found' });

  const validPair =
    (myRole === 'student' && normalizeAdminRole(partner.role) === 'superadmin') ||
        (myRole === 'superadmin' && normalizeAdminRole(partner.role) === 'student');
  if (!validPair) return res.status(403).json({ success: false, message: 'You can only chat between student and admin accounts' });

  const created = await ChatMessage.create({
    sender: req.user._id,
    receiver: req.params.userId,
    message: message.trim(),
  });

  const io = req.app.get('io');
  io.to(`user:${req.params.userId}`).emit('chat_message', {
    _id: created._id,
    sender: req.user._id,
    receiver: req.params.userId,
    message: created.message,
    createdAt: created.createdAt,
  });

  res.status(201).json({ success: true, data: created });
});