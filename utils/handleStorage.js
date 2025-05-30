const multer = require("multer");

const memoryStorage = multer.memoryStorage();

const uploadMiddlewareMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadMiddlewareMemory };
