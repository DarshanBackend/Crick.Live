import cricketApiRequest from "../services/cricketApi.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// HOME
export const home = async (req, res) => {
  try {

    const response = await cricketApiRequest.getHome();

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
    
    const response = await cricketApiRequest.getMatchInfo(matchId)

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

    const response = await cricketApiRequest({
      url: "/matches/v1/live",
      customHeaders: { "x-apihub-endpoint": "LIVE_MATCH_ENDPOINT_ID_HERE" }
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


  const response = await cricketApiRequest({
    url: `/mcenter/v1/${matchId}/scard`
  });

  res.status(200).json({
    success: true,
    data: response.data
  });
});

// COMMENTARY
export const commentary = asyncHandler(async (req, res) => {
  const { matchId } = req.params;


  const response = await cricketApiRequest({
    url: `/mcenter/v1/${matchId}/comm`
  });

  res.status(200).json({
    success: true,
    data: response.data
  });
});