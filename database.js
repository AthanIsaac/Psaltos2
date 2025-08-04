const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class HymnDatabase {
  constructor(dbPath = './hymns.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to the SQLite database.');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  // Create necessary tables
  async createTables() {
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        url TEXT UNIQUE NOT NULL,
        parent_category_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_category_id) REFERENCES categories (id)
      )
    `;

    const createArtistsTable = `
      CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createAlbumsTable = `
      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        artist_id INTEGER NOT NULL,
        url TEXT UNIQUE NOT NULL,
        file_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (artist_id) REFERENCES artists (id)
      )
    `;

    const createTracksTable = `
      CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        track_number INTEGER,
        duration TEXT,
        mp3_url TEXT NOT NULL,
        local_file_path TEXT,
        album_id INTEGER NOT NULL,
        file_size INTEGER,
        download_status TEXT DEFAULT 'pending', -- pending, downloading, completed, failed
        downloaded_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (album_id) REFERENCES albums (id)
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON tracks(album_id);
      CREATE INDEX IF NOT EXISTS idx_albums_category_id ON albums(category_id);
      CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON albums(artist_id);
      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id);
    `;

    const tables = [createCategoriesTable, createArtistsTable, createAlbumsTable, createTracksTable, createIndexes];

    for (const tableSQL of tables) {
      await this.runQuery(tableSQL);
    }

    console.log('Database tables created successfully');
  }

  // Generic query runner
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          console.error('Error running query:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Generic select query
  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Error running get query:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Generic select all query
  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Error running all query:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Insert or get category
  async insertCategory(name, url, parentCategoryId = null) {
    try {
      const existing = await this.getQuery('SELECT id FROM categories WHERE url = ?', [url]);
      if (existing) {
        return existing.id;
      }

      const result = await this.runQuery(
        'INSERT INTO categories (name, url, parent_category_id) VALUES (?, ?, ?)',
        [name, url, parentCategoryId]
      );
      return result.id;
    } catch (error) {
      console.error('Error inserting category:', error);
      throw error;
    }
  }

  // Insert or get artist
  async insertArtist(name) {
    try {
      const existing = await this.getQuery('SELECT id FROM artists WHERE name = ?', [name]);
      if (existing) {
        return existing.id;
      }

      const result = await this.runQuery('INSERT INTO artists (name) VALUES (?)', [name]);
      return result.id;
    } catch (error) {
      console.error('Error inserting artist:', error);
      throw error;
    }
  }

  // Insert or get album
  async insertAlbum(name, categoryId, artistId, url, fileCount = 0) {
    try {
      const existing = await this.getQuery('SELECT id FROM albums WHERE url = ?', [url]);
      if (existing) {
        return existing.id;
      }

      const result = await this.runQuery(
        'INSERT INTO albums (name, category_id, artist_id, url, file_count) VALUES (?, ?, ?, ?, ?)',
        [name, categoryId, artistId, url, fileCount]
      );
      return result.id;
    } catch (error) {
      console.error('Error inserting album:', error);
      throw error;
    }
  }

  // Insert track
  async insertTrack(title, trackNumber, duration, mp3Url, albumId) {
    try {
      const existing = await this.getQuery('SELECT id FROM tracks WHERE mp3_url = ?', [mp3Url]);
      if (existing) {
        return existing.id;
      }

      const result = await this.runQuery(
        'INSERT INTO tracks (title, track_number, duration, mp3_url, album_id) VALUES (?, ?, ?, ?, ?)',
        [title, trackNumber, duration, mp3Url, albumId]
      );
      return result.id;
    } catch (error) {
      console.error('Error inserting track:', error);
      throw error;
    }
  }

  // Update track download status
  async updateTrackDownloadStatus(trackId, status, filePath = null, fileSize = null) {
    try {
      let sql = 'UPDATE tracks SET download_status = ?';
      let params = [status];

      if (filePath) {
        sql += ', local_file_path = ?';
        params.push(filePath);
      }

      if (fileSize) {
        sql += ', file_size = ?';
        params.push(fileSize);
      }

      if (status === 'completed') {
        sql += ', downloaded_at = CURRENT_TIMESTAMP';
      }

      sql += ' WHERE id = ?';
      params.push(trackId);

      await this.runQuery(sql, params);
    } catch (error) {
      console.error('Error updating track download status:', error);
      throw error;
    }
  }

  // Get all categories
  async getAllCategories() {
    return await this.allQuery(`
      SELECT c.*, 
             COUNT(a.id) as album_count,
             (SELECT COUNT(*) FROM tracks t JOIN albums alb ON t.album_id = alb.id WHERE alb.category_id = c.id) as track_count
      FROM categories c 
      LEFT JOIN albums a ON c.id = a.category_id 
      GROUP BY c.id 
      ORDER BY c.name
    `);
  }

  // Get albums by category
  async getAlbumsByCategory(categoryId) {
    return await this.allQuery(`
      SELECT a.*, art.name as artist_name, c.name as category_name,
             COUNT(t.id) as track_count
      FROM albums a 
      JOIN artists art ON a.artist_id = art.id 
      JOIN categories c ON a.category_id = c.id
      LEFT JOIN tracks t ON a.id = t.album_id
      WHERE a.category_id = ? 
      GROUP BY a.id
      ORDER BY art.name, a.name
    `, [categoryId]);
  }

  // Get tracks by album
  async getTracksByAlbum(albumId) {
    return await this.allQuery(`
      SELECT t.*, a.name as album_name, art.name as artist_name 
      FROM tracks t 
      JOIN albums a ON t.album_id = a.id 
      JOIN artists art ON a.artist_id = art.id 
      WHERE t.album_id = ? 
      ORDER BY t.track_number
    `, [albumId]);
  }

  // Search tracks
  async searchTracks(searchTerm) {
    return await this.allQuery(`
      SELECT t.*, a.name as album_name, art.name as artist_name, c.name as category_name
      FROM tracks t 
      JOIN albums a ON t.album_id = a.id 
      JOIN artists art ON a.artist_id = art.id
      JOIN categories c ON a.category_id = c.id
      WHERE t.title LIKE ? OR art.name LIKE ? OR a.name LIKE ?
      ORDER BY art.name, a.name, t.track_number
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  // Get download statistics
  async getDownloadStats() {
    return await this.getQuery(`
      SELECT 
        COUNT(*) as total_tracks,
        COUNT(CASE WHEN download_status = 'completed' THEN 1 END) as downloaded,
        COUNT(CASE WHEN download_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN download_status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN download_status = 'downloading' THEN 1 END) as downloading
      FROM tracks
    `);
  }

  // Close database connection
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed.');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = HymnDatabase;