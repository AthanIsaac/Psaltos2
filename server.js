const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const HymnDatabase = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
let db = null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve downloaded files
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Initialize database connection
async function initializeDatabase() {
  db = new HymnDatabase();
  await db.initialize();
  console.log('Database initialized');
}

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Tasbeha.org Hymn Database API',
    version: '1.0.0',
    endpoints: {
      categories: '/api/categories',
      albums: '/api/albums/:categoryId',
      tracks: '/api/tracks/:albumId',
      search: '/api/search?q=query',
      stats: '/api/stats',
      'add-category': 'POST /api/categories',
      'add-album': 'POST /api/albums',
      'add-track': 'POST /api/tracks'
    }
  });
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get albums by category
app.get('/api/albums/:categoryId', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const albums = await db.getAlbumsByCategory(categoryId);
    res.json(albums);
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

// Get tracks by album
app.get('/api/tracks/:albumId', async (req, res) => {
  try {
    const albumId = parseInt(req.params.albumId);
    const tracks = await db.getTracksByAlbum(albumId);
    res.json(tracks);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Search tracks
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const tracks = await db.searchTracks(query);
    res.json(tracks);
  } catch (error) {
    console.error('Error searching tracks:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

// Get download statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getDownloadStats();
    const categories = await db.getAllCategories();

    res.json({
      ...stats,
      total_categories: categories.length,
      total_albums: categories.reduce((sum, cat) => sum + cat.album_count, 0)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Add new category
app.post('/api/categories', async (req, res) => {
  try {
    const { name, url, parentCategoryId } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const categoryId = await db.insertCategory(name, url, parentCategoryId);
    res.json({ id: categoryId, message: 'Category added successfully' });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// Add new album
app.post('/api/albums', async (req, res) => {
  try {
    const { name, categoryId, artistName, url, fileCount } = req.body;

    if (!name || !categoryId || !artistName || !url) {
      return res.status(400).json({ error: 'Name, categoryId, artistName, and URL are required' });
    }

    // Insert or get artist first
    const artistId = await db.insertArtist(artistName);
    const albumId = await db.insertAlbum(name, categoryId, artistId, url, fileCount || 0);

    res.json({ id: albumId, artistId, message: 'Album added successfully' });
  } catch (error) {
    console.error('Error adding album:', error);
    res.status(500).json({ error: 'Failed to add album' });
  }
});

// Add new track
app.post('/api/tracks', async (req, res) => {
  try {
    const { title, trackNumber, duration, mp3Url, albumId } = req.body;

    if (!title || !mp3Url || !albumId) {
      return res.status(400).json({ error: 'Title, mp3Url, and albumId are required' });
    }

    const trackId = await db.insertTrack(title, trackNumber, duration, mp3Url, albumId);
    res.json({ id: trackId, message: 'Track added successfully' });
  } catch (error) {
    console.error('Error adding track:', error);
    res.status(500).json({ error: 'Failed to add track' });
  }
});

// Update track download status
app.put('/api/tracks/:trackId/status', async (req, res) => {
  try {
    const trackId = parseInt(req.params.trackId);
    const { status, filePath, fileSize } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await db.updateTrackDownloadStatus(trackId, status, filePath, fileSize);
    res.json({ message: 'Track status updated successfully' });
  } catch (error) {
    console.error('Error updating track status:', error);
    res.status(500).json({ error: 'Failed to update track status' });
  }
});

// Get tracks by download status
app.get('/api/tracks/status/:status', async (req, res) => {
  try {
    const status = req.params.status;
    const tracks = await db.allQuery(`
      SELECT t.*, a.name as album_name, art.name as artist_name, c.name as category_name
      FROM tracks t 
      JOIN albums a ON t.album_id = a.id 
      JOIN artists art ON a.artist_id = art.id 
      JOIN categories c ON a.category_id = c.id
      WHERE t.download_status = ?
      ORDER BY c.name, art.name, t.track_number
    `, [status]);

    res.json(tracks);
  } catch (error) {
    console.error('Error fetching tracks by status:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Serve MP3 files with proper headers
app.get('/api/stream/:trackId', async (req, res) => {
  try {
    const trackId = parseInt(req.params.trackId);
    const track = await db.getQuery(`
      SELECT * FROM tracks WHERE id = ? AND download_status = 'completed'
    `, [trackId]);

    if (!track || !track.local_file_path) {
      return res.status(404).json({ error: 'Track not found or not downloaded' });
    }

    if (!fs.existsSync(track.local_file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const stat = fs.statSync(track.local_file_path);

    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Content-Disposition': `inline; filename="${path.basename(track.local_file_path)}"`
    });

    const readStream = fs.createReadStream(track.local_file_path);
    readStream.pipe(res);
  } catch (error) {
    console.error('Error streaming track:', error);
    res.status(500).json({ error: 'Failed to stream track' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`\n🎵 Hymn Database Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/`);
      console.log(`🎶 Database initialized and ready to serve hymns!\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;