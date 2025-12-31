import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.ATD_API_KEY) {
  throw new Error(
    "ATD_API_KEY is required. Please set it in your .env file as: ATD_API_KEY=your_api_key_here"
  );
}

const baseURL = "https://Cricbuzz-Official-Cricket-API.proxy-production.allthingsdev.co";
const apihubHost = process.env.ATD_API_HOST || "Cricbuzz-Official-Cricket-API.allthingsdev.co";

const cricketApi = axios.create({
  baseURL: baseURL,
  headers: {
    "x-apihub-key": process.env.ATD_API_KEY,
    "x-apihub-host": apihubHost,
    "x-apihub-endpoint": "ac951751-d311-4d23-8f18-353e75432353"
  }
});

cricketApi.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    config.headers["x-apihub-key"] = process.env.ATD_API_KEY;
    config.headers["x-apihub-host"] = apihubHost;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default cricketApi;