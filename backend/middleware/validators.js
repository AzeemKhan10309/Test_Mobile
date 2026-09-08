import { z } from 'zod';
import { sendError } from '../utils/apiResponse.js';

const sendValidationError = (req, res, error) => {
  const issues = error.issues || [];
  const message = issues[0]?.message || 'Validation failed';
  console.warn('[validation] Request body failed validation', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    issues: issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message, code: issue.code })),
  });
  return sendError(res, 400, 'VALIDATION_ERROR', message, { issues });
};

export const validateBody = (schema) => (req, res, next) => {
  if (!req.is('application/json') && !req.is('application/x-www-form-urlencoded') && Object.keys(req.body || {}).length === 0) {
    console.warn('[validation] Empty or unparsed request body', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      contentType: req.headers['content-type'],
    });
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(req, res, parsed.error);
  req.validatedBody = parsed.data;
  return next();
};
const normalizedString = (fieldName, max = 120) => z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string({ required_error: `${fieldName} is required` }).min(1, `${fieldName} is required`).max(max, `${fieldName} is too long`)
);

const phoneSchema = (fieldName) => z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z.string({ required_error: `${fieldName} is required` })
    .min(1, `${fieldName} is required`)
    .max(25, `${fieldName} is too long`)
    .regex(/^[+\d][\d\s().-]{6,24}$/, `${fieldName} must be a valid phone number`)
);

export const registerStudentSchema = z.object({
  name: normalizedString('Name', 120),
  studentId: normalizedString('Student ID', 50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
 gender: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['male', 'female'], { errorMap: () => ({ message: 'Gender must be male or female' }) })
  ),
  personalPhone: phoneSchema('Student personal number'),
  guardianPhone: phoneSchema('Guardian number'),
  area: normalizedString('Student area/location', 120),
});

export const registerTeacherSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().optional(),
  studentId: z.string().trim().min(1).optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((data) => Boolean(data.email || data.studentId), {
  message: 'Email or Student ID is required',
  path: ['email'],
});

export const forgotPasswordSchema = z.object({
 email: z.string().trim().email('Valid email is required').optional(),
  studentId: z.string().trim().min(1, 'Student ID is required').max(64).optional(),
}).refine((data) => Boolean(data.email || data.studentId), {
  message: 'Email or Student ID is required',
  path: ['email'],
});

export const resetPasswordSchema = z.object({
 email: z.string().trim().email('Valid email is required').optional(),
  studentId: z.string().trim().min(1, 'Student ID is required').max(64).optional(),
    code: z.string().trim().regex(/^\d{6}$/, 'Code must be a 6-digit number'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }).refine((data) => Boolean(data.email || data.studentId), {
  message: 'Email or Student ID is required',
  path: ['email'],
});

export const startTestSchema = z.object({
  testId: z.string().trim().min(1, 'testId is required'),
  accessCode: z.string().trim().max(32).optional(),
});

export const saveAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().trim().min(1),
      selectedOption: z.string().trim().max(100).optional(),
      textAnswer: z.string().trim().max(5000).optional(),
      markedForReview: z.boolean().optional(),
    }),
  ).min(1).max(200),
});

export const cheatingFlagSchema = z.object({
  type: z.enum([
    'tab_switch', 'window_blur', 'copy_paste', 'right_click',
    'keyboard_shortcut', 'face_not_detected', 'multiple_faces',
    'looking_away', 'phone_detected', 'screenshot',
    'inactivity', 'multiple_screen_exit',
  ]),
  details: z.string().trim().max(500).optional(),
  screenshot: z.string().trim().max(300000).optional(),
  heartbeatToken: z.string().trim().max(200).optional(),
});


export const retakeRequestSchema = z.object({
  testId: z.string().trim().min(1, 'testId is required'),
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters').max(2000),
});
export const retakeDecisionSchema = z.object({
  message: z.string().trim().max(500, 'Message must be at most 500 characters').optional().default(''),
});

