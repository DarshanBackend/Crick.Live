import express from 'express';
import {
    getLiveMatches,
    getMatchDetails,
    getMatchCommentary,
    getMatchScorecard,
    getMatchSquads,
    getMatchOvers,
    getRecentMatches,
    getUpcomingMatches,
    getMatchesByType,
    getSeriesInfo,
    getSeriesPointsTable,
    getSeriesSquads,
    getMatchesByStatus,
    getAllMatches,
    getHome
} from '../controllers/cricket.controller.js';

const router = express.Router();

router.get('/matches/live', getLiveMatches);
router.get('/matches/recent', getRecentMatches);
router.get('/matches/upcoming', getUpcomingMatches);
router.get('/matches/all', getAllMatches);
router.get('/matches/type/:type', getMatchesByType);
router.get('/matches/status/:status', getMatchesByStatus);

router.get('/match/:matchId', getMatchDetails);
router.get('/match/:matchId/commentary', getMatchCommentary);
router.get('/match/:matchId/scorecard', getMatchScorecard);
router.get('/match/:matchId/squads', getMatchSquads);
router.get('/match/:matchId/overs', getMatchOvers);

router.get('/series/:seriesId', getSeriesInfo);
router.get('/series/:seriesId/points-table', getSeriesPointsTable);
router.get('/series/:seriesId/squads', getSeriesSquads);

router.get('/home', getHome);

export default router;