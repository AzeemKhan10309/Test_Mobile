import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  reviewText: { type: String, required: true, trim: true, maxlength: 1200 },
  isAnonymous: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'hidden', 'addressed'], default: 'active', index: true },
}, { timestamps: true });

reviewSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
reviewSchema.index({ teacherId: 1 });
reviewSchema.index({ courseId: 1 });

export default mongoose.model('Review', reviewSchema);