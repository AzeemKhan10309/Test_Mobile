import mongoose from 'mongoose';

const attendanceStudentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      default: 'absent'
    }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
        course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    students: {
      type: [attendanceStudentSchema],
      default: []
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

//
// ✅ SAFE UNIQUE INDEX (FIXED FIELD NAME)
//
attendanceSchema.index(
  { course: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: {
      course: { $exists: true, $ne: null },
      date: { $exists: true }
    }
  }
);

//
// ✅ PREVENT DUPLICATE STUDENTS (GOOD)
//
attendanceSchema.pre('validate', function (next) {
  if (!this.course) {
    return next(new Error('Attendance requires a valid course'));
  }

  if (!Array.isArray(this.students)) return next();

  const seen = new Set();

  for (const row of this.students) {
    const id = row?.studentId?.toString();
    if (!id) continue;

    if (seen.has(id)) {
      return next(new Error(`Duplicate studentId: ${id}`));
    }

    seen.add(id);
  }

  next();
});

export default mongoose.model('Attendance', attendanceSchema);