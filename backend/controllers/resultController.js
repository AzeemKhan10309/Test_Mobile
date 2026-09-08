import { z } from '../utils/zod.js';
import Result from '../models/results.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const RESULT_TYPES = ['assignment', 'quiz', 'mid', 'final', 'participation'];

const resultPayloadSchema = z.object({
  studentId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(180),
  type: z.enum(RESULT_TYPES),
  marksObtained: z.number().min(0),
  totalMarks: z.number().min(1),
  date: z.string().datetime().optional(),
});

const updatePayloadSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  type: z.enum(RESULT_TYPES).optional(),
  marksObtained: z.number().min(0).optional(),
  totalMarks: z.number().min(1).optional(),
  date: z.string().datetime().optional(),
});

const ensureStudent = async (studentId) => {
  const student = await User.findOne({ _id: studentId, role: 'student' }).select('_id');
  return Boolean(student);
};

const buildSummary = (results = []) => {
  const grouped = RESULT_TYPES.reduce((acc, type) => {
    acc[type] = { items: [], totalObtained: 0, totalMarks: 0, averagePercentage: 0 };
    return acc;
  }, {});

  results.forEach((item) => {
    grouped[item.type].items.push(item);
    grouped[item.type].totalObtained += item.marksObtained;
    grouped[item.type].totalMarks += item.totalMarks;
  });

  RESULT_TYPES.forEach((type) => {
    const bucket = grouped[type];
    bucket.averagePercentage = bucket.totalMarks > 0
      ? Number(((bucket.totalObtained / bucket.totalMarks) * 100).toFixed(2))
      : 0;
  });

  const overallObtained = results.reduce((sum, row) => sum + row.marksObtained, 0);
  const overallTotal = results.reduce((sum, row) => sum + row.totalMarks, 0);

  return {
    categories: grouped,
    overall: {
      totalObtained: overallObtained,
      totalMarks: overallTotal,
      performance: overallTotal > 0 ? Number(((overallObtained / overallTotal) * 100).toFixed(2)) : 0,
    },
  };
};

export const getStudentResults = asyncHandler(async (req, res) => {
  const requestedId = req.params.id === 'me' ? req.user._id.toString() : req.params.id;
  const isOwner = requestedId.toString() === req.user._id.toString();
  const canManage = ['teacher', 'superadmin', 'admin'].includes(req.user.role);

  if (!isOwner && !canManage) {
    return res.status(403).json({ success: false, message: 'Not allowed to access these results' });
  }

  const results = await Result.find({ studentId: requestedId })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  res.json({ success: true, data: { results, summary: buildSummary(results) } });
});

export const createResult = asyncHandler(async (req, res) => {
  if (!['teacher', 'superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only teacher/admin can create results' });
  }

  const parsed = resultPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  if (parsed.data.marksObtained > parsed.data.totalMarks) {
    return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed total marks' });
  }

  const studentExists = await ensureStudent(parsed.data.studentId);
  if (!studentExists) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const result = await Result.create({
    ...parsed.data,
    date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: result });
});

export const updateResult = asyncHandler(async (req, res) => {
  if (!['teacher', 'superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only teacher/admin can update results' });
  }

  const parsed = updatePayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const current = await Result.findById(req.params.id);
  if (!current) return res.status(404).json({ success: false, message: 'Result not found' });

  const nextMarks = parsed.data.marksObtained ?? current.marksObtained;
  const nextTotal = parsed.data.totalMarks ?? current.totalMarks;
  if (nextMarks > nextTotal) {
    return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed total marks' });
  }

  const updated = await Result.findByIdAndUpdate(
    req.params.id,
    { ...parsed.data, date: parsed.data.date ? new Date(parsed.data.date) : undefined },
    { new: true }
  );

  res.json({ success: true, data: updated });
});

export const deleteResult = asyncHandler(async (req, res) => {
  if (!['teacher', 'superadmin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only teacher/admin can delete results' });
  }

  const deleted = await Result.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'Result not found' });

  res.json({ success: true, message: 'Result deleted successfully' });
});
