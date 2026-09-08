import mongoose from 'mongoose';

const reconcileAttendanceIndexes = async () => {
  const collection = mongoose.connection.db.collection('attendances');
  let existingIndexes = [];

  try {
    existingIndexes = await collection.indexes();
  } catch (error) {
    if (error?.codeName !== 'NamespaceNotFound' && error?.code !== 26) {
      throw error;
    }

    console.info('ℹ️ Attendance collection does not exist yet; it will be created with fresh indexes.');
  }

  for (const idx of existingIndexes) {
    const keys = Object.keys(idx.key || {});

    const hasLegacyCourseId = keys.includes('courseId');
    const hasStudentNestedUnique =
      idx.unique === true && keys.includes('students.studentId');

    const isLegacyTeacherDateUnique =
      idx.unique === true &&
      keys.length === 2 &&
      keys.includes('markedBy') &&
      keys.includes('date');

    if (hasLegacyCourseId || hasStudentNestedUnique || isLegacyTeacherDateUnique) {
      await collection.dropIndex(idx.name);
      console.warn(`⚠️ Dropped legacy index: ${idx.name}`);
    }
  }

await collection.createIndex(
  { course: 1, date: 1 },
  {
    unique: true,
    name: 'course_1_date_1'
  }
);
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    await reconcileAttendanceIndexes();

  } catch (error) {
    console.error('❌ MongoDB Error:', error);
    process.exit(1);
  }
};