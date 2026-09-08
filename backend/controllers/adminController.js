import { z } from 'zod';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Test from '../models/Test.js';
import Submission from '../models/Submission.js';
import Course from '../models/Course.js';
import Result from '../models/results.js';
import Announcement from '../models/Announcement.js';
import Attendance from '../models/Attendance.js';
import Mark from '../models/Mark.js';
import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Leave from '../models/Leave.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import ChatMessage from '../models/ChatMessage.js';
import GroupMember from '../models/GroupMember.js';
import GroupMessage from '../models/GroupMessage.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const teacherPayloadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().trim(),
  password: z.string().min(6).optional(),
});
const phoneField = z.string().trim().regex(/^[+\d][\d\s().-]{6,24}$/, 'phone number must be valid').optional().or(z.literal(''));

const bulkStudentEntrySchema = z.object({
  studentId: z.string().trim().min(1, 'studentId is required').max(64),
  name: z.string().trim().min(2, 'name must be at least 2 characters').max(120),
  password: z.string().min(6, 'password must be at least 6 characters').max(128),
    personalPhone: phoneField,
  guardianPhone: phoneField,
  area: z.string().trim().max(120, 'area must be at most 120 characters').optional().or(z.literal('')),
});

const studentUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  gender: z.enum(['male', 'female']).optional(),
  personalPhone: phoneField,
  guardianPhone: phoneField,
  area: z.string().trim().max(120).optional().or(z.literal('')),
});

const bulkStudentDeleteSchema = z.object({
  studentIds: z.array(z.string().trim().min(1)).min(1),
  mode: z.enum(['soft', 'hard']).default('soft'),
  confirmationText: z.string().trim().min(1),
  hardDeleteAcknowledged: z.boolean().optional(),
});

const normalizeStudentEntry = (entry) => ({
  studentId: String(entry.studentId || entry.StudentID || entry.student_id || entry.id || '').toUpperCase().trim(),
  name: String(entry.name || entry.Name || '').trim(),
  password: String(entry.password || entry.Password || '').trim(),
  personalPhone: String(entry.personalPhone || entry.PersonalPhone || entry.personal_phone || entry.studentPersonalNumber || '').trim(),
  guardianPhone: String(entry.guardianPhone || entry.GuardianPhone || entry.guardian_phone || entry.guardianNumber || '').trim(),
  area: String(entry.area || entry.Area || entry.location || entry.Location || '').trim(),
});

const parseBulkStudentFile = (file) => {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  return rows.map(normalizeStudentEntry);
};

const createAuditLog = async ({ actorId, action, targetCount, metadata = {} }) => {
  await AuditLog.create({ actor: actorId, action, targetCount, metadata });
};

