import User from '../models/User.js';
import { sendResultNotification } from './emailService.js';

const queue = [];
let processing = false;

export const enqueuePostSubmitJob = (job) => {
  queue.push(job);
  if (!processing) {
    processing = true;
    setImmediate(processQueue);
  }
};

const processQueue = async () => {
  while (queue.length > 0) {
    const job = queue.shift();
    try {
      const studentUser = await User.findById(job.studentId).select('name email');
      if (studentUser?.email) {
        await sendResultNotification({
          to: studentUser.email,
          studentName: studentUser.name,
          testTitle: job.testTitle,
          score: job.totalScore,
          percentage: job.percentage,
          grade: job.grade,
          isPassed: job.isPassed,
          submissionId: job.submissionId,
        });
      }
    } catch (_) {
      // noop: queue worker should not break request cycle
    }
  }
  processing = false;
};