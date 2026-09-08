import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import Course from '../models/Course.js';
import Attendance from '../models/Attendance.js';
import Mark from '../models/Mark.js';
import Announcement from '../models/Announcement.js';
import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Leave from '../models/Leave.js';
import User from '../models/User.js';
import Test from '../models/Test.js';
import Submission from '../models/Submission.js';
import Result from '../models/results.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const MARK_TYPES = ['assignment', 'quiz', 'mid_exam', 'final_exam', 'participation'];
const MARK_TYPE_LABELS = {
  assignment: 'Assignments',
  quiz: 'Quizzes',
  mid_exam: 'Mid Exams',
  final_exam: 'Final Exams',
  participation: 'Class Participation',
};
const LEGACY_MARK_TYPE_MAP = {
  assignment: 'assignment',
  assignments: 'assignment',
  test: 'quiz',
  tests: 'quiz',
  quiz: 'quiz',
  quizzes: 'quiz',
  mid: 'mid_exam',
  midterm: 'mid_exam',
  midterms: 'mid_exam',
  'mid exam': 'mid_exam',
  mid_exam: 'mid_exam',
    'mid-exam': 'mid_exam',
  final: 'final_exam',
  finals: 'final_exam',
  'final exam': 'final_exam',
  final_exam: 'final_exam',
    'final-exam': 'final_exam',
  participation: 'participation',
  'class participation': 'participation',
    class_participation: 'participation',
};
const toIdString = (value) => {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? value : String(value);
};
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const sameId = (left, right) => toIdString(left) !== '' && toIdString(left) === toIdString(right);
const normalizeDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
};
const buildDayRange = (value) => {
  const start = normalizeDate(value);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};
const validateAttendanceRows = (attendance, enrolledStudentIds) => {
  if (!Array.isArray(attendance) || attendance.length === 0) {
    return { error: 'Attendance must be a non-empty array' };
  }

  const cleanRows = [];
  const seenStudents = new Set();

  for (const item of attendance) {
    if (!item || typeof item !== 'object') return { error: 'Each attendance row must be an object' };

    const studentId = String(item.studentId || '');
    if (!studentId || !OBJECT_ID_REGEX.test(studentId)) {
      return { error: 'Each attendance row requires a valid studentId' };
    }

    if (!enrolledStudentIds.has(studentId)) {
      return { error: `Student ${item.studentId} is not enrolled in this course` };
    }

    if (seenStudents.has(studentId)) {
      return { error: `Duplicate attendance row found for student ${studentId}` };
    }
    seenStudents.add(studentId);

    if (!['present', 'absent'].includes(item.status)) {
      return { error: `Invalid attendance status for student ${studentId}` };
    }

    cleanRows.push({ student: studentId, status: item.status });
  }
  if (seenStudents.size !== enrolledStudentIds.size) {
    return {
      error: `Attendance must include all enrolled students (${enrolledStudentIds.size} expected, ${seenStudents.size} received)`,
    };
  }
  return { cleanRows };
};
const mapAttendanceRecordsForResponse = (attendanceDoc) => {
  if (!attendanceDoc) return [];
return (attendanceDoc.students || [])
    .filter((entry) => entry?.studentId)
    .map((entry) => ({
      student: entry.studentId,
      status: entry.status || 'absent',
      date: attendanceDoc.date,
      course: attendanceDoc.course,
      markedBy: attendanceDoc.markedBy,
    }));
};
const buildCourseCode = (courseName) => {
  const base = (courseName || 'CRS').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CRS';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${suffix}`;
};

