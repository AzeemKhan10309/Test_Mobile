/**
 * Test Model
 * Comprehensive exam/test schema with all settings
 */

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Test title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    instructions: {
      type: String,
      trim: true,
    },
    subject: { type: String, trim: true },
    topic: { type: String, trim: true },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'courseId is required for every test'],
      alias: 'courseId',
      index: true,
    },
       semester: {
      type: String,
      trim: true,
      alias: 'semesterId',
    },
    // Timing
    duration: {
      type: Number, // minutes
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    startTime: { type: Date },
    endTime: { type: Date },

    // Questions
    questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    }],
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },

    // Access control
        requireAccessCode: { type: Boolean, default: false },
    accessCode: {
      type: String,
 trim: true,
      set: (value) => {
        if (value === undefined || value === null) return undefined;
        const normalized = String(value).trim().toUpperCase();
        return normalized || undefined;
      },    },
    shareLink: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    allowedStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isPublic: { type: Boolean, default: false },
     allowRetake: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 1, min: 1, max: 10 },

    // Settings
    settings: {
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: false },
      showResults: { type: Boolean, default: true },
      showCorrectAnswers: { type: Boolean, default: true },
      allowReview: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 1 },
      autoSubmit: { type: Boolean, default: true },
      proctoring: { type: Boolean, default: false },
      webcamRequired: { type: Boolean, default: false },
      fullscreenRequired: { type: Boolean, default: false },
      antiCheat: { type: Boolean, default: true },
      maxTabSwitches: { type: Number, default: 3 },
      screenshotInterval: { type: Number, default: 30 }, // seconds
    },

    status: {
      type: String,
      enum: ['draft', 'published', 'active', 'ended', 'archived'],
      default: 'draft',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Analytics cache
    analytics: {
      totalAttempts: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      lowestScore: { type: Number, default: 0 },
      passRate: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
testSchema.virtual('isActive').get(function () {
  const now = new Date();
  if (this.status !== 'published' && this.status !== 'active') return false;
  if (this.startTime && now < this.startTime) return false;
  if (this.endTime && now > this.endTime) return false;
  return true;
});

testSchema.virtual('joinUrl').get(function () {
  return `/exam/join/${this.shareLink}`;
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
testSchema.index({ createdBy: 1, status: 1 });
testSchema.index({ createdBy: 1, course: 1, status: 1 });
testSchema.index({ startTime: 1, endTime: 1 });

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
testSchema.pre('save', async function (next) {
  if (this.requireAccessCode && !this.accessCode) {
    return next(new Error('Access code is required when access-code protection is enabled'));
  }

  if (!this.requireAccessCode) {
    this.accessCode = undefined;
  }
  if (this.isModified('questions') || this.isModified('passingMarks')) {
    // totalMarks is computed dynamically via populate
  }
  const normalizedMaxAttempts = Math.min(Math.max(Number(this.maxAttempts || this.settings?.maxAttempts || 1), 1), 10);
  this.maxAttempts = normalizedMaxAttempts;
  if (this.settings) {
    this.settings.maxAttempts = normalizedMaxAttempts;
  }
  this.allowRetake = Boolean(this.allowRetake || normalizedMaxAttempts > 1);
  next();
});

export default mongoose.model('Test', testSchema);
