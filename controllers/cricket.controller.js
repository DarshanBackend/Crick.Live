import asyncHandler from '../utils/asyncHandler.js';
import cricketApiService from '../services/cricketApi.service.js';
import Match from '../models/match.model.js';
import { sendSuccessResponse, sendBadRequestResponse, sendErrorResponse, sendNotFoundResponse } from '../utils/response.utils.js';

export const getLiveMatches = asyncHandler(async (req, res) => {
    const allMatches = await cricketApiService.getLiveMatches();

    const liveMatches = allMatches.filter(match => match.isLive);
    const tossMatches = allMatches.filter(match => match.state === 'Toss');
    const previewMatches = allMatches.filter(match => match.state === 'Preview');
    const completedMatches = allMatches.filter(match => match.state === 'Complete' || match.state === 'Stumps');

    if (allMatches.length > 0) {
        await Match.bulkWrite(
            allMatches.map(match => ({
                updateOne: {
                    filter: { matchId: match.matchId },
                    update: { $set: { ...match, updatedAt: new Date() } },
                    upsert: true
                }
            }))
        );
    }

    const result = {
        totalMatches: allMatches.length,
        liveMatchesCount: liveMatches.length,
        tossMatchesCount: tossMatches.length,
        previewMatchesCount: previewMatches.length,
        completedMatchesCount: completedMatches.length,
        liveMatches: liveMatches,
        tossMatches: tossMatches,
        previewMatches: previewMatches,
        completedMatches: completedMatches
    };

    if (req.io) {
        req.io.emit('liveMatchesUpdate', result);
    }

    sendSuccessResponse(res, 'Live matches fetched successfully', result);
});

export const getMatchDetails = asyncHandler(async (req, res) => {
    const { matchId } = req.params;

    if (!matchId || isNaN(matchId)) {
        return sendBadRequestResponse(res, 'Valid Match ID is required');
    }

    try {
        const matchDetails = await cricketApiService.getMatchDetails(matchId);

        if (!matchDetails) {
            return sendNotFoundResponse(res, 'Match not found');
        }

        await Match.findOneAndUpdate(
            { matchId: parseInt(matchId) },
            { $set: { ...matchDetails, updatedAt: new Date() } },
            { upsert: true, new: true }
        );

        if (req.io) {
            req.io.emit(`matchDetailsUpdate:${matchId}`, matchDetails);
        }

        sendSuccessResponse(res, 'Match details fetched successfully', matchDetails);
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to fetch match details', error.message);
    }
});

export const getMatchCommentary = asyncHandler(async (req, res) => {
    const { matchId } = req.params;

    if (!matchId || isNaN(matchId)) {
        return sendBadRequestResponse(res, 'Valid Match ID is required');
    }

    const commentary = await cricketApiService.getMatchCommentary(matchId);

    if (!commentary || commentary.length === 0) {
        return sendNotFoundResponse(res, 'Commentary not found');
    }

    sendSuccessResponse(res, 'Commentary fetched successfully', {
        matchId: matchId,
        totalComments: commentary.length,
        commentary: commentary
    });
});

export const getMatchScorecard = asyncHandler(async (req, res) => {
    const { matchId } = req.params;

    if (!matchId || isNaN(matchId)) {
        return sendBadRequestResponse(res, 'Valid Match ID is required');
    }

    const scorecard = await cricketApiService.getMatchScorecard(matchId);

    if (!scorecard) {
        return sendNotFoundResponse(res, 'Scorecard not found');
    }

    sendSuccessResponse(res, 'Scorecard fetched successfully', scorecard);
});

export const getMatchSquads = asyncHandler(async (req, res) => {
    const { matchId } = req.params;

    if (!matchId || isNaN(matchId)) {
        return sendBadRequestResponse(res, 'Valid Match ID is required');
    }

    const squads = await cricketApiService.getMatchSquads(matchId);

    if (!squads) {
        return sendNotFoundResponse(res, 'Squads not found');
    }

    sendSuccessResponse(res, 'Squads fetched successfully', squads);
});

