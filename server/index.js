import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { parsePDF } from './parsers/index.js';
import { parseShootListPDF } from './parsers/shootListParser.js';
import { detectVendor, getSupportedVendors } from './vendorDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const storage = multer.diskStorage({
  destination: '/tmp/fireworks-uploads/',
  filename: (req, file, cb) => {
    // Keep original filename with timestamp prefix
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage: storage,
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

// Serve saved invoice PDF
app.get('/api/invoice/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join('/tmp/fireworks-uploads', safeName);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving invoice:', error);
    res.status(404).json({ error: 'Invoice file not found' });
  }
});

// Delete saved invoice
app.delete('/api/invoice/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const safeName = path.basename(filename);
    const filePath = path.join('/tmp/fireworks-uploads', safeName);
    
    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice file' });
  }
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
    
    // Return result with saved file info (don't delete the file)
    res.json({
      items: result.items || result,
      orderInfo: result.orderInfo || null,
      vendor: vendor,
      detectedVendor: detectedVendor,
      fileName: req.file.originalname,
      savedFileName: req.file.filename, // Saved filename with timestamp
      filePath: filePath // Server-side path
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

// Shoot list upload endpoint
app.post('/api/parse-shootlist', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    
    // Parse the shoot list PDF
    const result = await parseShootListPDF(filePath);
    
    // Clean up the file after parsing
    await fs.unlink(filePath).catch(() => {});
    
    // Return result
    res.json({
      items: result.items,
      showInfo: result.showInfo,
      fileName: req.file.originalname
    });
    
  } catch (error) {
    console.error('Shoot list parsing error:', error);
    
    // Clean up file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to parse shoot list',
      message: error.message 
    });
  }
});

// Create upload directory
await fs.mkdir('/tmp/fireworks-uploads', { recursive: true });

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production' || process.env.PORT) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`PDF parser server running on http://localhost:${PORT}`);
});
