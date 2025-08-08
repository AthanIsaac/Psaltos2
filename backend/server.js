require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5002;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'], // Allow both common React dev ports
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
    user: process.env.EMAIL_USER || 'psaltoshymns@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password-here' // You'll need to set this
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Psaltos Backend API is running' });
});

// Audio proxy endpoint
app.get('/api/audio/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`Proxying audio request for: ${url}`);

    // Fetch the audio file from the external URL
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000 // 30 second timeout
    });

    // Set appropriate headers for audio streaming
    res.set({
      'Content-Type': response.headers['content-type'] || 'audio/mpeg',
      'Content-Length': response.headers['content-length'],
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type'
    });

    // Handle range requests for audio seeking
    if (req.headers.range && response.headers['accept-ranges'] === 'bytes') {
      res.status(206); // Partial Content
    }

    // Pipe the audio stream to the response
    response.data.pipe(res);

  } catch (error) {
    console.error('Error proxying audio:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(404).json({ error: 'Audio file not found or server unreachable' });
    }
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({ error: 'Request timeout' });
    }
    
    res.status(500).json({ error: 'Failed to fetch audio file', details: error.message });
  }
});

// Handle preflight requests
app.options('/api/audio/proxy', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type'
  });
  res.status(200).end();
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
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <hr>
      <p><small>This message was sent from the Psaltos contact form.</small></p>
    `;

    // Prepare email options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'psaltoshymns@gmail.com',
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