const ensureTeacherCourse = async (courseId, teacherId) => {
  const course = await Course.findById(courseId);
  if (!course) return null;
  if (!sameId(course.teacher, teacherId)) return false;
  return course;
};
export const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { courseName, description, classType } = req.body;

  const course = await ensureTeacherCourse(id, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can update course' });

  if (courseName !== undefined) course.courseName = String(courseName).trim();
  if (description !== undefined) course.description = String(description).trim();
  if (classType !== undefined) {
    if (!['male', 'female', 'mixed'].includes(classType)) {
      return res.status(400).json({ success: false, message: 'Invalid class type' });
    }
    course.classType = classType;
  }

  await course.save();
  res.json({ success: true, data: course });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const course = await ensureTeacherCourse(id, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can delete course' });

  const assignmentIds = (await Assignment.find({ course: id }).select('_id').lean()).map((a) => a._id);

  await Promise.all([
    Attendance.deleteMany({ course: id }),
    Mark.deleteMany({ course: id }),
    Announcement.deleteMany({ course: id }),
    Leave.deleteMany({ course: id }),
    AssignmentSubmission.deleteMany({ assignment: { $in: assignmentIds } }),
    Assignment.deleteMany({ course: id }),
    Course.deleteOne({ _id: id }),
  ]);

  res.json({ success: true, message: 'Course and related data deleted' });
});
const buildAttendanceMetrics = (attendanceRows, studentId) => {
  if (!attendanceRows.length) return { presentDays: 0, totalDays: 0, attendancePercent: 0 };
const totalDays = attendanceRows.length;
  const presentDays = attendanceRows.filter((row) =>
    (row.students || []).some((entry) => sameId(entry?.studentId, studentId) && entry?.status === 'present')
  ).length;
  const attendancePercent = totalDays > 0 ? Number(((presentDays / totalDays) * 100).toFixed(2)) : 0;
  return { presentDays, totalDays, attendancePercent };
};
const calculateAttendancePercent = (attendanceRows, studentId) => {
  return buildAttendanceMetrics(attendanceRows, studentId).attendancePercent;
};

const gradeFromPercentage = (scorePct) => {
  if (scorePct >= 90) return 'A+';
  if (scorePct >= 80) return 'A';
  if (scorePct >= 70) return 'B';
  if (scorePct >= 60) return 'C';
  if (scorePct >= 50) return 'D';
  return 'F';
};

const normalizeMarkType = (type) => {
  const raw = String(type || "").trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[\s-]+/g, "_");
const compact = normalized.replace(/[^a-z_]/g, '');
  const mapped = LEGACY_MARK_TYPE_MAP[raw] || LEGACY_MARK_TYPE_MAP[normalized] || LEGACY_MARK_TYPE_MAP[compact];
  if (mapped) return mapped;

  // Fallbacks for older or inconsistent labels stored in DB
  if (raw.includes('assign')) return 'assignment';
  if (raw.includes('quiz') || raw.includes('test')) return 'quiz';
  if (raw.includes('mid')) return 'mid_exam';
  if (raw.includes('final')) return 'final_exam';
  if (raw.includes('participat')) return 'participation';
  return null;
};

