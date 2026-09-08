import { z } from '../utils/zod.js';

import Announcement from '../models/Announcement.js';
import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Attendance from '../models/Attendance.js';
import Course from '../models/Course.js';
import Leave from '../models/Leave.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const toIdString = (value) => {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : String(value);
};

const sameId = (left, right) => toIdString(left) !== '' && toIdString(left) === toIdString(right);
const toUTCDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const ensureCourseForTeacher = async (courseId, teacherId) => {
  const course = await Course.findById(courseId);
  if (!course) return null;
  if (!sameId(course?.teacher, teacherId)) return false;
    return course;
};

const ensureCourseForStudent = async (courseId, studentId) => {
  const course = await Course.findById(courseId);
  if (!course) return null;
  if (!course.students.some((id) => sameId(id, studentId))) return false;
    return course;
};

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(180),
  message: z.string().trim().min(3).max(3000),
  courseId: z.string().trim().min(1),
});
const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  message: z.string().trim().min(3).max(3000).optional(),
});
const createAssignmentSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(3).max(3000),
  courseId: z.string().trim().min(1),
  deadline: z.string().datetime(),
  totalMarks: z.number().min(1).max(1000),
});

const submitAssignmentSchema = z.object({
  assignmentId: z.string().trim().min(1),
  fileUrl: z.string().url(),
  text: z.string().trim().max(3000).optional(),
});

const gradeSubmissionSchema = z.object({
  marks: z.number().min(0),
  feedback: z.string().trim().max(2000).optional(),
});

const applyLeaveSchema = z.object({
  courseId: z.string().trim().min(1),
  date: z.string().min(1),
  reason: z.string().trim().min(3).max(1000),
  proofImage: z.string().url(),
});

const updateLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const parsed = createAnnouncementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const { title, message, courseId } = parsed.data;
  const course = await ensureCourseForTeacher(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only assigned teacher can create announcements' });

  const announcement = await Announcement.create({
    title,
    message,
    course: courseId,
    createdBy: req.user._id,
  });

  req.app.get('io')?.to(`course:${courseId}`).emit('announcement:new', {
        _id: announcement._id,
    courseId,
        createdBy: req.user._id,
    title: announcement.title,
    message: announcement.message,
    createdAt: announcement.createdAt,
  });
  req.app.get('io')?.to(`course:${courseId}`).emit('new-announcement', {
    _id: announcement._id,
    courseId,
    createdBy: req.user._id,
    title: announcement.title,
    message: announcement.message,
    createdAt: announcement.createdAt,
        isRead: false,
  });

  res.status(201).json({ success: true, data: announcement });
});

export const getCourseAnnouncements = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course =
    req.user.role === 'student'
      ? await ensureCourseForStudent(courseId, req.user._id)
      : await ensureCourseForTeacher(courseId, req.user._id);

  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Not allowed to view announcements for this course' });

  const announcements = await Announcement.find({ course: courseId })
    .sort({ createdAt: -1 })
    .select('title message createdAt readBy createdBy');
  res.json({
    success: true,
    data: announcements.map((a) => ({
      _id: a._id,
            courseId,
      title: a.title,
      message: a.message,
            createdBy: a.createdBy,
      createdAt: a.createdAt,
      isRead: a.readBy.some((id) => sameId(id, req.user._id)),    })),
  });
});

export const markAnnouncementRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findById(id);
  if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

  const course = await ensureCourseForStudent(announcement.course, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Not allowed' });

  await Announcement.updateOne({ _id: id }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true, message: 'Announcement marked as read' });
});

export const createAssignment = asyncHandler(async (req, res) => {
  const parsed = createAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const { title, description, courseId, deadline, totalMarks } = parsed.data;
  const parsedDeadline = new Date(deadline);
  if (Number.isNaN(parsedDeadline.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid deadline value' });
  }
  if (parsedDeadline.getTime() <= Date.now()) {
    return res.status(400).json({ success: false, message: 'Deadline must be a future date/time' });
  }
  const course = await ensureCourseForTeacher(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only assigned teacher can create assignments' });

  const assignment = await Assignment.create({
    title,
    description,
    course: courseId,
    deadline: parsedDeadline,
    totalMarks,
    createdBy: req.user._id,
  });

  req.app.get('io')?.to(`course:${courseId}`).emit('assignment:new', {
    courseId,
    title: assignment.title,
    deadline: assignment.deadline,
  });

  res.status(201).json({ success: true, data: assignment });
});
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parsed = updateAnnouncementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }
  if (parsed.data.title === undefined && parsed.data.message === undefined) {
    return res.status(400).json({ success: false, message: 'At least one field is required' });
  }

  const announcement = await Announcement.findById(id);
  if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

  const course = await ensureCourseForTeacher(announcement.course, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only assigned teacher can update announcements' });

  if (parsed.data.title !== undefined) announcement.title = parsed.data.title;
  if (parsed.data.message !== undefined) announcement.message = parsed.data.message;
  await announcement.save();

  res.json({
    success: true,
    data: {
      _id: announcement._id,
      courseId: announcement.course,
      title: announcement.title,
      message: announcement.message,
      createdBy: announcement.createdBy,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    },
  });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const announcement = await Announcement.findById(id);
  if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

  const course = await ensureCourseForTeacher(announcement.course, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only assigned teacher can delete announcements' });

  await Announcement.deleteOne({ _id: id });
  res.json({ success: true, message: 'Announcement deleted' });
});
export const getCourseAssignments = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course =
    req.user.role === 'student'
      ? await ensureCourseForStudent(courseId, req.user._id)
      : await ensureCourseForTeacher(courseId, req.user._id);

  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Not allowed to view assignments for this course' });

  const assignments = await Assignment.find({ course: courseId }).sort({ deadline: 1 }).lean();

  if (req.user.role !== 'student') return res.json({ success: true, data: assignments });

  const submissions = await AssignmentSubmission.find({
    assignment: { $in: assignments.map((a) => a._id) },
    student: req.user._id,
  }).select('assignment submittedAt marks feedback');

  const submissionMap = new Map(submissions.map((s) => [toIdString(s?.assignment), s]));
    const serverNow = Date.now();
  res.json({
    success: true,
    data: assignments.map((assignment) => ({
      ...assignment,
 canSubmit:
        new Date(assignment.deadline).getTime() > serverNow &&
        !submissionMap.get(toIdString(assignment?._id)),
         submission: submissionMap.get(toIdString(assignment?._id)) || null,
        })),
  });
});