export const getAdminStats = asyncHandler(async (req, res) => {
  const [students, teachers, courses, tests, submissions] = await Promise.all([
    User.countDocuments({ role: 'student', deletedAt: null }),
    User.countDocuments({ role: 'teacher' }),
    Course.countDocuments(),
    Test.countDocuments(),
    Submission.find({ status: { $in: ['submitted', 'graded', 'reviewed'] } }).select('percentage isPassed createdAt').lean(),
  ]);

  const averagePerformance = submissions.length
    ? Number((submissions.reduce((sum, row) => sum + (row.percentage || 0), 0) / submissions.length).toFixed(2))
    : 0;
  const passCount = submissions.filter((row) => row.isPassed).length;
  const failCount = submissions.length - passCount;

  const performanceTimeline = Object.values(
    submissions.reduce((acc, row) => {
      const key = new Date(row.createdAt).toISOString().slice(0, 10);
      if (!acc[key]) acc[key] = { date: key, total: 0, count: 0 };
      acc[key].total += row.percentage || 0;
      acc[key].count += 1;
      return acc;
    }, {})
  )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({ date: item.date, average: Number((item.total / item.count).toFixed(2)) }));

  const courseWiseRaw = await Result.aggregate([
    {
      $group: {
        _id: '$testId',
        obtained: { $sum: '$marksObtained' },
        total: { $sum: '$totalMarks' },
      },
    },
    {
      $project: {
        performance: {
          $cond: [{ $eq: ['$total', 0] }, 0, { $multiply: [{ $divide: ['$obtained', '$total'] }, 100] }],
        },
      },
    },
  ]);

  const testsById = new Map((await Test.find({ _id: { $in: courseWiseRaw.map((row) => row._id).filter(Boolean) } }).select('title').lean())
    .map((test) => [test._id.toString(), test.title]));

  const courseWisePerformance = courseWiseRaw
    .map((row) => ({
      name: row._id ? (testsById.get(row._id.toString()) || 'Untitled Test') : 'Unlinked Result',
      performance: Number((row.performance || 0).toFixed(2)),
    }))
    .slice(0, 10);

  res.json({
    success: true,
    data: {
      totalStudents: students,
      totalTeachers: teachers,
      totalCourses: courses,
      totalTests: tests,
      averagePerformance,
      passCount,
      failCount,
      passFailRatio: failCount === 0 ? (passCount ? passCount : 0) : Number((passCount / failCount).toFixed(2)),
      charts: {
        performanceTimeline,
        courseWisePerformance,
        passVsFail: [
          { name: 'Pass', value: passCount },
          { name: 'Fail', value: failCount },
        ],
      },
    },
  });
});

export const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: teachers });
});

export const createTeacher = asyncHandler(async (req, res) => {
  const parsed = teacherPayloadSchema.extend({ password: z.string().min(6) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });

  const email = parsed.data.email.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

  const teacher = await User.create({ ...parsed.data, email, role: 'teacher', isActive: true });
  res.status(201).json({ success: true, data: teacher.toSafeObject() });
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const parsed = teacherPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });

  const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('+password');
  if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

  teacher.name = parsed.data.name;
  teacher.email = parsed.data.email.toLowerCase();
  if (parsed.data.password) teacher.password = parsed.data.password;
  await teacher.save();

  res.json({ success: true, data: teacher.toSafeObject() });
});

export const deleteTeacher = asyncHandler(async (req, res) => {
  await User.deleteOne({ _id: req.params.id, role: 'teacher' });
  await Course.updateMany({ teacher: req.params.id }, { $unset: { teacher: '' } });
  res.json({ success: true, message: 'Teacher deleted' });
});

export const getTeacherProfile = asyncHandler(async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).lean();
  if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });

  const [courses, marksSummary] = await Promise.all([
    Course.find({ teacher: req.params.id }).select('courseName courseCode students').lean(),
    Result.aggregate([
      { $match: { createdBy: teacher._id } },
      { $group: { _id: null, obtained: { $sum: '$marksObtained' }, total: { $sum: '$totalMarks' }, count: { $sum: 1 } } },
    ]),
  ]);

  const totalStudents = courses.reduce((sum, row) => sum + row.students.length, 0);
  const avgMarks = marksSummary[0]?.total
    ? Number(((marksSummary[0].obtained / marksSummary[0].total) * 100).toFixed(2))
    : 0;
  const completionRate = courses.length
    ? Number(((courses.filter((c) => c.students.length > 0).length / courses.length) * 100).toFixed(2))
    : 0;

  res.json({
    success: true,
    data: {
      teacher,
      courses,
      metrics: {
        averageStudentMarks: avgMarks,
        courseCompletionRate: completionRate,
        assignedCourses: courses.length,
        totalStudents,
      },
    },
  });
});

export const getAdminCourses = asyncHandler(async (req, res) => {
  const { teacherId } = req.query;
  const query = teacherId ? { teacher: teacherId } : {};
  const courses = await Course.find(query)
    .populate('teacher', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: courses });
});

export const assignTeacherToCourse = asyncHandler(async (req, res) => {
  const { teacherId } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  if (teacherId) {
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    course.teacher = teacherId;
  } else {
    course.teacher = null;
  }

  await course.save();
  res.json({ success: true, data: course });
});

