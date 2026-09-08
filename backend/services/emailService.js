/**
 * Email Service (Nodemailer)
 * Sends exam invites, result notifications, reminders
 */

import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
    console.warn('⚠️  Email not configured — notifications disabled (set EMAIL_USER/EMAIL_PASS in .env)');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

const FROM = process.env.EMAIL_FROM || 'Examify <noreply@examify.com>';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Email Templates ──────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background:#0a0f1e; margin:0; padding:20px; }
    .container { max-width:560px; margin:0 auto; background:#111827; border-radius:16px; overflow:hidden; border:1px solid #1e2d4a; }
    .header { background:linear-gradient(135deg,#4f46e5,#7c3aed); padding:32px 40px; text-align:center; }
    .header h1 { color:white; margin:0; font-size:28px; letter-spacing:-0.5px; }
    .header p { color:rgba(255,255,255,0.7); margin:8px 0 0; font-size:14px; }
    .body { padding:32px 40px; }
    .body h2 { color:#f1f5f9; font-size:20px; margin:0 0 16px; }
    .body p { color:#94a3b8; font-size:15px; line-height:1.6; margin:0 0 16px; }
    .stat-row { display:flex; gap:12px; margin:20px 0; }
    .stat { flex:1; background:#1a2234; border:1px solid #1e2d4a; border-radius:10px; padding:14px; text-align:center; }
    .stat .value { color:#f1f5f9; font-size:22px; font-weight:800; }
    .stat .label { color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; margin-top:4px; }
    .btn { display:inline-block; background:#6366f1; color:white!important; padding:14px 28px; border-radius:10px; text-decoration:none; font-weight:700; font-size:15px; margin:8px 0; }
    .btn:hover { background:#4f46e5; }
    .footer { padding:20px 40px; border-top:1px solid #1e2d4a; text-align:center; }
    .footer p { color:#334155; font-size:12px; margin:0; }
    .badge { display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; }
    .badge-success { background:#064e3b; color:#10b981; }
    .badge-danger { background:#450a0a; color:#ef4444; }
    .badge-info { background:#1e1b4b; color:#818cf8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Examify</h1>
      <p>AI-Powered Examination System</p>
    </div>
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} Examify · You're receiving this because you're registered on our platform.</p>
    </div>
  </div>
</body>
</html>`;

// ─── Send helpers ─────────────────────────────────────────────────────────────

const send = async (to, subject, html) => {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
};

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Send exam invitation to a student
 */
export const sendExamInvite = async ({ to, studentName, testTitle, teacherName, startTime, duration, shareLink }) => {
  const examUrl = `${FRONTEND}/exam/join/${shareLink}`;
  const html = baseTemplate(`
    <div class="body">
      <h2>You're invited to take an exam 📋</h2>
      <p>Hi <strong style="color:#f1f5f9">${studentName}</strong>,</p>
      <p><strong style="color:#f1f5f9">${teacherName}</strong> has invited you to take the following exam:</p>
      <div class="stat-row">
        <div class="stat">
          <div class="value" style="font-size:16px">${testTitle}</div>
          <div class="label">Exam Title</div>
        </div>
        <div class="stat">
          <div class="value">${duration}</div>
          <div class="label">Minutes</div>
        </div>
      </div>
      ${startTime ? `<p style="color:#94a3b8">📅 Scheduled: <strong style="color:#f1f5f9">${new Date(startTime).toLocaleString()}</strong></p>` : ''}
      <div style="text-align:center;margin:24px 0">
        <a href="${examUrl}" class="btn">🚀 Start Exam</a>
      </div>
      <p style="font-size:13px;color:#475569">Or copy this link: <code style="color:#818cf8">${examUrl}</code></p>
    </div>
  `);
  return send(to, `📋 Exam Invitation: ${testTitle}`, html);
};

/**
 * Send result notification to a student
 */
export const sendResultNotification = async ({ to, studentName, testTitle, score, percentage, grade, isPassed, submissionId }) => {
  const resultUrl = `${FRONTEND}/exam/result/${submissionId}`;
  const html = baseTemplate(`
    <div class="body">
      <h2>Your exam results are ready 📊</h2>
      <p>Hi <strong style="color:#f1f5f9">${studentName}</strong>,</p>
      <p>Your results for <strong style="color:#f1f5f9">${testTitle}</strong> have been processed.</p>
      <div class="stat-row">
        <div class="stat">
          <div class="value" style="color:${isPassed?'#10b981':'#ef4444'}">${grade}</div>
          <div class="label">Grade</div>
        </div>
        <div class="stat">
          <div class="value">${percentage?.toFixed(1)}%</div>
          <div class="label">Score %</div>
        </div>
        <div class="stat">
          <div class="value" style="color:${isPassed?'#10b981':'#ef4444'}">${isPassed?'PASS':'FAIL'}</div>
          <div class="label">Result</div>
        </div>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${resultUrl}" class="btn">📋 View Full Report</a>
      </div>
    </div>
  `);
  return send(to, `📊 Results: ${testTitle} — Grade ${grade}`, html);
};

/**
 * Send exam reminder
 */
export const sendExamReminder = async ({ to, studentName, testTitle, startTime, shareLink }) => {
  const examUrl = `${FRONTEND}/exam/join/${shareLink}`;
  const html = baseTemplate(`
    <div class="body">
      <h2>⏰ Exam Reminder</h2>
      <p>Hi <strong style="color:#f1f5f9">${studentName}</strong>,</p>
      <p>This is a reminder that your exam <strong style="color:#f1f5f9">${testTitle}</strong> starts soon.</p>
      <p>📅 Start Time: <strong style="color:#f1f5f9">${new Date(startTime).toLocaleString()}</strong></p>
      <div style="text-align:center;margin:24px 0">
        <a href="${examUrl}" class="btn">🎯 Go to Exam</a>
      </div>
    </div>
  `);
  return send(to, `⏰ Reminder: ${testTitle} starts soon`, html);
};

/**
 * Send teacher summary after test ends
 */
export const sendTeacherSummary = async ({ to, teacherName, testTitle, totalAttempts, averageScore, passRate }) => {
  const html = baseTemplate(`
    <div class="body">
      <h2>Test Summary 📈</h2>
      <p>Hi <strong style="color:#f1f5f9">${teacherName}</strong>,</p>
      <p>Your test <strong style="color:#f1f5f9">${testTitle}</strong> has ended. Here's a summary:</p>
      <div class="stat-row">
        <div class="stat">
          <div class="value">${totalAttempts}</div>
          <div class="label">Attempts</div>
        </div>
        <div class="stat">
          <div class="value">${averageScore?.toFixed(1)}%</div>
          <div class="label">Avg Score</div>
        </div>
        <div class="stat">
          <div class="value">${passRate?.toFixed(0)}%</div>
          <div class="label">Pass Rate</div>
        </div>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${FRONTEND}/teacher/analytics" class="btn">📊 View Analytics</a>
      </div>
    </div>
  `);
  return send(to, `📈 Test Complete: ${testTitle}`, html);
};

export const sendPasswordResetInstructions = async ({ to, userName, resetToken, expiresMinutes = 20 }) => {
  const html = baseTemplate(`
    <div class="body">
      <h2>Password reset request 🔐</h2>
      <p>Hi <strong style="color:#f1f5f9">${userName || 'there'}</strong>,</p>
      <p>Use the one-time token below to reset your password. It expires in ${expiresMinutes} minutes.</p>
      <div style="background:#1a2234;border:1px solid #1e2d4a;border-radius:10px;padding:14px;margin:18px 0;">
        <p style="color:#f1f5f9;font-size:14px;word-break:break-all;margin:0;font-family:monospace;">${resetToken}</p>
      </div>
      <p style="font-size:13px;color:#64748b;">If you did not request this, you can ignore this email.</p>
    </div>
  `);

  return send(to, '🔐 Password reset instructions', html);
};

export default {
  sendExamInvite,
  sendResultNotification,
  sendExamReminder,
  sendTeacherSummary,
  sendPasswordResetInstructions,
};