const summarizeMarks = (marks = []) => {
  const map = MARK_TYPES.reduce((acc, type) => {
    acc[type] = { obtained: 0, total: 0 };
    return acc;
  }, {});

  marks.forEach((m) => {
const normalizedType = normalizeMarkType(m?.type);
    if (!normalizedType || !map[normalizedType]) return;
    map[normalizedType].obtained += Number(m.marksObtained || 0);
    map[normalizedType].total += Number(m.totalMarks || 0);
  });

  const totalObtained = Object.values(map).reduce((sum, type) => sum + type.obtained, 0);
  const totalPossible = Object.values(map).reduce((sum, type) => sum + type.total, 0);
  const percentage = totalPossible > 0 ? Number(((totalObtained / totalPossible) * 100).toFixed(2)) : 0;

  return { breakdown: map, totalObtained, totalPossible, percentage, grade: gradeFromPercentage(percentage) };
};
const buildStudentReportData = async (studentId, course) => {
  const [student, attendanceRows, marks, legacyResults] = await Promise.all([
        User.findById(studentId).select('name studentId gender'),
        Attendance.find({ course: course._id }),
        Mark.find({ course: course._id, student: studentId }).sort({ date: 1 }),
        Result.find({ studentId, createdBy: course.teacher }).sort({ date: 1 }).lean(),
  ]);

  if (!student) return null;

  const attendanceMetrics = buildAttendanceMetrics(attendanceRows, studentId);

// Backward compatibility: the academic results module stores marks in the Result collection
  // using legacy type names (mid/final). Normalize and merge those values into report exports.
  const normalizedLegacyResults = (legacyResults || []).map((item) => ({
    type: normalizeMarkType(item.type) || item.type,
    marksObtained: Number(item.marksObtained || 0),
    totalMarks: Number(item.totalMarks || 0),
    date: item.date || new Date(),
  }));

  const mergedMarks = [...marks, ...normalizedLegacyResults];
  const manualTestMarksCount = mergedMarks.filter((m) => normalizeMarkType(m.type) === 'quiz').length;
  const autoTestMarks = manualTestMarksCount === 0 ? await getAutoGeneratedTestMarks(studentId, course) : [];
  const [onlineTests, finalMarks] = await Promise.all([
    getOnlineTestAttempts(studentId, course),
    Promise.resolve([...mergedMarks, ...autoTestMarks]),
  ]);
  const marksSummary = summarizeMarks(finalMarks);
  return {
    student,
    course,
    attendance: {
      attendedDays: attendanceMetrics.presentDays,
      totalDays: attendanceMetrics.totalDays,
      attendancePercent: attendanceMetrics.attendancePercent,
    },
    marksBreakdown: marksSummary.breakdown,
    totalScore: marksSummary.totalObtained,
    totalPossible: marksSummary.totalPossible,
    percentage: marksSummary.percentage,
    grade: marksSummary.grade,
    marks: finalMarks,
    onlineTests,
  };
};
const streamPdf = (res, filename, writeFn) => {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  writeFn(doc);
  doc.end();
};

const streamExcel = (res, filename, sheetName, rows) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

export const createCourse = asyncHandler(async (req, res) => {
  const { courseName, courseCode, description, classType } = req.body;
  const newCode = (courseCode || buildCourseCode(courseName)).toUpperCase();

  const exists = await Course.findOne({ courseCode: newCode });
  if (exists) return res.status(400).json({ success: false, message: 'Course code already exists' });

  const course = await Course.create({
    courseName,
    courseCode: newCode,
    description,
    classType,
    teacher: req.user._id,
    students: [],
  });

  res.status(201).json({ success: true, data: course });
});

export const enrollStudent = asyncHandler(async (req, res) => {
  const { studentId: requestedStudentId, courseCode } = req.body;
  const studentId = req.user.role === 'student' ? req.user._id.toString() : requestedStudentId;

  if (!studentId) {
    return res.status(400).json({ success: false, message: 'studentId is required' });
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const course = await Course.findOne({ courseCode: courseCode?.toUpperCase() });
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  const alreadyEnrolled = course.students.some((id) => sameId(id, studentId));
      if (alreadyEnrolled) {
    return res.status(400).json({ success: false, message: 'Student is already enrolled in this course' });
  }

  if (course.classType !== 'mixed' && student.gender && student.gender !== course.classType) {
    return res.status(400).json({ success: false, message: `This course is for ${course.classType} students only` });
  }

  course.students.push(student._id);
  await course.save();

  res.json({ success: true, message: 'Enrolled successfully', data: course });
});

export const getTeacherCourses = asyncHandler(async (req, res) => {
  const query = req.user.role === 'student'
      ? { students: req.user._id }
    : { teacher: req.user._id };
    const courses = await Course.find(query)
    .populate('teacher', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  if (req.user.role !== 'student') {
    const allStudentIds = [...new Set(courses.flatMap((course) => course.students.map((id) => toIdString(id)).filter(Boolean)))];
        const enrolledStudents = await User.find({ _id: { $in: allStudentIds }, role: 'student' }).select('_id gender').lean();
    const genderMap = new Map(enrolledStudents.map((student) => [toIdString(student?._id), student.gender]));
    const coursesWithStats = courses.map((course) => {
      let maleCount = 0;
      let femaleCount = 0;

      course.students.forEach((studentId) => {
        const gender = genderMap.get(toIdString(studentId));
                if (gender === 'male') maleCount += 1;
        if (gender === 'female') femaleCount += 1;
      });

      return {
        ...course,
        enrollmentStats: {
          totalStudents: course.students.length,
          maleCount,
          femaleCount,
        },
      };
    });

    return res.json({ success: true, data: coursesWithStats });
  }

  const studentCourses = courses.map((course) => ({
    ...course,
    enrollmentStats: {
      totalStudents: course.students.length,
      maleCount: 0,
      femaleCount: 0,
    },
  }));

  res.json({ success: true, data: studentCourses });
});

export const getStudentsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { gender } = req.query;

  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can view students' });

  const query = { _id: { $in: course.students }, role: 'student' };
  if (gender && ['male', 'female'].includes(gender)) query.gender = gender;

    const students = await User.find(query).select('name studentId gender email personalPhone guardianPhone area');

   const attendanceRows = await Attendance.find({ course: course._id });

  const studentData = students.map((student) => {
    return {
      student,
     attendancePercent: calculateAttendancePercent(attendanceRows, student._id)
    };
  });
  
  res.json({ success: true, data: { course, students: studentData } });
});

