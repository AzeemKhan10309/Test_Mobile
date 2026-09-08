import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import Test from '../models/Test.js';
import Course from '../models/Course.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examify';
const DEFAULT_COURSE_ID = process.env.MIGRATION_DEFAULT_COURSE_ID || null;

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const orphanTests = await Test.find({
    $or: [
      { course: { $exists: false } },
      { course: null },
    ],
  }).select('_id title createdBy').lean();

  if (orphanTests.length === 0) {
    console.log('ℹ️ No tests found without course mapping.');
    await mongoose.disconnect();
    return;
  }

  const updates = [];
  const unresolved = [];

  for (const test of orphanTests) {
    const teacherCourses = await Course.find({ teacher: test.createdBy }).select('_id').lean();

    let mappedCourseId = null;
    if (teacherCourses.length === 1) {
      mappedCourseId = teacherCourses[0]._id;
    } else if (isValidObjectId(DEFAULT_COURSE_ID)) {
      mappedCourseId = DEFAULT_COURSE_ID;
    }

    if (!mappedCourseId) {
      unresolved.push({ testId: test._id, title: test.title, teacherId: test.createdBy, teacherCourseCount: teacherCourses.length });
      continue;
    }

    updates.push({
      updateOne: {
        filter: { _id: test._id },
        update: { $set: { course: mappedCourseId } },
      },
    });
  }

  if (updates.length > 0) {
    const result = await Test.bulkWrite(updates, { ordered: false });
    console.log(`✅ Migrated ${result.modifiedCount || 0} tests with inferred/default courseId.`);
  }

  if (unresolved.length > 0) {
    console.warn(`⚠️ ${unresolved.length} tests still unresolved (multiple/no teacher courses and no default).`);
    unresolved.forEach((row) => {
      console.warn(` - test=${row.testId} title="${row.title}" teacher=${row.teacherId} teacherCourses=${row.teacherCourseCount}`);
    });
    process.exitCode = 2;
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('❌ Migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // noop
  }
  process.exit(1);
});
