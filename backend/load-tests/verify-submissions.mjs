#!/usr/bin/env node
import process from 'node:process';

const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
const testId = process.env.TEST_ID;
const teacherEmail = process.env.TEACHER_EMAIL;
const teacherPassword = process.env.TEACHER_PASSWORD;
const expectedUsers = Number(process.env.EXPECTED_USERS || 120);

if (!testId || !teacherEmail || !teacherPassword) {
  console.error('Missing env. Required: TEST_ID, TEACHER_EMAIL, TEACHER_PASSWORD. Optional: BASE_URL, EXPECTED_USERS.');
  process.exit(1);
}

async function asJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response, got: ${text.slice(0, 300)}`);
  }
}

const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
});

const loginBody = await asJson(loginRes);
if (!loginRes.ok || !loginBody?.data?.accessToken) {
  console.error('Teacher login failed:', loginRes.status, JSON.stringify(loginBody));
  process.exit(2);
}

const token = loginBody.data.accessToken;

const submissionsRes = await fetch(`${baseUrl}/api/submissions/test/${testId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const submissionsBody = await asJson(submissionsRes);
if (!submissionsRes.ok || !Array.isArray(submissionsBody?.data)) {
  console.error('Could not fetch test submissions:', submissionsRes.status, JSON.stringify(submissionsBody));
  process.exit(3);
}

const submissions = submissionsBody.data;
const submissionIds = new Set(submissions.map((s) => String(s._id)));
const studentIds = new Set(submissions.map((s) => String(s.student?._id || s.student)));
const invalidStatus = submissions.filter((s) => !['submitted', 'graded', 'reviewed', 'finalized', 'evaluated'].includes(s.status));
const missingScores = submissions.filter((s) => s.totalScore === undefined || s.totalScore === null);

const summary = {
  testId,
  expectedUsers,
  totalFetched: submissions.length,
  uniqueSubmissionIds: submissionIds.size,
  uniqueStudentIds: studentIds.size,
  invalidStatusCount: invalidStatus.length,
  missingScoresCount: missingScores.length,
};

console.log(JSON.stringify(summary, null, 2));

let hasFailure = false;
if (submissions.length < expectedUsers) {
  console.error(`Missing submissions: expected at least ${expectedUsers}, got ${submissions.length}`);
  hasFailure = true;
}
if (submissionIds.size !== submissions.length) {
  console.error('Duplicate submission IDs detected.');
  hasFailure = true;
}
if (studentIds.size !== submissions.length) {
  console.error('Duplicate/missing student submissions detected (non-unique students).');
  hasFailure = true;
}
if (invalidStatus.length > 0) {
  console.error(`Invalid status rows detected: ${invalidStatus.length}`);
  hasFailure = true;
}
if (missingScores.length > 0) {
  console.error(`Submissions missing score/results: ${missingScores.length}`);
  hasFailure = true;
}

process.exit(hasFailure ? 4 : 0);