export const markAttendance = asyncHandler(async (req, res) => {
  const { courseId, date, attendance } = req.body;
  console.info('[attendance.markAttendance] Incoming payload', {
    teacherId: toIdString(req.user?._id),
    course: toIdString(courseId),
    date,
    attendanceCount: Array.isArray(attendance) ? attendance.length : 0,
  });
  if (!courseId || !OBJECT_ID_REGEX.test(String(courseId))) {
      return res.status(400).json({ success: false, message: 'A valid courseId is required' });
  }
  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can mark attendance' });

  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) return res.status(400).json({ success: false, message: 'Invalid date' });

  const enrolledStudentIds = new Set(course.students.map((id) => toIdString(id)).filter(Boolean));
  const { cleanRows, error } = validateAttendanceRows(attendance, enrolledStudentIds);
  if (error) return res.status(400).json({ success: false, message: error });
  console.info('[attendance.markAttendance] Duplicate-check query', {
    course: toIdString(courseId),
    date: normalizedDate.toISOString(),
  });
  const alreadyMarked = await Attendance.exists({
  course: courseId,
    date: normalizedDate,
  });
  if (alreadyMarked) {
    return res.status(409).json({
      success: false,
      message: 'Attendance already marked for this course on the selected date. Use update instead.',
        });
  }

  let attendanceDoc;
  try {
    attendanceDoc = await Attendance.create({
      course: courseId,
      date: normalizedDate,
      students: cleanRows.map((row) => ({ studentId: row.student, status: row.status })),
      markedBy: req.user._id,
    });
  } catch (error) {
    if (error?.code === 11000) {
      console.error('[attendance.markAttendance] Duplicate key while creating attendance', {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        indexName: error.message?.match(/index:\s([^\s]+)/)?.[1],
      });
      return res.status(409).json({
        success: false,
        message: 'Attendance already exists for one or more students in this course on the selected date.',
      });
    }
    throw error;
  }
  

const populated = await Attendance.findById(attendanceDoc._id).populate('students.studentId', 'name studentId gender personalPhone guardianPhone area');  const records = mapAttendanceRecordsForResponse(populated);


  res.status(201).json({
        success: true,
    message: 'Attendance saved successfully',
    data: {
      courseId,
           date: normalizedDate.toISOString(),
      count: records.length,
      records,
    },
  });
});
export const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { date } = req.query;
  if (!courseId || !OBJECT_ID_REGEX.test(String(courseId))) {
    return res.status(400).json({ success: false, message: 'A valid courseId is required' });
  }
  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can view attendance' });

   const normalizedDate = normalizeDate(date);
  if (!normalizedDate) return res.status(400).json({ success: false, message: 'Invalid date' });
const attendanceDoc = await Attendance.findOne({
    course: courseId,
    date: normalizedDate,
  }).populate('students.studentId', 'name studentId gender personalPhone guardianPhone area');

  const records = mapAttendanceRecordsForResponse(attendanceDoc);
