import crypto from 'crypto';
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import GroupMessage from '../models/GroupMessage.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const ensureStudent = (req, res) => {
  if (req.user.role !== 'student') {
    res.status(403).json({ success: false, message: 'Only students can access group communication' });
    return false;
  }
  return true;
};

const requireActiveMembership = async (groupId, userId) => {
  return GroupMember.findOne({ groupId, userId, status: 'active' });
};

export const createGroup = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { groupName, description = '', createdBy, joinMode = 'invite' } = req.body;
  if (!groupName?.trim()) {
    return res.status(400).json({ success: false, message: 'groupName is required' });
  }

  if (createdBy && String(createdBy) !== String(req.user._id)) {
    return res.status(400).json({ success: false, message: 'createdBy must match the authenticated student' });
  }

  const inviteCode = crypto.randomBytes(6).toString('hex');
  const group = await Group.create({
    name: groupName.trim(),
    description: String(description || '').trim(),
    createdBy: req.user._id,
    joinMode: joinMode === 'approval' ? 'approval' : 'invite',
    inviteCode,
  });

  await GroupMember.create({ groupId: group._id, userId: req.user._id, role: 'admin', status: 'active' });

  res.status(201).json({
    success: true,
    data: {
      id: group._id,
      name: group.name,
      description: group.description,
      createdBy: group.createdBy,
      createdAt: group.createdAt,
            inviteCode: group.inviteCode,
      inviteLink: `/api/join-group?inviteCode=${group.inviteCode}`,
      joinMode: group.joinMode,
    },
  });
});

export const joinGroup = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { groupId, inviteCode } = req.body;
  const group = groupId
    ? await Group.findById(groupId)
    : await Group.findOne({ inviteCode: String(inviteCode || '').trim() });

  if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

  const existing = await GroupMember.findOne({ groupId: group._id, userId: req.user._id });
  if (existing?.status === 'active') {
    return res.status(200).json({ success: true, message: 'Already a member', data: existing });
  }

  const wantsInviteJoin = inviteCode && inviteCode === group.inviteCode;
  const status = group.joinMode === 'approval' && !wantsInviteJoin ? 'pending' : 'active';

  const member = await GroupMember.findOneAndUpdate(
    { groupId: group._id, userId: req.user._id },
    {
      $set: { status, role: 'member' },
      $setOnInsert: { groupId: group._id, userId: req.user._id },
    },
    { new: true, upsert: true }
  );

  if (status === 'pending') {
    return res.status(202).json({ success: true, message: 'Join request sent for admin approval', data: member });
  }

  res.status(200).json({ success: true, message: 'Joined group successfully', data: member });
});

export const getGroupMessages = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { groupId } = req.params;
  const member = await requireActiveMembership(groupId, req.user._id);
  if (!member) {
    return res.status(403).json({ success: false, message: 'Only group members can read messages' });
  }

const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const query = { groupId };
  if (cursor && !Number.isNaN(cursor.getTime())) {
    query.createdAt = { $lt: cursor };
  }

  const messages = await GroupMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  await GroupMessage.updateMany(
    { groupId, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );

 const normalizedMessages = messages.reverse();
  const nextCursor = normalizedMessages.length > 0 ? normalizedMessages[0].createdAt : null;
  res.json({ success: true, data: normalizedMessages, nextCursor });
});

export const getMyGroups = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const memberships = await GroupMember.find({ userId: req.user._id, status: 'active' })
    .populate('groupId', 'name description createdBy createdAt inviteCode')
        .lean();

  const groups = memberships
    .filter((item) => item.groupId)
    .map((item) => ({
      id: item.groupId._id,
      name: item.groupId.name,
      description: item.groupId.description,
      createdBy: item.groupId.createdBy,
      createdAt: item.groupId.createdAt,
      role: item.role,
      inviteCode: item.role === 'admin' ? item.groupId.inviteCode : undefined,
      inviteLink: item.role === 'admin' ? `/api/join-group?inviteCode=${item.groupId.inviteCode}` : undefined,
    }));

  res.json({ success: true, data: groups });
});

export const getGroupMembers = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { groupId } = req.params;
  const member = await requireActiveMembership(groupId, req.user._id);
  if (!member) {
    return res.status(403).json({ success: false, message: 'Only group members can view members list' });
  }

  const members = await GroupMember.find({ groupId, status: 'active' })
    .populate('userId', 'name studentId email')
    .lean();

  const response = members
    .filter((item) => item.userId)
    .map((item) => ({
      userId: item.userId._id,
      name: item.userId.name,
      studentId: item.userId.studentId,
      email: item.userId.email,
      role: item.role,
      status: item.status,
    }));

  res.json({ success: true, data: response });
});

export const sendGroupMessage = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { groupId, message } = req.body;
  if (!groupId) return res.status(400).json({ success: false, message: 'groupId is required' });
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'message is required' });

  const member = await requireActiveMembership(groupId, req.user._id);
  if (!member) {
    return res.status(403).json({ success: false, message: 'Only group members can send messages' });
  }

  const created = await GroupMessage.create({
    groupId,
    senderId: req.user._id,
    message: message.trim(),
    readBy: [req.user._id],
  });

  const io = req.app.get('io');
  io.to(`group:${groupId}`).emit('group_message', {
    id: created._id,
    senderId: created.senderId,
    groupId: created.groupId,
    message: created.message,
    timestamp: created.createdAt,
  });

  res.status(201).json({
    success: true,
    data: {
      id: created._id,
      senderId: created.senderId,
      groupId: created.groupId,
      message: created.message,
      timestamp: created.createdAt,
    },
  });
});

export const addGroupMember = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { groupId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

  const adminMembership = await GroupMember.findOne({ groupId, userId: req.user._id, role: 'admin', status: 'active' });
  if (!adminMembership) return res.status(403).json({ success: false, message: 'Only group admin can add members' });

  const member = await GroupMember.findOneAndUpdate(
    { groupId, userId },
    { $set: { role: 'member', status: 'active' }, $setOnInsert: { groupId, userId } },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, data: member });
});

export const removeGroupMember = asyncHandler(async (req, res) => {
  if (!ensureStudent(req, res)) return;

  const { groupId, userId } = req.params;

  const adminMembership = await GroupMember.findOne({ groupId, userId: req.user._id, role: 'admin', status: 'active' });
  if (!adminMembership) return res.status(403).json({ success: false, message: 'Only group admin can remove members' });

  await GroupMember.deleteOne({ groupId, userId });
  res.json({ success: true, message: 'Member removed' });
});