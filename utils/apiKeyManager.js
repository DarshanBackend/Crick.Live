// utils/apiKeyManager.js
// Service to manage and rotate multiple API keys for the cricket API

class ApiKeyManager {
  constructor(keys) {
    this.keys = keys.map(key => ({ ...key, usage: 0 }));
    this.currentIndex = 0;
    this.dailyLimit = 100; // Default per-key limit
  }

  // Get the next available API key
  getNextKey() {
    const now = new Date();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const key = this.keys[idx];
      // Reset usage if it's a new day
      if (!key.lastUsed || key.lastUsed.toDateString() !== now.toDateString()) {
        key.usage = 0;
        key.lastUsed = now;
      }
      if (key.usage < this.dailyLimit) {
        key.usage++;
        key.lastUsed = now;
        this.currentIndex = (idx + 1) % this.keys.length;
        return key;
      }
    }
    throw new Error('All API keys have reached their daily limit.');
  }
}

// Example usage:
// const apiKeyManager = new ApiKeyManager([
//   { key: 'API_KEY_1', host: '...', endpoint: '...' },
//   { key: 'API_KEY_2', host: '...', endpoint: '...' },
// ]);
// const apiKey = apiKeyManager.getNextKey();

export default ApiKeyManager;