;

  res.json({
    success: true,
    data: {
      courseId,
      date: normalizedDate.toISOString(),
            count: records.length,
      records,
    },
  });
});
export const getAttendanceDays = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
if (!courseId || !OBJECT_ID_REGEX.test(String(courseId))) {
    return res.status(400).json({ success: false, message: 'A valid courseId is required' });
  }

  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can view attendance' });

  const rows = await Attendance.aggregate([
       { $match: { course: course._id } },
    {
       $project: {
        date: 1,
        total: { $size: '$students' },
        present: {
$size: {
            $filter: {
              input: '$students',
              as: 'student',
              cond: { $eq: ['$$student.status', 'present'] },
            },
          },
        },        
      },
    },
    { $sort: { date: -1 } },  ]);

  const days = rows.map((row) => ({
    date: new Date(row.date).toISOString(),
        total: row.total,
    present: row.present,
    absent: row.total - row.present,
  }));

  res.json({ success: true, data: { courseId, days } });
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const { courseId, date, attendance } = req.body;

  // ✅ Validate courseId
  if (!courseId || !OBJECT_ID_REGEX.test(String(courseId))) {
    return res.status(400).json({
      success: false,
      message: 'A valid courseId is required',
    });
  }

  // ✅ Check course + teacher
  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null)
    return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false)
    return res.status(403).json({
      success: false,
      message: 'Only course teacher can update attendance',
    });

  // ✅ Normalize date
  const normalizedDate = normalizeDate(date);
  if (!normalizedDate) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date',
    });
  }

  // ✅ Find existing attendance
  const existing = await Attendance.findOne({
    course: courseId,
    date: normalizedDate,
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'No attendance found for this course and date',
    });
  }

  // ✅ Validate students
  const enrolledStudentIds = new Set(
    course.students.map((id) => toIdString(id)).filter(Boolean)
  );

  const { cleanRows, error } = validateAttendanceRows(
    attendance,
    enrolledStudentIds
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error,
    });
  }

  // ✅ Remove duplicates (IMPORTANT FIX)
  const uniqueMap = new Map();
  cleanRows.forEach((row) => {
    uniqueMap.set(String(row.student), row);
  });

  const uniqueRows = Array.from(uniqueMap.values());

  // ✅ Update students array
  existing.students = uniqueRows.map((row) => ({
    studentId: row.student,
    status: row.status,
  }));

  existing.markedBy = req.user._id;
  existing.updatedAt = new Date();

  await existing.save();

  // ✅ Populate updated data
  const populated = await Attendance.findById(existing._id).populate(
    'students.studentId',
    'name studentId gender personalPhone guardianPhone area'
  );

  // Optional mapper (if you use it)
  const records = mapAttendanceRecordsForResponse
    ? mapAttendanceRecordsForResponse(populated)
    : populated.students;

  // ✅ Final response
  res.json({
    success: true,
    message: 'Attendance updated successfully',
    data: {
      courseId,
      date: normalizedDate.toISOString(),
      count: records.length,
      records,
    },
  });
});

export const deleteAttendanceByDate = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { date } = req.query;
  
  if (!courseId || !OBJECT_ID_REGEX.test(String(courseId))) {
    return res.status(400).json({ success: false, message: 'A valid courseId is required' });
  }
  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can delete attendance' });

  const dateRange = buildDayRange(date);
  if (!dateRange) return res.status(400).json({ success: false, message: 'Invalid date' });

  const result = await Attendance.deleteMany({
    course: courseId,
    date: { $gte: dateRange.start, $lt: dateRange.end },
  });
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, message: 'No attendance found for this course and date' });
  }

  res.json({
    success: true,
    message: 'Attendance deleted successfully',
    data: { courseId, date: dateRange.start.toISOString(), deletedCount: result.deletedCount },
  });
});
export const addOrUpdateMarks = asyncHandler(async (req, res) => {
  const { courseId, studentId, type, marksObtained, totalMarks, date } = req.body;

  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can add marks' });

  if (!course.students.some((id) => sameId(id, studentId))) {
        return res.status(400).json({ success: false, message: 'Student is not enrolled in this course' });
  }

  const normalized = normalizeDate(date);
  if (!normalized) return res.status(400).json({ success: false, message: 'Invalid date' });

  const payload = {
    student: studentId,
    course: courseId,
    teacher: req.user._id,
       type: normalizeMarkType(type) || type,
    marksObtained,
    totalMarks,
    date: normalized,
  };

  const mark = await Mark.findOneAndUpdate(
    { course: courseId, student: studentId, type: normalizeMarkType(type) || type, date: normalized },
        payload,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({ success: true, data: mark });
});

export const getCourseMarks = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can view marks' });

  const marks = await Mark.find({ course: courseId })
    .populate('student', 'name studentId gender')
    .sort({ date: -1 });

  res.json({ success: true, data: marks });
});

