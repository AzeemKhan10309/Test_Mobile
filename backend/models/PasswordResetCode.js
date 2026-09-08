import mongoose from 'mongoose';

const passwordResetCodeSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    hashedCode: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

passwordResetCodeSchema.index({ studentId: 1 }, { unique: true });
passwordResetCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PasswordResetCode', passwordResetCodeSchema);
