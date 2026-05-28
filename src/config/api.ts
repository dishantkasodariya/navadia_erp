// Central API configuration
// In development: uses localhost:5000
// In production: uses the deployed backend URL from environment variable

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to build API endpoints
export const api = (path: string) => `${API_BASE_URL}${path}`;
