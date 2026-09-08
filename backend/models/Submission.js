

import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  questionType: {
    type: String,
    enum: ['mcq', 'short', 'long', 'true_false', 'fill_blank'],
  },
  type: {
    type: String,
    enum: ['mcq', 'short', 'long', 'subjective'],
    default: 'mcq',
  },
  selectedOption: { type: String },
  textAnswer: { type: String, trim: true },
  markedForReview: { type: Boolean, default: false },
  timeSpent: { type: Number, default: 0 },

  isCorrect: { type: Boolean },
  marksAwarded: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 0 },
  autoScore: { type: Number, default: 0 },
  manualScore: { type: Number, default: null },
  manualRequired: { type: Boolean, default: false },

  aiScore: { type: Number },
  aiSimilarity: { type: Number },
  aiFeedback: { type: String },
  teacherOverrideScore: { type: Number },
  teacherComment: { type: String },

  answeredAt: { type: Date },
}, { _id: true });

const cheatingFlagSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'tab_switch','window_blur','copy_paste','right_click',
      'keyboard_shortcut','face_not_detected','multiple_faces',
      'looking_away','phone_detected','screenshot',
      'inactivity','multiple_screen_exit'
    ],
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
  screenshot: { type: String },
}, { _id: true });

const submissionSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      alias: 'testId',
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
            alias: 'studentId',
    },

    answers: [answerSchema],
    cheatingFlags: [cheatingFlagSchema],
    proctoringScreenshots: [{ type: String }],

    startedAt: { type: Date },
    submittedAt: { type: Date },
    timeSpent: { type: Number, default: 0 },
    remainingTime: { type: Number },

    isSubmitted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'graded', 'reviewed', 'finalized', 'evaluated'],
      default: 'in_progress',
    },
    gradingLock: { type: Boolean, default: false },
    submissionType: {
      type: String,
      enum: ['manual', 'auto_time', 'auto_cheat', 'force_submit'],
      default: 'manual',
    },

    totalScore: { type: Number, default: 0 },
    autoMarks: { type: Number, default: 0 },
    manualMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    rank: { type: Number },
    isPassed: { type: Boolean },
    grade: { type: String },

    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    skippedAnswers: { type: Number, default: 0 },
    reviewedAnswers: { type: Number, default: 0 },

    violationCount: { type: Number, default: 0 },
    isDisqualified: { type: Boolean, default: false },
    disqualificationReason: { type: String },

    browserInfo: {
      userAgent: { type: String },
      ip: { type: String },
    },

    heartbeat: {
      token: { type: String },
      lastSeenAt: { type: Date },
    },

    attemptNumber: { type: Number, default: 1 },
 retakeApproved: { type: Boolean, default: false },
    retakeUsed: { type: Boolean, default: false },
    aiGradingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },

    evaluationStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'failed'],
      default: 'pending',
      // ❌ REMOVED index: true
    },

    teacherReviewedAt: { type: Date },
    teacherNotes: { type: String },

    reportUrl: { type: String },
    submitRequestId: { type: String, default: null },
    submitReceiptId: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

/* ================= INDEXES (CLEAN & CENTRALIZED) ================= */

// Unique submission per student per test
submissionSchema.index(
  { test: 1, student: 1 },
  { unique: true, name: 'uniq_submission_per_student_test' }
);

// Fast filtering
submissionSchema.index({ test: 1, status: 1 });
submissionSchema.index({ status: 1, submittedAt: -1 });
// Student dashboard
submissionSchema.index({ student: 1, createdAt: -1 });

// Leaderboard (optimized)
submissionSchema.index({ test: 1, totalScore: -1, submittedAt: 1 });

// Async grading queue
submissionSchema.index({ evaluationStatus: 1, status: 1 });

// Anti-cheat tracking
submissionSchema.index({ test: 1, violationCount: -1 });


/* ================= HOOKS ================= */

submissionSchema.pre('save', function (next) {
  if (this.isSubmitted) {
    this.submittedAt = this.submittedAt || new Date();
    if (this.status === 'in_progress') this.status = 'submitted';
  }

  if (['submitted', 'graded', 'reviewed', 'finalized', 'evaluated'].includes(this.status)) {
    this.isSubmitted = true;
    this.submittedAt = this.submittedAt || new Date();
  }

  next();
});


/* ================= VIRTUALS ================= */

submissionSchema.virtual('duration').get(function () {
  if (!this.startedAt || !this.submittedAt) return null;
  return Math.floor((this.submittedAt - this.startedAt) / 1000);
});

submissionSchema.virtual('cheatingRiskLevel').get(function () {
  const count = this.violationCount;
  if (count === 0) return 'none';
  if (count <= 2) return 'low';
  if (count <= 5) return 'medium';
  return 'high';
});


export default mongoose.model('Submission', submissionSchema);
