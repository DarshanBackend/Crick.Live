import cricketApi from "../services/cricketApi.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// HOME
export const home = async (req, res) => {
  try {
    const response = await cricketApi.get("/home", {
      headers: {
        "x-apihub-endpoint": "95df5edd-bd8b-4881-a12b-1a40e519b693"
      }
    });

    res.json({ success: true, data: response.data });
  } catch (e) {
    res.status(403).json({
      success: false,
      message: e.response?.data || e.message
    });
  }
};

export const matchInfo = async (req, res) => {
  try {
    const { matchId } = req.params;
    const response = await cricketApi.get(`/match/${matchId}`, {
      headers: {
        "x-apihub-endpoint": "ac951751-d311-4d23-8f18-353e75432353"
      }
    });

    res.json({ success: true, data: response.data });
  } catch (e) {
    console.log("ATD ERROR:", e.response?.data);
    res.status(403).json({
      success: false,
      message: e.response?.data || e.message
    });
  }
};


// LIVE MATCHES
export const liveMatches = async (req, res) => {
  try {
    const response = await cricketApi.get("/matches/v1/live", {
      headers: {
        "x-apihub-endpoint": "LIVE_MATCH_ENDPOINT_ID_HERE"
      }
    });

    res.json({ success: true, data: response.data });
  } catch (e) {
    res.status(403).json({
      success: false,
      message: e.response?.data || e.message
    });
  }
};


// MATCH SCORECARD
export const scoreCard = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const response = await cricketApi.get(
    `/mcenter/v1/${matchId}/scard`
  );

  res.status(200).json({
    success: true,
    data: response.data
  });
});

// COMMENTARY
export const commentary = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const response = await cricketApi.get(
    `/mcenter/v1/${matchId}/comm`
  );

  res.status(200).json({
    success: true,
    data: response.data
  });
});