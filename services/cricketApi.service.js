import axios from "axios";
import ApiKeyManager from "../utils/apiKeyManager.js";
import apiKeys from "../config/apiKeys.js";

const baseURL = "https://Cricbuzz-Official-Cricket-API.proxy-production.allthingsdev.co";
const apiKeyManager = new ApiKeyManager(apiKeys);

class CricketApiService {
  constructor() {
    this.baseURL = baseURL;
    this.apiKeyManager = apiKeyManager;
  }

  async request({ url, method = "get", data = null, customHeaders = {} }) {
    let lastError;
    for (let i = 0; i < apiKeys.length; i++) {
      try {
        const keyObj = this.apiKeyManager.getNextKey();
        const headers = {
          "x-apihub-key": keyObj.key,
          "x-apihub-host": keyObj.host,
          "x-apihub-endpoint": keyObj.endpoint,
          ...customHeaders
        };
        const response = await axios({
          url: this.baseURL + url,
          method,
          data,
          headers
        });
        return response;
      } catch (err) {
        lastError = err;
        if (err.response && err.response.status === 429) continue;
        break;
      }
    }
    throw lastError;
  }

  async getHome() {
    return this.request({ url: "/home" });
  }
  
  async getMatchLive(){
    return this.request({url:"/matches/live"})
  }

  async getMatchInfo(matchId) {
    return this.request({ url: `/match/${matchId}` });
  }

  async getScoreCard(matchId) {
    return this.request({ url: `/mcenter/v1/${matchId}/scard` });
  }

  async getCommentary(matchId) {
    return this.request({ url: `/mcenter/v1/${matchId}/comm` });
  }

}

const cricketApiService = new CricketApiService();
export default cricketApiService;