const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Absolute path to /backend/uploads
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Create folder if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .slice(0, 60);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (!ok) return cb(new Error('Only image or video files are allowed'));
    cb(null, true);
  },
});

class UploadService {
  // Exposed for the route file to use as middleware
  get singleUploadMiddleware() {
    return multerUpload.single('file');
  }

  // ============== HANDLE UPLOAD ==============
  async handleUpload(req) {
    if (!req.file) {
      const err = new Error('No file provided');
      err.statusCode = 400;
      throw err;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    return {
      url,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
  }
}

module.exports = new UploadService();