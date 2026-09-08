import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinMode: { type: String, enum: ['invite', 'approval'], default: 'invite' },
    inviteCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Group', groupSchema);