export const getMatchOvers = asyncHandler(async (req, res) => {
    const { matchId } = req.params;

    if (!matchId || isNaN(matchId)) {
        return sendBadRequestResponse(res, 'Valid Match ID is required');
    }

    const overs = await cricketApiService.getMatchOvers(matchId);

    if (!overs || overs.length === 0) {
        return sendNotFoundResponse(res, 'Overs data not found');
    }

    sendSuccessResponse(res, 'Overs data fetched successfully', {
        matchId: matchId,
        totalOvers: overs.length,
        overs: overs
    });
});

export const getRecentMatches = asyncHandler(async (req, res) => {
    const allMatches = await cricketApiService.getRecentMatches();

    const completedMatches = allMatches.filter(match =>
        match.state === 'Complete' ||
        match.state === 'Stumps' ||
        match.status?.toLowerCase().includes('won') ||
        match.status?.toLowerCase().includes('beat')
    );

    sendSuccessResponse(res, 'Recent matches fetched successfully', {
        count: completedMatches.length,
        matches: completedMatches
    });
});

export const getUpcomingMatches = asyncHandler(async (req, res) => {
    const allMatches = await cricketApiService.getUpcomingMatches();

    const currentTime = Date.now();
    const upcomingMatches = allMatches.filter(match => {
        const startTime = parseInt(match.startDate);
        return startTime > currentTime &&
            match.state !== 'Complete' &&
            match.state !== 'Live';
    });

    sendSuccessResponse(res, 'Upcoming matches fetched successfully', {
        count: upcomingMatches.length,
        matches: upcomingMatches
    });
});

export const getMatchesByType = asyncHandler(async (req, res) => {
    const { type } = req.params;

    const validTypes = ['all', 'domestic', 'international', 't20'];
    if (!validTypes.includes(type.toLowerCase())) {
        return sendBadRequestResponse(res, 'Valid type is required: all, domestic, international, t20');
    }

    const matches = await cricketApiService.getMatchesByType(type.toLowerCase());

    sendSuccessResponse(res, `${type} matches fetched successfully`, {
        count: matches.length,
        matches: matches
    });
});

export const getSeriesInfo = asyncHandler(async (req, res) => {
    const { seriesId } = req.params;

    if (!seriesId || isNaN(seriesId)) {
        return sendBadRequestResponse(res, 'Valid Series ID is required');
    }

    const seriesInfo = await cricketApiService.getSeriesInfo(seriesId);

    if (!seriesInfo) {
        return sendNotFoundResponse(res, 'Series not found');
    }

    sendSuccessResponse(res, 'Series info fetched successfully', seriesInfo);
});

export const getSeriesPointsTable = asyncHandler(async (req, res) => {
    const { seriesId } = req.params;

    if (!seriesId || isNaN(seriesId)) {
        return sendBadRequestResponse(res, 'Valid Series ID is required');
    }

    const pointsTable = await cricketApiService.getSeriesPointsTable(seriesId);

    if (!pointsTable || pointsTable.teams.length === 0) {
        return sendNotFoundResponse(res, 'Points table not found');
    }

    sendSuccessResponse(res, 'Points table fetched successfully', pointsTable);
});

export const getSeriesSquads = asyncHandler(async (req, res) => {
    const { seriesId } = req.params;

    if (!seriesId || isNaN(seriesId)) {
        return sendBadRequestResponse(res, 'Valid Series ID is required');
    }

    const squads = await cricketApiService.getSeriesSquads(seriesId);

    if (!squads || squads.teams.length === 0) {
        return sendNotFoundResponse(res, 'Squads not found');
    }

    sendSuccessResponse(res, 'Squads fetched successfully', squads);
});

