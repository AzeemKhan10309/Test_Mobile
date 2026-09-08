import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    date: { type: Date, required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    proofImage: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

leaveSchema.index({ student: 1, course: 1, date: 1 }, { unique: true });

export default mongoose.model('Leave', leaveSchema);