export const submitAssignment = asyncHandler(async (req, res) => {
  const parsed = submitAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const { assignmentId, fileUrl, text } = parsed.data;
    const serverNow = new Date();
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

  const course = await ensureCourseForStudent(assignment.course, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only enrolled students can submit' });

if (new Date(assignment.deadline).getTime() <= serverNow.getTime()) {
    return res.status(403).json({ success: false, message: 'Deadline passed. Submission not allowed.' });
  }

const assignmentStillOpen = await Assignment.findOne({
    _id: assignmentId,
    deadline: { $gt: serverNow },
  }).select('_id');

  if (!assignmentStillOpen) {
    return res.status(403).json({ success: false, message: 'Deadline passed. Submission not allowed.' });
  }

  let submission;
  try {
    submission = await AssignmentSubmission.create({
      assignment: assignmentId,
      student: req.user._id,
      fileUrl,
      text: text || '',
      submittedAt: serverNow,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Submission already exists for this assignment' });
    }
    throw error;
  }

  res.status(201).json({ success: true, data: submission });
});

export const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

  const course = await ensureCourseForTeacher(assignment.course, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only assigned teacher can view submissions' });

  const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
    .populate('student', 'name studentId')
    .sort({ submittedAt: -1 });

  res.json({ success: true, data: submissions });
});

export const gradeAssignmentSubmission = asyncHandler(async (req, res) => {
  const parsed = gradeSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const { submissionId } = req.params;
  const submission = await AssignmentSubmission.findById(submissionId).populate('assignment');
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

  const course = await ensureCourseForTeacher(submission.assignment.course, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only assigned teacher can grade submissions' });

  if (parsed.data.marks > submission.assignment.totalMarks) {
    return res.status(400).json({ success: false, message: `Marks cannot exceed total marks (${submission.assignment.totalMarks})` });
  }

  submission.marks = parsed.data.marks;
  submission.feedback = parsed.data.feedback;
  await submission.save();

  res.json({ success: true, data: submission });
});

export const applyLeave = asyncHandler(async (req, res) => {
  const parsed = applyLeaveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const { courseId, date, reason, proofImage } = parsed.data;
  const course = await ensureCourseForStudent(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only enrolled students can apply for leave' });

  const normalizedDate = toUTCDate(date);
  if (!normalizedDate) return res.status(400).json({ success: false, message: 'Invalid leave date' });

  const leave = await Leave.findOneAndUpdate(
    { student: req.user._id, course: courseId, date: normalizedDate },
    { student: req.user._id, course: courseId, date: normalizedDate, reason, proofImage, status: 'pending' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ success: true, data: leave });
});

export const getLeaveRequests = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  const filter = {};

  if (req.user.role === 'student') {
    filter.student = req.user._id;
  }

  if (courseId) {
    const course =
      req.user.role === 'student'
        ? await ensureCourseForStudent(courseId, req.user._id)
        : await ensureCourseForTeacher(courseId, req.user._id);
    if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course === false) return res.status(403).json({ success: false, message: 'Not allowed to view leave requests for this course' });
    filter.course = courseId;
  } else if (req.user.role !== 'student') {
    const teacherCourses = await Course.find({ teacher: req.user._id }).select('_id');
    filter.course = { $in: teacherCourses.map((course) => course._id) };
  }

  const leaves = await Leave.find(filter)
    .populate('student', 'name studentId')
    .populate('course', 'courseName courseCode')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: leaves });
});

export const updateLeaveStatus = asyncHandler(async (req, res) => {
  const parsed = updateLeaveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  }

  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

  const course = await ensureCourseForTeacher(leave.course, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only assigned teacher can update leave status' });

  leave.status = parsed.data.status;
  await leave.save();

  if (leave.status === 'approved') {
   const attendance = await Attendance.findOne({ course: leave.course, date: leave.date });
    if (!attendance) {
      await Attendance.create({
        course: leave.course,
        date: leave.date,
        students: [{ studentId: leave.student, status: 'present' }],
        markedBy: course.teacher,
      });
    } else {
      const existing = attendance.students.find((entry) => String(entry.studentId) === String(leave.student));
      if (existing) {
        existing.status = 'present';
      } else {
        attendance.students.push({ studentId: leave.student, status: 'present' });
      }
      attendance.markedBy = course.teacher;
      await attendance.save();
    }


    req.app.get('io')?.to(`user:${leave.student.toString()}`).emit('leave:approved', {
      leaveId: leave._id,
      course: leave.course,
      date: leave.date,
    });
  }

  res.json({ success: true, data: leave });
});
