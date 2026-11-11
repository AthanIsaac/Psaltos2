// Single place for the backend location; override with REACT_APP_API_URL in production
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5002';
export const LIBRARY_API = `${API_BASE}/api/library`;
