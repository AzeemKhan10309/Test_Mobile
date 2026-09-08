import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const createConnection = () => {
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL is required for evaluation queue in production');
    }
    return null;
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

const redisConnection = createConnection();

const evaluationQueue = redisConnection ? new Queue('evaluation-submissions', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
}) : null;

export const enqueueEvaluationJob = async ({ submissionId, testId }) => {
  if (!evaluationQueue) return null;

  return evaluationQueue.add(
    'evaluate-submission',
    { submissionId, testId },
    {
      jobId: `evaluate-submission:${submissionId}`,
    }
  );
};

export const getEvaluationQueue = () => evaluationQueue;
export const getQueueConnection = () => redisConnection;