export const enrollStudentManual = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.body;
  const [student, course] = await Promise.all([
    User.findOne({ _id: studentId, role: 'student', deletedAt: null }),
    Course.findById(courseId),
  ]);

  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  if (course.students.some((id) => id.toString() === studentId)) {
    return res.status(400).json({ success: false, message: 'Student already enrolled' });
  }

  course.students.push(student._id);
  await course.save();
  res.status(201).json({ success: true, message: 'Student enrolled successfully' });
});

export const enrollStudentBulk = asyncHandler(async (req, res) => {
  const { courseId, studentIds = [] } = req.body;
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  const uniqueIds = [...new Set(studentIds.map((id) => String(id).trim()).filter(Boolean))];
  const objectIdCandidates = uniqueIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  const students = await User.find({
    role: 'student',
    deletedAt: null,
    $or: [
      { _id: { $in: objectIdCandidates } },
      { studentId: { $in: uniqueIds } },
    ],
  }).select('_id studentId').lean();

  const existing = new Set(course.students.map((id) => id.toString()));
  const toAdd = students.map((student) => student._id.toString()).filter((id) => !existing.has(id));

  if (toAdd.length) {
    course.students.push(...toAdd);
    await course.save();
  }

  const matchedInputs = new Set();
  students.forEach((student) => {
    matchedInputs.add(student._id.toString());
    if (student.studentId) matchedInputs.add(String(student.studentId));
  });

  const notFound = uniqueIds.filter((id) => !matchedInputs.has(id));

  res.json({
    success: true,
    data: {
      requested: uniqueIds.length,
      enrolled: toAdd.length,
      skippedDuplicates: students.length - toAdd.length,
      notFoundCount: notFound.length,
      notFound,
    },
  });
});

export const bulkAddStudents = asyncHandler(async (req, res) => {
  let parsedBodyStudents = req.body?.students;
  if (typeof req.body?.students === 'string') {
    try {
      parsedBodyStudents = JSON.parse(req.body.students || '[]');
    } catch {
      return res.status(400).json({ success: false, message: 'students must be valid JSON array' });
    }
  }
  const bodyEntries = Array.isArray(parsedBodyStudents) ? parsedBodyStudents : [];
  const fileEntries = req.file ? parseBulkStudentFile(req.file) : [];
  const mergedEntries = [...bodyEntries, ...fileEntries].map(normalizeStudentEntry);

  if (!mergedEntries.length) {
    return res.status(400).json({ success: false, message: 'Provide students[] or upload CSV/Excel file' });
  }

  const failedEntries = [];
  const validEntries = [];
  const seenStudentIds = new Set();

  mergedEntries.forEach((entry, index) => {
    const parsed = bulkStudentEntrySchema.safeParse(entry);
    if (!parsed.success) {
      failedEntries.push({ index, entry, reason: parsed.error.issues[0]?.message || 'Invalid student record' });
      return;
    }

    if (seenStudentIds.has(parsed.data.studentId)) {
      failedEntries.push({ index, entry, reason: 'Duplicate studentId in request payload' });
      return;
    }
    seenStudentIds.add(parsed.data.studentId);
    validEntries.push(parsed.data);
  });

  const existingIds = new Set(
    (await User.find({ studentId: { $in: validEntries.map((entry) => entry.studentId) } }).select('studentId').lean())
      .map((row) => row.studentId)
  );

  const created = [];
  for (const [index, entry] of validEntries.entries()) {
    if (existingIds.has(entry.studentId)) {
      failedEntries.push({ index, entry, reason: 'Student account already exists' });
      continue;
    }

    try {
      const student = await User.create({
        name: entry.name,
        studentId: entry.studentId,
        password: entry.password,
        role: 'student',
        gender: 'male',
        personalPhone: entry.personalPhone || null,
        guardianPhone: entry.guardianPhone || null,
        area: entry.area || null,
        isActive: true,
      });
      created.push(student._id.toString());
    } catch (error) {
      failedEntries.push({ index, entry, reason: error?.message || 'Unable to create student' });
    }
  }

  if (created.length) {
    await createAuditLog({
      actorId: req.user._id,
      action: 'students.bulk_add',
      targetCount: created.length,
      metadata: {
        source: req.file ? 'file_upload' : 'manual',
        uploadedFile: req.file?.originalname,
        failedCount: failedEntries.length,
      },
    });
  }

  res.status(201).json({
    success: true,
    data: {
      totalReceived: mergedEntries.length,
      successCount: created.length,
      failedCount: failedEntries.length,
      failedEntries,
    },
  });
});

