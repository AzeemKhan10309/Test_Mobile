/**
 * Seed Script
 * Creates a superadmin, demo teacher, and demo students
 * Run: node scripts/seed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

import User from '../models/User.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examify';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clean existing demo data
    await User.deleteMany({ email: { $in: ['admin@examify.com', 'teacher@demo.com'] } });
    await User.deleteMany({ studentId: { $in: ['STU001', 'STU002', 'STU003'] } });
    console.log('🧹 Cleared existing demo data');

    // ── Super Admin ──────────────────────────────────────────────────────────
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@examify.com',
      password: 'admin123',
      role: 'superadmin',
      isEmailVerified: true,
    });
    console.log(`✅ SuperAdmin: admin@examify.com / admin123`);

    // ── Demo Teacher ─────────────────────────────────────────────────────────
    const teacher = await User.create({
      name: 'Dr. Sarah Johnson',
      email: 'teacher@demo.com',
      password: 'teacher123',
      role: 'teacher',
      isEmailVerified: true,
      subscription: { plan: 'pro', testsCreated: 0 },
    });
    console.log(`✅ Teacher: teacher@demo.com / teacher123`);

    // ── Demo Students ─────────────────────────────────────────────────────────
    const students = await User.insertMany([
      { name: 'Alice Smith', studentId: 'STU001', password: 'student123', role: 'student', gender: 'female' },
      { name: 'Bob Williams', studentId: 'STU002', password: 'student123', role: 'student', gender: 'male' },
      { name: 'Carol Brown', studentId: 'STU003', password: 'student123', role: 'student', gender: 'female' },
    ]);
    console.log(`✅ Students: STU001, STU002, STU003 / student123`);

    // ── Demo Test ─────────────────────────────────────────────────────────────
    const test = await Test.create({
      title: 'JavaScript Fundamentals — Demo Test',
      description: 'A demonstration test covering core JavaScript concepts.',
      instructions: 'Read each question carefully. No external resources allowed.\nYou have 30 minutes to complete this test.',
      subject: 'Computer Science',
      topic: 'JavaScript',
      duration: 30,
      passingMarks: 6,
      status: 'published',
      createdBy: teacher._id,
      settings: {
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showCorrectAnswers: true,
        antiCheat: true,
        maxTabSwitches: 3,
        autoSubmit: true,
      },
    });

    // ── Demo Questions ────────────────────────────────────────────────────────
    const questionData = [
      {
        questionText: 'Which keyword is used to declare a variable that cannot be reassigned?',
        type: 'mcq',
        options: [
          { text: 'var', isCorrect: false },
          { text: 'let', isCorrect: false },
          { text: 'const', isCorrect: true },
          { text: 'static', isCorrect: false },
        ],
        correctAnswer: 'const',
        explanation: 'const declares a block-scoped, read-only named constant.',
        marks: 1, difficulty: 'easy',
      },
      {
        questionText: 'What does the "===" operator check in JavaScript?',
        type: 'mcq',
        options: [
          { text: 'Value only', isCorrect: false },
          { text: 'Type only', isCorrect: false },
          { text: 'Value and type (strict equality)', isCorrect: true },
          { text: 'Reference equality', isCorrect: false },
        ],
        correctAnswer: 'Value and type (strict equality)',
        explanation: '=== checks both value and type without type coercion.',
        marks: 1, difficulty: 'easy',
      },
      {
        questionText: 'Which of the following is NOT a valid way to create a function in JavaScript?',
        type: 'mcq',
        options: [
          { text: 'function myFunc() {}', isCorrect: false },
          { text: 'const myFunc = () => {}', isCorrect: false },
          { text: 'const myFunc = function() {}', isCorrect: false },
          { text: 'function: myFunc() {}', isCorrect: true },
        ],
        correctAnswer: 'function: myFunc() {}',
        explanation: 'function: myFunc() {} is not valid JavaScript syntax.',
        marks: 1, difficulty: 'medium',
      },
      {
        questionText: 'What will "typeof null" return in JavaScript?',
        type: 'mcq',
        options: [
          { text: '"null"', isCorrect: false },
          { text: '"undefined"', isCorrect: false },
          { text: '"object"', isCorrect: true },
          { text: '"boolean"', isCorrect: false },
        ],
        correctAnswer: '"object"',
        explanation: 'typeof null === "object" is a well-known JavaScript bug that persists for backward compatibility.',
        marks: 1, difficulty: 'hard',
      },
      {
        questionText: 'Which array method returns a new array with all elements that pass a test?',
        type: 'mcq',
        options: [
          { text: '.map()', isCorrect: false },
          { text: '.filter()', isCorrect: true },
          { text: '.reduce()', isCorrect: false },
          { text: '.find()', isCorrect: false },
        ],
        correctAnswer: '.filter()',
        explanation: '.filter() creates a new array with all elements that pass the provided function.',
        marks: 1, difficulty: 'easy',
      },
      {
        questionText: 'What is a JavaScript Promise and when would you use it?',
        type: 'short',
        correctAnswer: 'A Promise is an object representing the eventual completion or failure of an asynchronous operation. It has three states: pending, fulfilled, and rejected. You use it to handle async operations like API calls, file reading, or timers, allowing you to chain .then() for success and .catch() for errors instead of nesting callbacks.',
        explanation: 'Key points: async operation, three states, .then()/.catch() chaining',
        marks: 3, difficulty: 'medium',
      },
      {
        questionText: 'Explain the difference between "var", "let", and "const" in JavaScript.',
        type: 'short',
        correctAnswer: 'var is function-scoped and hoisted (can be used before declaration). let is block-scoped and not hoisted in the same way — it has a temporal dead zone. const is also block-scoped but additionally cannot be reassigned after initialization. Both let and const were introduced in ES6 to address issues with var.',
        explanation: 'Key points: scope, hoisting, reassignment, ES6',
        marks: 4, difficulty: 'medium',
      },
    ];

    const questions = await Question.insertMany(
      questionData.map(q => ({ ...q, createdBy: teacher._id, testId: test._id }))
    );

    await Test.findByIdAndUpdate(test._id, {
      $push: { questions: { $each: questions.map(q => q._id) } },
      totalMarks: questions.reduce((s, q) => s + q.marks, 0),
    });

    console.log(`✅ Demo test created: "${test.title}" (${questions.length} questions)`);
    console.log(`   Share link: /exam/join/${test.shareLink}`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(52));
    console.log('  🎓 EXAMIFY SEED COMPLETE');
    console.log('═'.repeat(52));
    console.log('  ACCOUNTS:');
    console.log('  Admin     → admin@examify.com     / admin123');
    console.log('  Teacher   → teacher@demo.com      / teacher123');
    console.log('  Student 1 → STU001                / student123');
    console.log('  Student 2 → STU002                / student123');
    console.log('  Student 3 → STU003                / student123');
    console.log('\n  DEMO TEST:');
    console.log(`  Title: JavaScript Fundamentals`);
    console.log(`  Link:  /exam/join/${test.shareLink}`);
    console.log('═'.repeat(52) + '\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
