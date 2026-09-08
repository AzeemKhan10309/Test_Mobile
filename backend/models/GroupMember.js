import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member', required: true },
    status: { type: String, enum: ['active', 'pending'], default: 'active', required: true },
  },
  { timestamps: true }
);

groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export default mongoose.model('GroupMember', groupMemberSchema);