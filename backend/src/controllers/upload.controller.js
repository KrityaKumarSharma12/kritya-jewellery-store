const uploadService = require('../services/upload.service');

// Re-export the multer middleware so the route file can use it unchanged
exports.uploadSingle = uploadService.singleUploadMiddleware;

// ============== HANDLE UPLOAD ==============
exports.handleUpload = async (req, res) => {
  try {
    const result = await uploadService.handleUpload(req);
    res.json(result);
  } catch (err) {
    console.error('Upload handler error:', err);
    if (err.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};