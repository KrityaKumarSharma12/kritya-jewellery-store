const multer = require('multer');
const imagekit = require('../config/imagekit');

// ImageKit-backed Multer storage engine.
// Buffers the file in memory, uploads to ImageKit, and exposes
// `path`, `filename`, `mimetype`, `size` on req.file — matching
// what the rest of the app expects from disk storage.
class ImageKitStorage {
  _handleFile(req, file, cb) {
    const chunks = [];
    file.stream.on('data', (chunk) => chunks.push(chunk));
    file.stream.on('error', (err) => cb(err));
    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);

        // Preserve the original filename pattern (clean + timestamped)
        const ext = file.originalname.includes('.')
          ? '.' + file.originalname.split('.').pop()
          : '';
        const base = file.originalname
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase()
          .slice(0, 60);
        const safeName = `${base}-${Date.now()}${ext}`;

        const result = await imagekit.upload({
          file: buffer,
          fileName: safeName,
          folder: '/kritya-uploads',
          useUniqueFileName: true,
        });

        cb(null, {
          path: result.url,          // full https://ik.imagekit.io/... URL
          filename: result.fileId,   // ImageKit file ID (for future delete)
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: result.size,
        });
      } catch (err) {
        cb(err);
      }
    });
  }

  _removeFile(req, file, cb) {
    // Optional: delete from ImageKit if needed later.
    // For now, do nothing — orphan cleanup can be a separate task.
    cb(null);
  }
}

const storage = new ImageKitStorage();

const multerUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB — same as before
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (!ok) return cb(new Error('Only image or video files are allowed'));
    cb(null, true);
  },
});

class UploadService {
  // Exposed for the route file to use as middleware — unchanged
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

    // req.file.path is now the ImageKit URL, not a local path
    return {
      url: req.file.path,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
  }
}

module.exports = new UploadService();