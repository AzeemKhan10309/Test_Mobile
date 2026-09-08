import mongoose from 'mongoose';

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileUrl: { type: String, required: true, trim: true },
    text: { type: String, trim: true, maxlength: 3000, default: '' },
    submittedAt: { type: Date, default: Date.now },
    marks: { type: Number, min: 0 },
    feedback: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);