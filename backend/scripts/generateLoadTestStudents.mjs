#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
const count = Number(process.env.LOAD_STUDENT_COUNT || 150);
const startIndex = Number(process.env.LOAD_STUDENT_START || 1);
const password = process.env.LOAD_STUDENT_PASSWORD || 'LoadTest@123';
const outputFile = process.env.LOAD_STUDENT_OUTPUT || 'backend/load-tests/data/students.json';

const students = [];

for (let i = 0; i < count; i += 1) {
  const serial = String(startIndex + i).padStart(4, '0');
  const studentId = `LOAD${serial}`;
  const body = {
    name: `Load Student ${serial}`,
    studentId,
    password,
    gender: i % 2 === 0 ? 'male' : 'female',
  };

  const registerRes = await fetch(`${baseUrl}/api/auth/register/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await registerRes.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response while registering ${studentId}: ${text.slice(0, 300)}`);
  }

  if (registerRes.status === 201 || registerRes.status === 409) {
    students.push({ studentId, password });
    process.stdout.write(`Prepared ${studentId} (${i + 1}/${count})\n`);
    continue;
  }

  throw new Error(`Failed to prepare ${studentId}: status=${registerRes.status} body=${JSON.stringify(parsed)}`);
}

await fs.mkdir(path.dirname(outputFile), { recursive: true });
await fs.writeFile(outputFile, JSON.stringify(students, null, 2));

process.stdout.write(`\nWrote ${students.length} students to ${outputFile}\n`);