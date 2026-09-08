import mongoose from 'mongoose';

const RESULT_TYPES = ['assignment', 'quiz', 'mid', 'final', 'participation'];

const resultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    type: {
      type: String,
      enum: RESULT_TYPES,
      required: true,
      index: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: [0, 'Marks obtained cannot be negative'],
    },
    totalMarks: {
      type: Number,
      required: true,
      min: [1, 'Total marks must be at least 1'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
        testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      index: true,
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
  
    },
  },
  { timestamps: true }
);

resultSchema.index({ submissionId: 1 }, { unique: true, sparse: true });
export default mongoose.model('Result', resultSchema);
