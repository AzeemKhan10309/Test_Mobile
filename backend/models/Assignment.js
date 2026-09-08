import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    deadline: { type: Date, required: true, index: true },
    totalMarks: { type: Number, required: true, min: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ course: 1, createdAt: -1 });

export default mongoose.model('Assignment', assignmentSchema);