export const getStudentReport = asyncHandler(async (req, res) => {
  const { studentId, courseId } = req.params;
  const format = (req.query.format || 'json').toLowerCase();

  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can generate report' });

  if (!course.students.some((id) => sameId(id, studentId))) {
        return res.status(400).json({ success: false, message: 'Student is not enrolled in this course' });
  }

   const report = await buildStudentReportData(studentId, course);
  if (!report) return res.status(404).json({ success: false, message: 'Student not found' });
  const attendancePercent = report.attendance.attendancePercent;
  const marksSummary = summarizeMarks(report.marks);
  const student = report.student;

  if (format === 'pdf') {
    return streamPdf(res, `student_report_${student.studentId}_${course.courseCode}.pdf`, (doc) => {
      doc.fontSize(18).text('Individual Student Report');
      doc.moveDown();
      doc.fontSize(12).text(`Student: ${student.name} (${student.studentId})`);
      doc.text(`Course: ${course.courseName} (${course.courseCode})`);
      doc.text(`Attendance: ${attendancePercent}%`);
      doc.text(`Total Score: ${marksSummary.totalObtained}/${marksSummary.totalPossible} (${marksSummary.percentage}%)`);
      doc.text(`Grade: ${marksSummary.grade}`);
      doc.moveDown();
      MARK_TYPES.forEach((type) => {
        doc.text(`${MARK_TYPE_LABELS[type]}: ${marksSummary.breakdown[type].obtained}/${marksSummary.breakdown[type].total}`);
            });
      doc.moveDown();
      doc.fontSize(13).text('Online Test Attempts');
      if (!report.onlineTests?.length) {
        doc.fontSize(11).text('No online test attempts found.');
      } else {
        report.onlineTests.forEach((attempt, idx) => {
          const dateText = attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A';
          doc.fontSize(11).text(`${idx + 1}. ${attempt.testTitle}: ${attempt.obtained}/${attempt.total} (${dateText})`);
        });
      }
    });
  }

  if (format === 'excel' || format === 'xlsx') {
    const row = {
      Name: student.name,
      'Student ID': student.studentId,
      'Attendance %': attendancePercent,
      Assignments: marksSummary.breakdown.assignment.obtained,
      Quizzes: marksSummary.breakdown.quiz.obtained,
      'Mid Exams': marksSummary.breakdown.mid_exam.obtained,
      'Final Exams': marksSummary.breakdown.final_exam.obtained,
      'Class Participation': marksSummary.breakdown.participation.obtained,
      Total: marksSummary.totalObtained,
      Grade: marksSummary.grade,
      'Online Tests': (report.onlineTests || [])
        .map((attempt) => `${attempt.testTitle} (${attempt.obtained}/${attempt.total})`)
        .join(' | '),
    };
    return streamExcel(res, `student_report_${student.studentId}_${course.courseCode}.xlsx`, 'Student Report', [row]);
  }

  res.json({ success: true, data: report });
});
export const getMyStudentReport = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const format = (req.query.format || 'json').toLowerCase();
  const course = await Course.findById(courseId);

  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
  if (!course.students.some((id) => sameId(id, req.user._id))) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
  }

  const report = await buildStudentReportData(req.user._id, course);
  if (!report) return res.status(404).json({ success: false, message: 'Student not found' });

  if (format === 'pdf') {
    return streamPdf(res, `student_report_${report.student.studentId}_${course.courseCode}.pdf`, (doc) => {
      doc.fontSize(18).text('My Student Report');
      doc.moveDown();
      doc.fontSize(12).text(`Student: ${report.student.name} (${report.student.studentId})`);
      doc.text(`Course: ${course.courseName} (${course.courseCode})`);
      doc.text(`Attendance: ${report.attendance.attendancePercent}%`);
      doc.text(`Total Score: ${report.totalScore}/${report.totalPossible} (${report.percentage}%)`);
      doc.text(`Grade: ${report.grade}`);
      doc.moveDown();
      MARK_TYPES.forEach((type) => {
        doc.text(`${MARK_TYPE_LABELS[type]}: ${report.marksBreakdown[type].obtained}/${report.marksBreakdown[type].total}`);
            });
      doc.moveDown();
      doc.fontSize(13).text('Online Test Attempts');
      if (!report.onlineTests?.length) {
        doc.fontSize(11).text('No online test attempts found.');
      } else {
        report.onlineTests.forEach((attempt, idx) => {
          const dateText = attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'N/A';
          doc.fontSize(11).text(`${idx + 1}. ${attempt.testTitle}: ${attempt.obtained}/${attempt.total} (${dateText})`);
        });
      }
    });
  }

  if (format === 'excel' || format === 'xlsx') {
    const row = {
      Name: report.student.name,
      'Student ID': report.student.studentId,
      'Attendance %': report.attendance.attendancePercent,
      Assignments: report.marksBreakdown.assignment.obtained,
      Quizzes: report.marksBreakdown.quiz.obtained,
      'Mid Exams': report.marksBreakdown.mid_exam.obtained,
      'Final Exams': report.marksBreakdown.final_exam.obtained,
      'Class Participation': report.marksBreakdown.participation.obtained,
      Total: report.totalScore,
      Grade: report.grade,
      'Online Tests': (report.onlineTests || [])
        .map((attempt) => `${attempt.testTitle} (${attempt.obtained}/${attempt.total})`)
        .join(' | '),
    };
    return streamExcel(res, `student_report_${report.student.studentId}_${course.courseCode}.xlsx`, 'Student Report', [row]);
  }

  res.json({ success: true, data: report });
});

