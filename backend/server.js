require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5002;

// Enable CORS for all routes
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Middleware to parse JSON
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Psaltos Backend API is running' });
});

// Admin routes (local use only)
app.use('/api/admin', adminRoutes);

// Audio proxy endpoint
app.get('/api/audio/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`Proxying audio request for: ${url}`);

    // Forward Range header to support browser seeking
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };
    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
      console.log(`Range request forwarded: ${req.headers.range}`);
    }

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: upstreamHeaders,
      timeout: 30000,
    });

    const upstreamContentType = response.headers['content-type'] || '';
    console.log(`Upstream response: status=${response.status}, content-type=${upstreamContentType}, content-length=${response.headers['content-length']}`);

    // Build response headers — let cors() middleware handle CORS, don't set them here
    const responseHeaders = {
      'Content-Type': upstreamContentType || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };
    if (response.headers['content-length']) {
      responseHeaders['Content-Length'] = response.headers['content-length'];
    }
    if (response.headers['content-range']) {
      responseHeaders['Content-Range'] = response.headers['content-range'];
    }

    res.status(response.status === 206 ? 206 : 200).set(responseHeaders);

    // Handle stream errors that occur after headers are sent
    response.data.on('error', (streamErr) => {
      console.error('Upstream stream error:', streamErr.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Upstream stream failed' });
      } else {
        res.end();
      }
    });

    response.data.pipe(res);

  } catch (error) {
    console.error('Error proxying audio:', error.message);

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(404).json({ error: 'Audio file not found or server unreachable' });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({ error: 'Request timeout' });
    }

    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch audio file', details: error.message });
    }
  }
});

// Contact form endpoint
app.post('/api/contact', upload.single('attachment'), async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    console.log(`Received contact form submission from: ${email}`);

    // Prepare email content
    let emailContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${escapeHtml(message).replace(/\n/g, '<br>')}
      </div>
      <hr>
      <p><small>This message was sent from the Psaltos contact form.</small></p>
    `;

    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'psaltoshymns@gmail.com',
      subject: `Psaltos Contact Form: ${subject}`,
      html: emailContent,
      replyTo: email
    };

    // Add attachment if present
    if (req.file) {
      mailOptions.attachments = [{
        filename: req.file.originalname,
        content: req.file.buffer
      }];
      console.log(`Attachment included: ${req.file.originalname} (${req.file.size} bytes)`);
    }

    // Send email
    await transporter.sendMail(mailOptions);
    
    console.log(`Contact form email sent successfully to psaltoshymns@gmail.com`);
    res.json({ success: true, message: 'Message sent successfully' });

  } catch (error) {
    console.error('Error sending contact form email:', error);
    
    if (error.code === 'EAUTH') {
      return res.status(500).json({ error: 'Email authentication failed. Please check email configuration.' });
    }
    
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🎵 Psaltos Backend API running on port ${PORT}`);
  console.log(`📡 Audio proxy endpoint: http://localhost:${PORT}/api/audio/proxy?url=<AUDIO_URL>`);
  console.log(`📧 Contact form endpoint: http://localhost:${PORT}/api/contact`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});