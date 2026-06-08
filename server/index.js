import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { parsePDF } from './parsers/index.js';
import { detectVendor, getSupportedVendors } from './vendorDetector.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins in production, specific origin in dev
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://inventory-manager.kcap.club', 'https://fireworks-inventory.onrender.com']
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.split('://')[1]) || origin === allowed)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  }
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/fireworks-uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get supported vendors
app.get('/api/vendors', (req, res) => {
  res.json({ vendors: getSupportedVendors() });
});

// PDF upload endpoint
app.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const vendorHint = req.body.vendor; // Optional vendor override from frontend
    
    // Detect vendor first
    const detectedVendor = await detectVendor(filePath);
    const vendor = vendorHint || detectedVendor;
    
    if (!vendor) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ 
        error: 'Could not detect vendor',
        message: 'Please select vendor manually and try again',
        needsVendorSelection: true
      });
    }
    
    // Parse the PDF using detected/specified vendor
    const result = await parsePDF(filePath, vendor);
    
    // Clean up uploaded file
    await fs.unlink(filePath).catch(() => {});
    
    res.json({
      items: result.items || result,
      orderInfo: result.orderInfo || null,
      vendor: vendor,
      detectedVendor: detectedVendor,
      fileName: req.file.originalname
    });
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Clean up file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to parse PDF',
      message: error.message 
    });
  }
});

// Create upload directory
await fs.mkdir('/tmp/fireworks-uploads', { recursive: true });

app.listen(PORT, () => {
  console.log(`PDF parser server running on http://localhost:${PORT}`);
});