export const getClassReport = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const format = (req.query.format || 'json').toLowerCase();

  const course = await ensureTeacherCourse(courseId, req.user._id);
  if (course === null) return res.status(404).json({ success: false, message: 'Course not found' });
  if (course === false) return res.status(403).json({ success: false, message: 'Only course teacher can generate report' });

   const [students, attendanceRows, marks, legacyResults] = await Promise.all([
    User.find({ _id: { $in: course.students } }).select('name studentId gender'),
    Attendance.find({ course: courseId }),
    Mark.find({ course: courseId }),
    Result.find({ studentId: { $in: course.students }, createdBy: course.teacher }).lean(), 
  ]);

 const rows = (await Promise.all(students.map(async (student) => {
        const studentMarks = marks.filter((m) => sameId(m?.student, student?._id));
        const normalizedLegacyResults = legacyResults
          .filter((item) => sameId(item?.studentId, student?._id))
          .map((item) => ({
            type: normalizeMarkType(item.type) || item.type,
            marksObtained: Number(item.marksObtained || 0),
            totalMarks: Number(item.totalMarks || 0),
            date: item.date || new Date(),
          }));
        const mergedMarks = [...studentMarks, ...normalizedLegacyResults];
        const manualTestMarksCount = mergedMarks.filter((m) => normalizeMarkType(m.type) === 'quiz').length;
        const autoTestMarks = manualTestMarksCount === 0 ? await getAutoGeneratedTestMarks(student._id, course) : [];
        const onlineTests = await getOnlineTestAttempts(student._id, course);
        const summary = summarizeMarks([...mergedMarks, ...autoTestMarks]);
    return {
      name: student.name,
      studentId: student.studentId,
      gender: student.gender,
      attendancePercent: calculateAttendancePercent(attendanceRows, student._id),
      assignment: summary.breakdown.assignment.obtained,
      quiz: summary.breakdown.quiz.obtained,
      midExam: summary.breakdown.mid_exam.obtained,
      finalExam: summary.breakdown.final_exam.obtained,
      participation: summary.breakdown.participation.obtained,
      total: summary.totalObtained,
      percentage: summary.percentage,
      grade: summary.grade,
            onlineTests,
    };
  }))).sort((a, b) => b.total - a.total)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  const classAverage = rows.length
    ? Number((rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length).toFixed(2))
    : 0;

  const responseData = { course, averagePerformance: classAverage, ranking: rows };

  if (format === 'pdf') {
    return streamPdf(res, `class_report_${course.courseCode}.pdf`, (doc) => {
      doc.fontSize(18).text('Class Report');
      doc.moveDown();
      doc.fontSize(12).text(`Course: ${course.courseName} (${course.courseCode})`);
      doc.text(`Average performance: ${classAverage}%`);
      doc.moveDown();
      rows.forEach((row) => {
        doc.text(`#${row.rank} ${row.name} (${row.studentId}) - ${row.total} marks - ${row.attendancePercent}% attendance`);
         if (row.onlineTests?.length) {
          row.onlineTests.forEach((attempt) => {
            doc.fontSize(10).text(`   • ${attempt.testTitle}: ${attempt.obtained}/${attempt.total}`);
          });
          doc.fontSize(12);
        }
      });
    });
  }

  if (format === 'excel' || format === 'xlsx') {
    const excelRows = rows.map((row) => ({
      Name: row.name,
      'Student ID': row.studentId,
      'Attendance %': row.attendancePercent,
     Assignments: row.assignment,
      Quizzes: row.quiz,
      'Mid Exams': row.midExam,
      'Final Exams': row.finalExam,
      'Class Participation': row.participation,
      Total: row.total,
      Rank: row.rank,
      Grade: row.grade,
       'Online Tests': (row.onlineTests || [])
        .map((attempt) => `${attempt.testTitle} (${attempt.obtained}/${attempt.total})`)
        .join(' | '),
    }));
    return streamExcel(res, `class_report_${course.courseCode}.xlsx`, 'Class Report', excelRows);
  }

  res.json({ success: true, data: responseData });
});

