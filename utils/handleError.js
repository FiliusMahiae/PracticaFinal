const handleHttpError = (res, messageSend, code = 403) => {
  return res.status(code).json({ message: messageSend });
};

module.exports = { handleHttpError };
