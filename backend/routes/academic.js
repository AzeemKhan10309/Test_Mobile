import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  applyLeave,
  createAnnouncement,
  createAssignment,
    deleteAnnouncement,
  getAssignmentSubmissions,
  getCourseAnnouncements,
  getCourseAssignments,
  getLeaveRequests,
  gradeAssignmentSubmission,
  markAnnouncementRead,
  submitAssignment,
    updateAnnouncement,
  updateLeaveStatus,
} from '../controllers/academicController.js';

const router = express.Router();

router.use(authenticate);

router.post('/announcements/create', authorize('teacher', 'superadmin'), createAnnouncement);
router.get('/announcements/:courseId', authorize('teacher', 'superadmin', 'student'), getCourseAnnouncements);
router.patch('/announcements/:id/read', authorize('student'), markAnnouncementRead);
router.patch('/announcements/:id', authorize('teacher', 'superadmin'), updateAnnouncement);
router.delete('/announcements/:id', authorize('teacher', 'superadmin'), deleteAnnouncement);

router.post('/assignment/create', authorize('teacher', 'superadmin'), createAssignment);
router.get('/assignment/course/:courseId', authorize('teacher', 'superadmin', 'student'), getCourseAssignments);
router.post('/assignment/submit', authorize('student'), submitAssignment);
router.get('/assignment/:assignmentId/submissions', authorize('teacher', 'superadmin'), getAssignmentSubmissions);
router.patch('/assignment/submission/:submissionId/grade', authorize('teacher', 'superadmin'), gradeAssignmentSubmission);

router.post('/leave/apply', authorize('student'), applyLeave);
router.get('/leave', authorize('teacher', 'superadmin', 'student'), getLeaveRequests);
router.patch('/leave/:id', authorize('teacher', 'superadmin'), updateLeaveStatus);

router.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const publicBase = process.env.FILE_PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return res.status(201).json({
    success: true,
    data: {
      fileUrl: `${publicBase}/uploads/${req.file.filename}`,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
});

export default router;