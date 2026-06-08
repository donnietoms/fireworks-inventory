// API configuration
export const API_BASE_URL = import.meta.env.PROD 
  ? '' // Use relative URLs in production (same server)
  : 'http://localhost:3001'; // Use separate server in development
