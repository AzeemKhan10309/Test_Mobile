import express from 'express';
import multer from 'multer';

import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAdminStats,
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherProfile,
  getAdminCourses,
  assignTeacherToCourse,
  enrollStudentManual,
  enrollStudentBulk,
  getStudents,
  updateStudent,
  getAdminResults,
  updateAdminResult,
  deleteAdminCourse,
  deleteAdminResult,
  createAdminAnnouncement,
  getUsers,
  createUser,
  toggleUserActive,
  deleteUser,
  bulkAddStudents,
  bulkDeleteStudents,
} from '../controllers/adminController.js';

const router = express.Router();
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticate, authorize('superadmin'));

router.get('/stats', getAdminStats);

router.get('/teachers', getTeachers);
router.post('/teachers', createTeacher);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);
router.get('/teachers/:id/profile', getTeacherProfile);
router.get('/courses', getAdminCourses);
router.put('/courses/:id/teacher', assignTeacherToCourse);
router.delete('/courses/:id', deleteAdminCourse);

router.post('/students/bulk-add', bulkUpload.single('file'), bulkAddStudents);
router.post('/students/bulk-delete', bulkDeleteStudents);
router.post('/enrollments/manual', enrollStudentManual);
router.post('/enrollments/bulk', enrollStudentBulk);
router.get('/students', getStudents);
router.put('/students/:id', updateStudent);

router.get('/results', getAdminResults);
router.put('/results/:id', updateAdminResult);
router.delete('/results/:id', deleteAdminResult);

router.post('/announcements', createAdminAnnouncement);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/toggle-active', toggleUserActive);
router.delete('/users/:id', deleteUser);

export default router;
