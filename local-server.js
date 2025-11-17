const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for files and metadata
const fileStorage = new Map();
const fileMetadata = new Map();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 
      'audio/mpeg', 'audio/wav',
      'text/plain', 'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Supported: images, videos, audio, text, PDF'), false);
    }
  }
});

// Generate short code
function generateShortCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Check if previewable
function isPreviewable(mimetype) {
  return mimetype.startsWith('image/') || 
         mimetype.startsWith('video/') || 
         mimetype.startsWith('audio/') || 
         mimetype.startsWith('text/') ||
         mimetype === 'application/pdf';
}

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file selected or file type not supported'
      });
    }

    const fileId = uuidv4();
    const shortCode = generateShortCode();
    const expirationTime = Date.now() + (3 * 60 * 60 * 1000); // 3 hours

    // Store file in memory
    fileStorage.set(fileId, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      size: req.file.size
    });

    // Store metadata
    fileMetadata.set(fileId, {
      fileId,
      shortCode,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadTime: new Date().toISOString(),
      expirationTime,
      previewable: isPreviewable(req.file.mimetype),
      downloadUrl: `/api/download/${shortCode}`,
      previewUrl: isPreviewable(req.file.mimetype) ? `/api/preview/${shortCode}` : null
    });

    console.log(`📁 Uploaded: ${req.file.originalname} -> ${shortCode}`);

    // Auto cleanup after 3 hours
    setTimeout(() => {
      if (fileStorage.has(fileId)) {
        fileStorage.delete(fileId);
        fileMetadata.delete(fileId);
        console.log(`🧹 Cleaned up: ${shortCode}`);
      }
    }, 3 * 60 * 60 * 1000);

    res.json({
      success: true,
      shortCode,
      downloadUrl: `/api/download/${shortCode}`,
      previewUrl: isPreviewable(req.file.mimetype) ? `/api/preview/${shortCode}` : null,
      filename: req.file.originalname,
      size: req.file.size,
      previewable: isPreviewable(req.file.mimetype),
      expiresAt: new Date(expirationTime).toLocaleString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed: ' + error.message
    });
  }
});

// Download endpoint
app.get('/api/download/:code', (req, res) => {
  try {
    const code = req.params.code;
    
    // Find file by short code
    let fileId = null;
    let metadata = null;
    
    for (const [id, meta] of fileMetadata.entries()) {
      if (meta.shortCode === code) {
        fileId = id;
        metadata = meta;
        break;
      }
    }

    if (!fileId || !metadata) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileData = fileStorage.get(fileId);
    if (!fileData) {
      return res.status(404).json({ error: 'File data not found' });
    }

    if (Date.now() > metadata.expirationTime) {
      fileStorage.delete(fileId);
      fileMetadata.delete(fileId);
      return res.status(410).json({ error: 'File has expired' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
    res.setHeader('Content-Type', metadata.mimetype);
    res.send(fileData.buffer);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Preview endpoint
app.get('/api/preview/:code', (req, res) => {
  try {
    const code = req.params.code;
    
    // Find file by short code
    let fileId = null;
    let metadata = null;
    
    for (const [id, meta] of fileMetadata.entries()) {
      if (meta.shortCode === code) {
        fileId = id;
        metadata = meta;
        break;
      }
    }

    if (!fileId || !metadata) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!metadata.previewable) {
      return res.status(403).json({ error: 'File cannot be previewed' });
    }

    const fileData = fileStorage.get(fileId);
    if (!fileData) {
      return res.status(404).json({ error: 'File data not found' });
    }

    if (Date.now() > metadata.expirationTime) {
      fileStorage.delete(fileId);
      fileMetadata.delete(fileId);
      return res.status(410).json({ error: 'File has expired' });
    }

    res.setHeader('Content-Disposition', `inline; filename="${metadata.originalName}"`);
    res.setHeader('Content-Type', metadata.mimetype);
    res.send(fileData.buffer);

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Preview failed' });
  }
});

// Start local server
app.listen(PORT, () => {
  console.log(`🚀 Local server running on http://localhost:${PORT}`);
  console.log(`📁 File storage: In-memory`);
  console.log(`⏰ Files expire: 3 hours`);
});
