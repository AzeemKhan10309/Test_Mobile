import { asyncHandler } from '../middleware/errorHandler.js';
import Review from '../models/Review.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { z } from 'zod';

const sanitize = (value = '') => String(value).replace(/[<>]/g, '').trim();

const reviewSchema = z.object({
  courseId: z.string().min(1),
  teacherId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().min(5).max(1200),
  isAnonymous: z.boolean().optional().default(false),
});

export const createReview = asyncHandler(async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });

  const studentId = req.user._id;
  const { courseId, teacherId, rating, reviewText, isAnonymous } = parsed.data;
  const course = await Course.findById(courseId).select('teacher students');
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
  if (!course.students.some((id) => id.toString() === studentId.toString())) {
    return res.status(403).json({ success: false, message: 'Only enrolled students can review this course' });
  }
  if (String(course.teacher || '') !== String(teacherId)) {
    return res.status(400).json({ success: false, message: 'Teacher does not match course teacher' });
  }

  const existing = await Review.findOne({ studentId, courseId });
  if (existing) return res.status(409).json({ success: false, message: 'One review per course is allowed' });

  const review = await Review.create({ studentId, courseId, teacherId, rating, reviewText: sanitize(reviewText), isAnonymous });
  res.status(201).json({ success: true, data: review });
});

export const updateReview = asyncHandler(async (req, res) => {
  const parsed = reviewSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });

  const review = await Review.findOne({ _id: req.params.id, studentId: req.user._id });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

  if (parsed.data.rating != null) review.rating = parsed.data.rating;
  if (parsed.data.reviewText != null) review.reviewText = sanitize(parsed.data.reviewText);
  if (parsed.data.isAnonymous != null) review.isAnonymous = parsed.data.isAnonymous;
  await review.save();
  res.json({ success: true, data: review });
});

export const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ studentId: req.user._id })
    .populate('courseId', 'courseName courseCode')
    .populate('teacherId', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: reviews });
});

export const getAdminReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, courseId, teacherId, rating, status, search, fromDate, toDate } = req.query;
  const query = {};
  if (courseId) query.courseId = courseId;
  if (teacherId) query.teacherId = teacherId;
  if (rating) query.rating = Number(rating);
  if (status) query.status = status;
  if (fromDate || toDate) query.createdAt = { ...(fromDate ? { $gte: new Date(fromDate) } : {}), ...(toDate ? { $lte: new Date(toDate) } : {}) };

  let reviewQuery = Review.find(query).populate('courseId', 'courseName').populate('teacherId', 'name').populate('studentId', 'name studentId');
  if (search) {
    const students = await User.find({ name: { $regex: search, $options: 'i' }, role: 'student' }).select('_id');
    const courses = await Course.find({ courseName: { $regex: search, $options: 'i' } }).select('_id');
    reviewQuery = reviewQuery.find({ $or: [{ studentId: { $in: students.map((s) => s._id) } }, { courseId: { $in: courses.map((c) => c._id) } }] });
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    reviewQuery.sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Review.countDocuments(query),
  ]);
  res.json({ success: true, data: items, meta: { page: Number(page), limit: Number(limit), total } });
});

export const getAdminReviewById = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate('courseId', 'courseName').populate('teacherId', 'name').populate('studentId', 'name studentId');
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  res.json({ success: true, data: review });
});

export const deleteAdminReview = asyncHandler(async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Review deleted' });
});

export const updateAdminReviewStatus = asyncHandler(async (req, res) => {
  const statusSchema = z.object({ status: z.enum(['active', 'hidden', 'addressed']) });
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: parsed.error.issues[0].message });
  const review = await Review.findByIdAndUpdate(req.params.id, { status: parsed.data.status }, { new: true });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  res.json({ success: true, data: review });
});

export const getTeachers = asyncHandler(async (_req, res) => {
  const teachers = await User.find({ role: 'teacher' }).select('_id name email').sort({ name: 1 }).lean();
  res.json({ success: true, data: teachers });
});

export const getTeacherCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.params.teacherId })
    .select('_id courseName courseCode teacher')
    .sort({ courseName: 1 })
    .lean();
  res.json({ success: true, data: courses });
});

export const getCourseReviews = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    rating,
    sortBy = 'latest',
  } = req.query;

  const course = await Course.findById(req.params.courseId).populate('teacher', 'name').lean();
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  const match = { courseId: course._id };
  if (rating) match.rating = Number(rating);

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'users', localField: 'studentId', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    ...(search ? [{ $match: { $or: [{ reviewText: { $regex: search, $options: 'i' } }, { 'student.name': { $regex: search, $options: 'i' } }] } }] : []),
  ];

  const sortStage = sortBy === 'highest' ? { rating: -1, createdAt: -1 } : { createdAt: -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [items, countRows, analyticsRows] = await Promise.all([
    Review.aggregate([
      ...pipeline,
      { $sort: sortStage },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 1,
          rating: 1,
          reviewText: 1,
          createdAt: 1,
          studentName: '$student.name',
        },
      },
    ]),
    Review.aggregate([...pipeline, { $count: 'total' }]),
    Review.aggregate([
      { $match: { courseId: course._id } },
      {
        $facet: {
          summary: [{ $group: { _id: null, totalReviews: { $sum: 1 }, averageRating: { $avg: '$rating' } } }],
          ratingDistribution: [{ $group: { _id: '$rating', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
          monthlyTrend: [
            {
              $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
          sentiment: [
            {
              $group: {
                _id: { $cond: [{ $gte: ['$rating', 4] }, 'positive', 'negative'] },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
  ]);

  const analytics = analyticsRows[0] || {};
  const summary = analytics.summary?.[0] || { totalReviews: 0, averageRating: 0 };
  const ratingDistribution = [1, 2, 3, 4, 5].map((value) => ({ rating: value, count: analytics.ratingDistribution?.find((r) => r._id === value)?.count || 0 }));
  const monthlyTrend = (analytics.monthlyTrend || []).map((row) => ({ month: `${row._id.year}-${String(row._id.month).padStart(2, '0')}`, count: row.count }));
  const sentiment = ['positive', 'negative'].map((label) => ({ label, count: analytics.sentiment?.find((r) => r._id === label)?.count || 0 }));

  res.json({
    success: true,
    data: {
      course: {
        id: course._id,
        courseName: course.courseName,
        teacherName: course.teacher?.name || 'Unassigned',
      },
      reviews: items,
      analytics: { ...summary, ratingDistribution, monthlyTrend, sentiment },
    },
    meta: { page: Number(page), limit: Number(limit), total: countRows[0]?.total || 0 },
  });
});