/**
 * Notification Service
 * Creates in-app notifications and sends emails
 */

import Notification from '../models/Notification.js';
import { sendExamInvite, sendResultNotification, sendExamReminder } from './emailService.js';

/**
 * Create a notification and emit via socket
 */
export const createNotification = async (io, { recipientId, type, title, message, data = {} }) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      data,
    });

    // Real-time push via socket
    if (io) {
      io.to(`user:${recipientId}`).emit('new_notification', {
        _id: notification._id,
        type,
        title,
        message,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    console.error('Notification create error:', err.message);
    return null;
  }
};

/**
 * Notify student when exam is published / invited
 */
export const notifyExamInvite = async (io, { student, test }) => {
  const title = `New Exam: ${test.title}`;
  const message = `You have been invited to take "${test.title}". Duration: ${test.duration} minutes.`;

  await createNotification(io, {
    recipientId: student._id,
    type: 'test_invite',
    title,
    message,
    data: { testId: test._id, shareLink: test.shareLink },
  });

  // Send email if student has email
  if (student.email) {
    await sendExamInvite({
      to: student.email,
      studentName: student.name,
      testTitle: test.title,
      teacherName: test.createdBy?.name || 'Your Teacher',
      startTime: test.startTime,
      duration: test.duration,
      shareLink: test.shareLink,
    });
  }
};

/**
 * Notify student when their result is ready
 */
export const notifyResultReady = async (io, { student, submission, test }) => {
  const title = `Result: ${test.title}`;
  const message = `Your result is ready. Score: ${submission.percentage?.toFixed(1)}% — Grade: ${submission.grade}`;

  await createNotification(io, {
    recipientId: student._id,
    type: 'result_ready',
    title,
    message,
    data: { submissionId: submission._id, testId: test._id },
  });

  if (student.email) {
    await sendResultNotification({
      to: student.email,
      studentName: student.name,
      testTitle: test.title,
      score: submission.totalScore,
      percentage: submission.percentage,
      grade: submission.grade,
      isPassed: submission.isPassed,
      submissionId: submission._id,
    });
  }
};

/**
 * Notify all enrolled students about an upcoming test
 */
export const notifyTestReminder = async (io, { students, test }) => {
  await Promise.allSettled(
    students.map(student =>
      createNotification(io, {
        recipientId: student._id,
        type: 'reminder',
        title: `Reminder: ${test.title} starts soon`,
        message: `Your exam "${test.title}" starts at ${new Date(test.startTime).toLocaleString()}.`,
        data: { testId: test._id, shareLink: test.shareLink },
      })
    )
  );
};

/**
 * System notification broadcast
 */
export const notifySystem = async (io, { userIds, title, message }) => {
  await Promise.allSettled(
    userIds.map(id =>
      createNotification(io, {
        recipientId: id,
        type: 'system',
        title,
        message,
      })
    )
  );
};