export const bulkDeleteStudents = asyncHandler(async (req, res) => {
  const parsed = bulkStudentDeleteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid request' });
  }

  const { studentIds, mode, confirmationText, hardDeleteAcknowledged } = parsed.data;
  if (confirmationText !== 'DELETE_STUDENTS') {
    return res.status(400).json({ success: false, message: 'Invalid confirmation text' });
  }

  if (mode === 'hard' && !hardDeleteAcknowledged) {
    return res.status(400).json({ success: false, message: 'Hard delete acknowledgement is required' });
  }

  const uniqueIds = [...new Set(studentIds.map((id) => String(id).trim()).filter(Boolean))];
  const objectIds = uniqueIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const normalizedStudentCodes = uniqueIds.map((id) => id.toUpperCase());

  const students = await User.find({
    role: 'student',
    $or: [
      { _id: { $in: objectIds } },
      { studentId: { $in: normalizedStudentCodes } },
    ],
  }).select('_id name studentId deletedAt').lean();

const studentsByObjectId = new Map(students.map((row) => [row._id.toString(), row]));
  const studentsByStudentId = new Map(students.map((row) => [String(row.studentId || '').toUpperCase(), row]));
  const result = { successCount: 0, failedEntries: [] };
  const deletedStudentIds = [];

  for (const requestedId of uniqueIds) {
    const student = studentsByObjectId.get(requestedId) || studentsByStudentId.get(requestedId.toUpperCase());
        if (!student) {
      result.failedEntries.push({ studentId: requestedId, reason: 'Student not found' });
      continue;
    }

    const [submittedCount, inProgressCount] = await Promise.all([
      Submission.countDocuments({ student: student._id, status: { $in: ['submitted', 'graded', 'reviewed'] } }),
      Submission.countDocuments({ student: student._id, status: 'in_progress' }),
    ]);

    if (inProgressCount > 0) {
      result.failedEntries.push({ studentId: student.studentId, reason: 'Student has in-progress tests' });
      continue;
    }

    if (mode === 'hard') {
      if (submittedCount > 0) {
        result.failedEntries.push({ studentId: student.studentId, reason: 'Permanent delete is blocked because submitted tests exist' });
        continue;
      }
    } else {
      if (student.deletedAt) {
        result.failedEntries.push({ studentId: student.studentId, reason: 'Student already soft-deleted' });
        continue;
      }
    }

       deletedStudentIds.push(student._id.toString());
  }

  const runHardDeleteCascade = async (ids, session) => {
    await Promise.all([
      Submission.deleteMany({ student: { $in: ids } }, { session }),
      Result.deleteMany({ studentId: { $in: ids } }, { session }),
      Mark.deleteMany({ student: { $in: ids } }, { session }),
      AssignmentSubmission.deleteMany({ student: { $in: ids } }, { session }),
      Leave.deleteMany({ student: { $in: ids } }, { session }),
      Notification.deleteMany({ recipient: { $in: ids } }, { session }),
      ChatMessage.deleteMany({ $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }] }, { session }),
      GroupMember.deleteMany({ userId: { $in: ids } }, { session }),
      GroupMessage.deleteMany({ senderId: { $in: ids } }, { session }),
      User.deleteMany({ _id: { $in: ids }, role: 'student' }, { session }),
      Course.updateMany(
        { students: { $in: ids } },
        { $pull: { students: { $in: ids } } },
        { session }
      ),
      Attendance.updateMany(
        { 'students.studentId': { $in: ids } },
        { $pull: { students: { studentId: { $in: ids } } } },
        { session }
      ),
      Announcement.updateMany(
        { readBy: { $in: ids } },
        { $pull: { readBy: { $in: ids } } },
        { session }
      ),
      GroupMessage.updateMany(
        { readBy: { $in: ids } },
        { $pull: { readBy: { $in: ids } } },
        { session }
      ),
    ]);
  };

  if (deletedStudentIds.length && mode === 'hard') {
    const session = await mongoose.startSession();
    let handledInBatchTransaction = false;
    try {
      await session.withTransaction(async () => {
        await runHardDeleteCascade(deletedStudentIds, session);
      });
      handledInBatchTransaction = true;
      result.successCount += deletedStudentIds.length;
    } catch (error) {
      console.error('Bulk hard delete batch transaction failed. Falling back to per-student deletes.', error);
    } finally {
      await session.endSession();
    }

    if (!handledInBatchTransaction) {
      for (const studentObjectId of deletedStudentIds) {
        const oneSession = await mongoose.startSession();
        try {
          await oneSession.withTransaction(async () => {
            await runHardDeleteCascade([studentObjectId], oneSession);
          });
          result.successCount += 1;
        } catch (error) {
          const student = students.find((row) => row._id.toString() === studentObjectId);
          result.failedEntries.push({
            studentId: student?.studentId || studentObjectId,
            reason: 'Hard delete transaction failed',
          });
          console.error(`Hard delete failed for student ${studentObjectId}:`, error);
        } finally {
          await oneSession.endSession();
        }
      }
    }
  }

  if (deletedStudentIds.length && mode === 'soft') {
    const softDeleteResult = await User.updateMany(
      {
        _id: { $in: deletedStudentIds },
        role: 'student',
        deletedAt: null,
      },
      { $set: { isActive: false, deletedAt: new Date(), deletedBy: req.user._id } }
    );
    await Course.updateMany(
      { students: { $in: deletedStudentIds } },
      { $pull: { students: { $in: deletedStudentIds } } }
    );
    result.successCount += softDeleteResult.modifiedCount || 0;
  }

  if (result.successCount) {
    await createAuditLog({
      actorId: req.user._id,
      action: mode === 'hard' ? 'students.bulk_delete.hard' : 'students.bulk_delete.soft',
      targetCount: result.successCount,
      metadata: {
        failedCount: result.failedEntries.length,
      },
    });
  }

  res.json({
    success: true,
    data: {
      requested: uniqueIds.length,
      successCount: result.successCount,
      failedCount: result.failedEntries.length,
      failedEntries: result.failedEntries,
    },
  });
});