export const getMatchesByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;

    if (!status) {
        return sendBadRequestResponse(res, 'Status is required');
    }

    let matches;

    switch (status.toLowerCase()) {
        case 'live':
            matches = await cricketApiService.getLiveMatches();
            matches = matches.filter(match => match.isLive);
            break;
        case 'recent':
            matches = await cricketApiService.getRecentMatches();
            matches = matches.filter(match =>
                match.state === 'Complete' ||
                match.state === 'Stumps'
            );
            break;
        case 'upcoming':
            matches = await cricketApiService.getUpcomingMatches();
            const currentTime = Date.now();
            matches = matches.filter(match => {
                const startTime = parseInt(match.startDate);
                return startTime > currentTime;
            });
            break;
        case 'toss':
            matches = await cricketApiService.getLiveMatches();
            matches = matches.filter(match => match.state === 'Toss');
            break;
        case 'preview':
            matches = await cricketApiService.getLiveMatches();
            matches = matches.filter(match => match.state === 'Preview');
            break;
        default:
            return sendBadRequestResponse(res, 'Invalid status');
    }

    sendSuccessResponse(res, `${status} matches fetched successfully`, {
        count: matches.length,
        matches: matches
    });
});

export const getAllMatches = asyncHandler(async (req, res) => {
    const { filter = 'all' } = req.query;

    let liveMatches = [];
    let recentMatches = [];
    let upcomingMatches = [];

    try {
        liveMatches = await cricketApiService.getLiveMatches();
    } catch (error) {
        console.error('Error fetching live matches:', error.message);
    }

    try {
        recentMatches = await cricketApiService.getRecentMatches();
        recentMatches = recentMatches.filter(match =>
            match.state === 'Complete' ||
            match.state === 'Stumps'
        );
    } catch (error) {
        console.error('Error fetching recent matches:', error.message);
    }

    try {
        upcomingMatches = await cricketApiService.getUpcomingMatches();
        const currentTime = Date.now();
        upcomingMatches = upcomingMatches.filter(match => {
            const startTime = parseInt(match.startDate);
            return startTime > currentTime;
        });
    } catch (error) {
        console.error('Error fetching upcoming matches:', error.message);
    }

    let allMatches = [...liveMatches, ...recentMatches, ...upcomingMatches];

    if (filter !== 'all') {
        allMatches = allMatches.filter(match => {
            if (filter === 'domestic') return !match.seriesName?.includes('International');
            if (filter === 'international') return match.seriesName?.includes('International');
            if (filter === 't20') return match.matchFormat === 'T20';
            return true;
        });
    }

    sendSuccessResponse(res, 'All matches fetched successfully', {
        liveCount: liveMatches.length,
        recentCount: recentMatches.length,
        upcomingCount: upcomingMatches.length,
        total: allMatches.length,
        matches: allMatches
    });
});

export const getHome = asyncHandler(async (req, res) => {
    try {
        const liveMatches = await cricketApiService.getLiveMatches();
        const recentMatches = await cricketApiService.getRecentMatches();
        const upcomingMatches = await cricketApiService.getUpcomingMatches();

        const liveFiltered = liveMatches.filter(match => match.isLive);
        const recentFiltered = recentMatches.filter(match =>
            match.state === 'Complete' || match.state === 'Stumps'
        ).slice(0, 5);

        const currentTime = Date.now();
        const upcomingFiltered = upcomingMatches.filter(match => {
            const startTime = parseInt(match.startDate);
            return startTime > currentTime;
        }).slice(0, 5);

        const homeData = {
            liveMatches: liveFiltered,
            recentMatches: recentFiltered,
            upcomingMatches: upcomingFiltered,
            highlights: [],
            series: []
        };

        sendSuccessResponse(res, 'Home data fetched successfully', homeData);
    } catch (error) {
        sendSuccessResponse(res, 'Home data fetched successfully', {
            liveMatches: [],
            recentMatches: [],
            upcomingMatches: [],
            highlights: [],
            series: []
        });
    }
});