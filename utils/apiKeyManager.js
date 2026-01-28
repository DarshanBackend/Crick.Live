class ApiKeyManager {
    constructor(keys) {
        this.keys = keys.map(key => ({ ...key, usage: 0, lastUsed: null, isActive: true, failedAttempts: 0 }));
        this.currentIndex = 0;
        this.dailyLimit = 100;
        this.maxFailedAttempts = 3;
    }

    getNextKey() {
        const now = new Date();
        let attempts = 0;

        while (attempts < this.keys.length) {
            const idx = this.currentIndex % this.keys.length;
            const key = this.keys[idx];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;

            if (!key.isActive) {
                attempts++;
                continue;
            }

            if (!key.lastUsed || this.isNewDay(key.lastUsed, now)) {
                key.usage = 0;
                key.failedAttempts = 0;
                key.lastUsed = now;
            }

            if (key.usage < this.dailyLimit && key.failedAttempts < this.maxFailedAttempts) {
                key.usage++;
                key.lastUsed = now;
                return { ...key, index: idx };
            }

            attempts++;
        }

        throw new Error('All API keys have reached their daily limit or are temporarily disabled');
    }

    markKeyFailed(index) {
        if (index >= 0 && index < this.keys.length) {
            this.keys[index].failedAttempts++;
            if (this.keys[index].failedAttempts >= this.maxFailedAttempts) {
                this.keys[index].isActive = false;
            }
        }
    }

    markKeySuccess(index) {
        if (index >= 0 && index < this.keys.length) {
            this.keys[index].failedAttempts = 0;
        }
    }

    isNewDay(lastDate, currentDate) {
        return lastDate.getDate() !== currentDate.getDate() ||
               lastDate.getMonth() !== currentDate.getMonth() ||
               lastDate.getFullYear() !== currentDate.getFullYear();
    }
}

export default ApiKeyManager;