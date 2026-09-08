export const sendError = (res, statusCode, code, message, details) => {
  const payload = {
    success: false,
    message,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return res.status(statusCode).json(payload);
};

export const sendSuccess = (res, statusCode, data = {}, message) => {
  const payload = {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  };
  return res.status(statusCode).json(payload);
};
