/**
 * Optional alerting hook for abnormal auth activity.
 */

const ALERT_TIMEOUT_MS = 4000;

export const sendSecurityAlert = async (payload) => {
  const webhookUrl = process.env.AUTH_ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    console.error('Auth alert webhook failed:', error.message);
  } finally {
    clearTimeout(timeout);
  }
};