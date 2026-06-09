import { useState, useEffect } from 'react';
import './FinaleDBModal.css';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const FinaleDBModal = ({ isOpen, onClose, partNumber, description }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  // Auto-populate search with part number and description when modal opens
  useEffect(() => {
    if (isOpen && partNumber) {
      // Combine part number and description for comprehensive search
      const comprehensiveSearch = description 
        ? `${partNumber} ${description}` 
        : partNumber;
      setSearchTerm(comprehensiveSearch);
      // Auto-search on open
      handleSearch(comprehensiveSearch);
    } else if (!isOpen) {
      // Reset when modal closes
      setSearchTerm('');
      setSearchResults([]);
      setSelectedVideo(null);
      setHasSearched(false);
      setError('');
    }
  }, [isOpen, partNumber, description]);

  const handleSearch = async (term = searchTerm) => {
    if (!term.trim()) return;

    // Check if API key is configured
    if (!API_KEY || API_KEY === 'your_youtube_api_key_here') {
      setError('YouTube API key not configured. Please add your API key to .env file.');
      setHasSearched(true);
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    setError('');
    
    try {
      const searchQuery = encodeURIComponent(term + ' fireworks');
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${searchQuery}&type=video&key=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('YouTube API request failed');
      }
      
      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (err) {
      console.error('Error searching YouTube:', err);
      setError('Failed to search YouTube. Please check your API key and try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content finaledb-modal large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Search YouTube</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="search-section">
            <div className="search-row">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search YouTube for product videos..."
                className="search-input"
                autoFocus
              />
              <button onClick={() => handleSearch()} className="btn-search" disabled={loading}>
                {loading ? '⏳ Searching...' : '🔍 Search'}
              </button>
            </div>
            <p className="search-hint">
              Product: <strong>{partNumber}</strong> - {description}
            </p>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
              {error.includes('API key') && (
                <div className="api-key-help">
                  <p><strong>To get a YouTube API key:</strong></p>
                  <ol>
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                    <li>Create a new project (or select existing)</li>
                    <li>Enable "YouTube Data API v3"</li>
                    <li>Go to Credentials → Create Credentials → API Key</li>
                    <li>Copy the key to <code>.env</code> file as <code>VITE_YOUTUBE_API_KEY=your_key</code></li>
                    <li>Restart the dev server</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {loading && <div className="loading-message">🔍 Searching YouTube...</div>}
          
          {!loading && hasSearched && !error && searchResults.length === 0 && (
            <div className="no-results">
              <p>No videos found for "{searchTerm} fireworks"</p>
              <p className="hint">Try a different search term</p>
            </div>
          )}

          {!loading && searchResults.length > 0 && !selectedVideo && (
            <div className="youtube-results">
              <h3>Videos ({searchResults.length})</h3>
              <div className="youtube-grid">
                {searchResults.map((video) => (
                  <div
                    key={video.id.videoId}
                    className="youtube-card"
                    onClick={() => handleVideoClick(video)}
                  >
                    <img
                      src={video.snippet.thumbnails.medium.url}
                      alt={video.snippet.title}
                      className="youtube-thumbnail"
                    />
                    <div className="youtube-info">
                      <div className="youtube-title">{video.snippet.title}</div>
                      <div className="youtube-channel">{video.snippet.channelTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedVideo && (
            <div className="video-player">
              <div className="player-header">
                <h3>{selectedVideo.snippet.title}</h3>
                <button onClick={handleCloseVideo} className="btn-back">
                  ← Back to Results
                </button>
              </div>
              <div className="player-container">
                <iframe
                  width="100%"
                  height="480"
                  src={`https://www.youtube.com/embed/${selectedVideo.id.videoId}`}
                  title={selectedVideo.snippet.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="video-details">
                <p><strong>Channel:</strong> {selectedVideo.snippet.channelTitle}</p>
                <p><strong>Published:</strong> {new Date(selectedVideo.snippet.publishedAt).toLocaleDateString()}</p>
                <p className="video-description">{selectedVideo.snippet.description}</p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-cancel">Close</button>
        </div>
      </div>
    </div>
  );
};

export default FinaleDBModal;