const getAutoGeneratedTestMarks = async (studentId, course) => {
  const teacherTests = await Test.find({ createdBy: course.teacher }).select('_id title totalMarks').lean();
  if (!teacherTests.length) return [];

  const testIds = teacherTests.map((test) => test._id);
  const submissions = await Submission.find({
    student: studentId,
    test: { $in: testIds },
    status: { $in: ['graded', 'reviewed'] },
  }).select('test totalScore maxScore submittedAt').lean();

  const testMarkMap = new Map();
  submissions.forEach((submission) => {
    const key = String(submission.test);
    const prev = testMarkMap.get(key);
    if (!prev || Number(submission.totalScore || 0) > Number(prev.totalScore || 0)) {
      testMarkMap.set(key, submission);
    }
  });

  return [...testMarkMap.values()].map((submission) => ({
       type: 'quiz',
    marksObtained: Number(submission.totalScore || 0),
    totalMarks: Number(submission.maxScore || 0) > 0 ? Number(submission.maxScore) : 1,
    date: submission.submittedAt || new Date(),
  }));
};
const getOnlineTestAttempts = async (studentId, course) => {
  const teacherTests = await Test.find({ createdBy: course.teacher }).select('_id title').lean();
  if (!teacherTests.length) return [];

  const testMap = new Map(teacherTests.map((test) => [String(test._id), test.title]));
  const submissions = await Submission.find({
    student: studentId,
    test: { $in: teacherTests.map((test) => test._id) },
    status: { $in: ['graded', 'reviewed'] },
  })
    .select('test totalScore maxScore submittedAt')
    .sort({ submittedAt: -1 })
    .lean();

  return submissions.map((submission) => ({
    testId: String(submission.test),
    testTitle: testMap.get(String(submission.test)) || 'Online Test',
    obtained: Number(submission.totalScore || 0),
    total: Number(submission.maxScore || 0),
    submittedAt: submission.submittedAt || null,
  }));
};
