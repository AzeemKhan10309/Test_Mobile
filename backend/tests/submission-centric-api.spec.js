import request from 'supertest';
import app from '../server.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Test from '../models/Test.js';
import Question from '../models/Question.js';
import Submission from '../models/Submission.js';
import { generateAccessToken } from '../utils/jwt.js';

const authHeader = (user) => ({ Authorization: `Bearer ${generateAccessToken(user._id.toString(), user.role)}` });

async function seedTeacherStudent() {
  const teacher = await User.create({ name: 'Teacher One', email: 'teacher@example.com', password: 'Pass1234!', role: 'teacher' });
  const student = await User.create({ name: 'Student One', studentId: 'STU001', gender: 'male', password: 'Pass1234!', role: 'student' });
  const studentTwo = await User.create({ name: 'Student Two', studentId: 'STU002', gender: 'female', password: 'Pass1234!', role: 'student' });
  return { teacher, student, studentTwo };
}

describe('Submission-centric core API', () => {
  test('teacher can create + publish test with mcq/short/long and student can submit once', async () => {
    const { teacher, student } = await seedTeacherStudent();
    const course = await Course.create({ courseName: 'Algorithms', courseCode: 'CS501', teacher: teacher._id });

    const createRes = await request(app)
      .post('/api/tests')
      .set(authHeader(teacher))
      .send({ title: 'Midterm', courseId: course._id.toString(), duration: 60, passingMarks: 30 });

    expect(createRes.status).toBe(201);
    const testId = createRes.body.data._id;

    const q1 = await request(app).post(`/api/questions/test/${testId}`).set(authHeader(teacher)).send({
      questionText: '2 + 2 = ?',
      type: 'mcq',
      options: [{ text: '3', isCorrect: false }, { text: '4', isCorrect: true }],
      marks: 2,
    });
    expect(q1.status).toBe(201);

    const q2 = await request(app).post(`/api/questions/test/${testId}`).set(authHeader(teacher)).send({
      questionText: 'Define recursion',
      type: 'short',
      correctAnswer: 'A function calling itself',
      marks: 4,
    });
    expect(q2.status).toBe(201);

    const q3 = await request(app).post(`/api/questions/test/${testId}`).set(authHeader(teacher)).send({
      questionText: 'Explain divide-and-conquer strategy',
      type: 'long',
      correctAnswer: 'Break into subproblems...',
      marks: 6,
    });
    expect(q3.status).toBe(201);

    const publishRes = await request(app).post(`/api/tests/${testId}/publish`).set(authHeader(teacher));
    expect(publishRes.status).toBe(200);

    const startRes = await request(app).post('/api/submissions/start').set(authHeader(student)).send({ testId });
    expect(startRes.status).toBe(201);
    const submissionId = startRes.body.data.submission._id;

    const savedRes = await request(app)
      .put(`/api/submissions/${submissionId}/answers`)
      .set(authHeader(student))
      .send({ answers: [
        { questionId: q1.body.data._id, selectedOption: q1.body.data.options.find((o) => o.isCorrect)._id },
        { questionId: q2.body.data._id, textAnswer: 'Recursion repeats by self-invocation.' },
        { questionId: q3.body.data._id, textAnswer: 'Split problem, solve recursively, then merge.' },
      ]});

    expect(savedRes.status).toBe(200);

    const submitRes = await request(app).post(`/api/submissions/${submissionId}/submit`).set(authHeader(student));
    expect(submitRes.status).toBe(200);

    const duplicateStart = await request(app).post('/api/submissions/start').set(authHeader(student)).send({ testId });
    expect(duplicateStart.status).toBe(409);
    expect(duplicateStart.body.code).toBe('TEST_ALREADY_SUBMITTED');
  });

  test('courseId is mandatory on test creation', async () => {
    const { teacher } = await seedTeacherStudent();
    const res = await request(app).post('/api/tests').set(authHeader(teacher)).send({ title: 'No Course', duration: 30 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/courseId is required/i);
  });

  test('teacher evaluation list includes finalized + evaluated submissions', async () => {
    const { teacher, student, studentTwo } = await seedTeacherStudent();
    const course = await Course.create({ courseName: 'DBMS', courseCode: 'CS502', teacher: teacher._id });
    const testDoc = await Test.create({ title: 'Final', duration: 45, course: course._id, createdBy: teacher._id, status: 'published' });
    await Submission.create({ test: testDoc._id, student: student._id, status: 'finalized', isSubmitted: true, evaluationStatus: 'pending' });
    await Submission.create({ test: testDoc._id, student: studentTwo._id, status: 'evaluated', isSubmitted: true, evaluationStatus: 'completed' });

    const res = await request(app).get('/api/teacher/submissions').set(authHeader(teacher)).query({ courseId: course._id.toString() });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});