export const getStudents = asyncHandler(async (req, res) => {
const students = await User.find({ role: 'student', deletedAt: null })
    .select('name studentId email gender personalPhone guardianPhone area')
    .sort({ createdAt: -1 })
    .lean();  res.json({ success: true, data: students });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const parsed = studentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid student update payload' });
  }

  const updates = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  );

  if (Object.prototype.hasOwnProperty.call(updates, 'personalPhone') && updates.personalPhone === '') updates.personalPhone = null;
  if (Object.prototype.hasOwnProperty.call(updates, 'guardianPhone') && updates.guardianPhone === '') updates.guardianPhone = null;
  if (Object.prototype.hasOwnProperty.call(updates, 'area') && updates.area === '') updates.area = null;

  const student = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'student', deletedAt: null },
    { $set: updates },
    { new: true, runValidators: true }
  ).select('name studentId email gender personalPhone guardianPhone area');

  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  res.json({ success: true, data: student.toSafeObject(), message: 'Student updated successfully' });
});

export const getAdminResults = asyncHandler(async (req, res) => {
  const { studentId, courseId, testType } = req.query;
  const query = {};
  if (studentId) query.studentId = studentId;
  if (testType) query.type = testType;
  if (courseId) {
    const course = await Course.findById(courseId).select('students').lean();
    query.studentId = { $in: course?.students || [] };
  }

  const rows = await Result.find(query)
    .populate('studentId', 'name studentId')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  res.json({ success: true, data: rows });
});

