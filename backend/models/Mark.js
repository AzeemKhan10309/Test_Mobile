import mongoose from 'mongoose';

const markSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['assignment', 'quiz', 'mid_exam', 'final_exam', 'participation', 'test', 'mid', 'final'],
      required: true,
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
  },
  { timestamps: true }
);

markSchema.index({ course: 1, student: 1, type: 1, date: 1 });

export default mongoose.model('Mark', markSchema);
