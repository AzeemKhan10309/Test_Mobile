import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';
import { Counter, Trend } from 'k6/metrics';

// ---------------- CONFIG ----------------
const baseUrl = __ENV.BASE_URL || 'http://localhost:5000';
const testId = __ENV.TEST_ID;

// ✅ FIXED PATH (you are inside backend)
const usersFile = __ENV.USERS_FILE || './data/students.json';
const users = new SharedArray('students', () =>
  JSON.parse(open(usersFile))
);

const expectedUsers = Number(__ENV.EXPECTED_USERS || 50); // start small
const resultPollAttempts = Number(__ENV.RESULT_POLL_ATTEMPTS || 10);
const resultPollSleepSeconds = Number(__ENV.RESULT_POLL_SLEEP_SECONDS || 1);
const startAccessCode = __ENV.TEST_ACCESS_CODE;

if (!testId) {
  throw new Error('TEST_ID is required');
}

if (users.length < expectedUsers) {
  throw new Error(`Not enough users in ${usersFile}`);
}

// ---------------- METRICS ----------------
const submitFailureCounter = new Counter('submit_failures');
const resultFailureCounter = new Counter('result_failures');
const submitDuration = new Trend('submit_duration_ms', true);
const resultDuration = new Trend('result_duration_ms', true);
const startFailureCounter = new Counter('start_failures');
// ---------------- LOAD STRATEGY (FIXED) ----------------
export const options = {
  scenarios: {
    student_exam_flow: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 20 },
        { duration: '30s', target: expectedUsers },
      ],
    },
  },
};

// ---------------- HELPERS ----------------
function jsonHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: '60s',
  };
}

function selectUser() {
 const globalIteration = exec.scenario.iterationInTest;
  return users[globalIteration % users.length];
}

function logFailure(stage, response) {
  const body = (response && response.body) ? String(response.body).slice(0, 500) : '<no body>';
  console.error(`[${stage}] status=${response?.status} body=${body}`);
}

// ---------------- MAIN FLOW ----------------
export default function () {
  const student = selectUser(); // ✅ FIXED (removed :)

  // ---------------- LOGIN ----------------
  const loginRes = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      studentId: student.studentId,
      password: student.password,
    }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '60s' }
  );

  let token = null;

  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login token exists': (r) => {
      try {
        token = r.json('data.accessToken');
        return !!token;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginOk) {
        logFailure('login', loginRes);
    submitFailureCounter.add(1);
    return;
  }

  // ---------------- START TEST ----------------
  const startRes = http.post(
    `${baseUrl}/api/submissions/start`,
    JSON.stringify({
      testId,
      ...(startAccessCode ? { accessCode: startAccessCode } : {}),
    }),    jsonHeaders(token)
  );

  let submissionId = null;

  const startOk = check(startRes, {
    'start ok': (r) => {
      try {
        submissionId = r.json('data.submission._id');
        return (r.status === 200 || r.status === 201) && !!submissionId;      } catch {
        return false;
      }
    },
  });

  if (!startOk) {
    logFailure('start', startRes);
    startFailureCounter.add(1);
    submitFailureCounter.add(1);
    return;
  }

  // ---------------- SUBMIT ----------------
  const submitRes = http.post(
    `${baseUrl}/api/submissions/${submissionId}/submit`,
    JSON.stringify({}),
    jsonHeaders(token)
  );

  submitDuration.add(submitRes.timings.duration);

  const submitOk = check(submitRes, {
    'submit ok': (r) => r.status === 200,
  });

  if (!submitOk) {
        logFailure('submit', submitRes);
    submitFailureCounter.add(1);
    return;
  }

  // ---------------- RESULT ----------------
  let resultReady = false;

  for (let i = 0; i < resultPollAttempts; i++) {
    const resultRes = http.get(
      `${baseUrl}/api/submissions/${submissionId}/result`,
      jsonHeaders(token)
    );

    resultDuration.add(resultRes.timings.duration);

    const ok = check(resultRes, {
      'result ok': (r) => {
        try {
          return r.status === 200 && r.json('data.totalScore') !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (ok) {
      resultReady = true;
      break;
    }

    sleep(resultPollSleepSeconds);
  }

  if (!resultReady) {
    resultFailureCounter.add(1);
  }

  sleep(1);
}

// ---------------- SUMMARY ----------------
export function handleSummary(data) {
  return {
    stdout: JSON.stringify(data, null, 2),
    'load-tests/results/k6-summary.json': JSON.stringify(data, null, 2),
  };
}