export const updateAdminResult = asyncHandler(async (req, res) => {
  const updated = await Result.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Result not found' });
  res.json({ success: true, data: updated });
});

export const deleteAdminResult = asyncHandler(async (req, res) => {
  await Result.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Result deleted' });
});

export const createAdminAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, targetType, courseId, teacherId } = req.body;
  if (!title || !message || !targetType) {
    return res.status(400).json({ success: false, message: 'title, message and targetType are required' });
  }

  if (targetType === 'all') {
    const courses = await Course.find().select('_id').lean();
    await Announcement.insertMany(courses.map((course) => ({ title, message, course: course._id, createdBy: req.user._id })));
  } else if (targetType === 'course') {
    await Announcement.create({ title, message, course: courseId, createdBy: req.user._id });
  } else if (targetType === 'teacher') {
    const courses = await Course.find({ teacher: teacherId }).select('_id').lean();
    await Announcement.insertMany(courses.map((course) => ({ title, message, course: course._id, createdBy: req.user._id })));
  } else {
    return res.status(400).json({ success: false, message: 'Invalid targetType' });
  }

  res.status(201).json({ success: true, message: 'Announcement sent' });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;
  const query = role ? { role } : {};
  const users = await User.find(query).skip((page - 1) * limit).limit(Number(limit)).sort({ createdAt: -1 });
  const total = await User.countDocuments(query);
  res.json({ success: true, data: users.map((u) => u.toSafeObject()), total });
});

export const createUser = asyncHandler(async (req, res) => {
   const { name, email, studentId, password, role, gender, personalPhone, guardianPhone, area } = req.body;
  const normalizedRole = String(role || '').toLowerCase().trim();

  if (!name || !password || !normalizedRole) {
    return res.status(400).json({ success: false, message: 'Name, role, and password are required' });
  }

  if (!['superadmin', 'teacher', 'student'].includes(normalizedRole)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  if (normalizedRole === 'student') {
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required for student accounts' });
    }
    if (!['male', 'female'].includes(String(gender || '').toLowerCase().trim())) {
      return res.status(400).json({ success: false, message: 'Gender must be male or female for student accounts' });
    }
  } else if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required for teacher/admin accounts' });
  }

  const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
  const normalizedStudentId = studentId ? studentId.toUpperCase().trim() : undefined;

  if (normalizedEmail) {
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  if (normalizedStudentId) {
    const studentExists = await User.findOne({ studentId: normalizedStudentId });
    if (studentExists) return res.status(409).json({ success: false, message: 'Student ID already registered' });
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    studentId: normalizedStudentId,
    password,
    role: normalizedRole,
    gender: normalizedRole === 'student' ? String(gender).toLowerCase().trim() : undefined,
    personalPhone: normalizedRole === 'student' && personalPhone ? String(personalPhone).trim() : undefined,
    guardianPhone: normalizedRole === 'student' && guardianPhone ? String(guardianPhone).trim() : undefined,
    area: normalizedRole === 'student' && area ? String(area).trim() : undefined,
    isActive: true,
  });

  res.status(201).json({ success: true, data: user.toSafeObject(), message: 'User created successfully' });
});

export const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, data: { isActive: user.isActive } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});

export const deleteAdminCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  const assignmentIds = (await Assignment.find({ course: req.params.id }).select('_id').lean()).map((a) => a._id);

  await Promise.all([
    Attendance.deleteMany({ course: req.params.id }),
    Mark.deleteMany({ course: req.params.id }),
    Announcement.deleteMany({ course: req.params.id }),
    Leave.deleteMany({ course: req.params.id }),
    AssignmentSubmission.deleteMany({ assignment: { $in: assignmentIds } }),
    Assignment.deleteMany({ course: req.params.id }),
    Course.deleteOne({ _id: req.params.id }),
  ]);

  res.json({ success: true, message: 'Course and related data deleted' });
});
