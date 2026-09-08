import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createCourse,
    updateCourse,
  deleteCourse,
  enrollStudent,
  getTeacherCourses,
  getStudentsByCourse,
  markAttendance,
  addOrUpdateMarks,
  getCourseMarks,
  getStudentReport,
    getMyStudentReport,
  getClassReport,
   getAttendanceByDate,
     getAttendanceDays,
  updateAttendance,
  deleteAttendanceByDate,
} from '../controllers/courseManagementController.js';

const router = express.Router();

router.use(authenticate);

router.post('/courses', authorize('teacher', 'superadmin'), createCourse);
router.put('/course/:id', authorize('teacher', 'superadmin'), updateCourse);
router.delete('/course/:id', authorize('teacher', 'superadmin'), deleteCourse);
router.get('/courses', authorize('teacher', 'superadmin', 'student'), getTeacherCourses);
router.get('/courses/:courseId/students', authorize('teacher', 'superadmin'), getStudentsByCourse);
router.post('/join-course', authorize('student', 'teacher', 'superadmin'), enrollStudent);

router.post('/attendance', authorize('teacher', 'superadmin'), markAttendance);
router.post('/attendance/mark', authorize('teacher', 'superadmin'), markAttendance);
router.get('/attendance/:courseId/days', authorize('teacher', 'superadmin'), getAttendanceDays);
router.get('/attendance/:courseId', authorize('teacher', 'superadmin'), getAttendanceByDate);
router.get('/attendance/:courseId/:date', authorize('teacher', 'superadmin'), (req, _res, next) => {
  req.query.date = req.params.date;
  next();
}, getAttendanceByDate);
router.put('/attendance', authorize('teacher', 'superadmin'), updateAttendance);
router.put('/attendance/update', authorize('teacher', 'superadmin'), updateAttendance);
router.delete('/attendance/:courseId', authorize('teacher', 'superadmin'), deleteAttendanceByDate);
router.delete('/attendance/:courseId/:date', authorize('teacher', 'superadmin'), (req, _res, next) => {
  req.query.date = req.params.date;
  next();
}, deleteAttendanceByDate);
router.post('/marks', authorize('teacher', 'superadmin'), addOrUpdateMarks);
router.get('/marks/:courseId', authorize('teacher', 'superadmin'), getCourseMarks);
router.get('/marks/report/student/:studentId/:courseId', authorize('teacher', 'superadmin'), getStudentReport);
router.get('/marks/report/my/:courseId', authorize('student'), getMyStudentReport);
router.get('/marks/report/class/:courseId', authorize('teacher', 'superadmin'), getClassReport);

router.post('/course', authorize('teacher', 'superadmin'), createCourse);
router.post('/course/enroll', authorize('student', 'teacher', 'superadmin'), enrollStudent);
router.get('/course', authorize('teacher', 'superadmin', 'student'), getTeacherCourses);
router.get('/course/:courseId/students', authorize('teacher', 'superadmin'), getStudentsByCourse);
router.get('/report/student/:studentId/:courseId', authorize('teacher', 'superadmin'), getStudentReport);
router.get('/report/my/:courseId', authorize('student'), getMyStudentReport);
router.get('/report/class/:courseId', authorize('teacher', 'superadmin'), getClassReport);

export default router;