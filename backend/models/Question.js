/**
 * Question Model
 * Supports MCQ and Short Answer question types
 */

import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: true });

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'short', 'long', 'true_false', 'fill_blank'],
       required: true,
      default: 'mcq',
    },
    options: {
      type: [optionSchema],
      validate: {
        validator: function (v) {
          if (this.type === 'mcq') return v && v.length >= 2;
          return true;
        },
        message: 'MCQ questions must have at least 2 options',
      },
    },
    correctAnswer: {
      type: String,
      trim: true,
    },
    explanation: {
      type: String,
      trim: true,
    },
    marks: {
      type: Number,
      required: true,
      default: 1,
      min: [0.5, 'Marks must be at least 0.5'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    topic: {
      type: String,
      trim: true,
    },
    tags: [{ type: String, trim: true }],
    isAIGenerated: { type: Boolean, default: false },
    aiPrompt: { type: String },

    // Analytics
    timesAnswered: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
    },
  },
  { timestamps: true }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────
questionSchema.virtual('difficultyRate').get(function () {
  if (this.timesAnswered === 0) return null;
  return ((this.timesCorrect / this.timesAnswered) * 100).toFixed(1);
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
questionSchema.index({ testId: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ type: 1, difficulty: 1 });

export default mongoose.model('Question', questionSchema);
