import mongoose from 'mongoose';

const retakeRequestSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
     decisionMessage: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

retakeRequestSchema.index({ studentId: 1, testId: 1, createdAt: -1 }, { name: 'retake_request_student_test_lookup' });
retakeRequestSchema.index(
  { studentId: 1, testId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
    name: 'uniq_pending_retake_request_per_student_test',
  }
);

export default mongoose.model('RetakeRequest', retakeRequestSchema);