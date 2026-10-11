const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const dir = path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(dir, { recursive: true });

const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (_req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype]
      ? cb(null, true)
      : cb(Object.assign(new Error('Signature must be a PNG, JPG or WEBP image'), { status: 400 })),
});

const removeFile = (name) => {
  if (!name) return;
  fs.unlink(path.join(dir, name), () => {});
};

module.exports = { upload, removeFile, uploadDir: dir };
