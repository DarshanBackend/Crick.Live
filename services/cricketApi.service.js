import axios from 'axios';
import ApiKeyManager from '../utils/apiKeyManager.js';
import apiKeys from '../config/apiKeys.js';

class CricketApiService {
    constructor() {
        this.baseURL = 'https://Cricbuzz-Official-Cricket-API.proxy-production.allthingsdev.co';
        this.apiKeyManager = new ApiKeyManager(apiKeys);
    }

    getTeamImageUrl(imageId) {
        if (!imageId) return null;
        return `http://static.cricbuzz.com/a/img/v1/i1/c${imageId}/i.jpg`;
    }

    async makeRequest(url, endpointId) {
        let lastError = null;
        let keyObj = null;

        for (let attempt = 0; attempt < apiKeys.length; attempt++) {
            try {
                keyObj = this.apiKeyManager.getNextKey();
                const headers = {
                    'x-apihub-key': keyObj.key,
                    'x-apihub-host': keyObj.host,
                    'x-apihub-endpoint': endpointId || keyObj.endpoint
                };

                const response = await axios.get(`${this.baseURL}${url}`, {
                    headers: headers,
                    timeout: 10000
                });

                this.apiKeyManager.markKeySuccess(keyObj.index);
                return response.data;
            } catch (error) {
                lastError = error;
                if (keyObj && keyObj.index !== undefined) {
                    this.apiKeyManager.markKeyFailed(keyObj.index);
                }

                if (error.response?.status === 429 && attempt < apiKeys.length - 1) {
                    continue;
                }
                break;
            }
        }

        throw lastError || new Error('API request failed');
    }

    async getLiveMatches() {
        const data = await this.makeRequest('/matches/live', 'e0cb5c72-38e1-435e-8bf0-6b38fbe923b7');
        return this.formatMatchesResponse(data);
    }

    async getRecentMatches() {
        const data = await this.makeRequest('/matches/recent', 'e0cb5c72-38e1-435e-8bf0-6b38fbe923b7');
        return this.formatMatchesResponse(data);
    }

    async getUpcomingMatches() {
        const data = await this.makeRequest('/matches/upcoming', 'e0cb5c72-38e1-435e-8bf0-6b38fbe923b7');
        return this.formatMatchesResponse(data);
    }

    async getMatchesByType(type) {
        const data = await this.makeRequest('/matches/live', 'e0cb5c72-38e1-435e-8bf0-6b38fbe923b7');
        const allMatches = this.formatMatchesResponse(data);

        if (type === 'all') return allMatches;
        if (type === 'domestic') return allMatches.filter(m => !m.seriesName.includes('International'));
        if (type === 'international') return allMatches.filter(m => m.seriesName.includes('International'));
        if (type === 't20') return allMatches.filter(m => m.matchFormat === 'T20');

        return allMatches;
    }

    async getMatchDetails(matchId) {
        const data = await this.makeRequest(`/match/${matchId}`, 'ac951751-d311-4d23-8f18-353e75432353');
        return this.formatMatchDetailsResponse(data);
    }

    async getMatchCommentary(matchId) {
        const data = await this.makeRequest(`/match/${matchId}/commentary`, '8cb69a0f-bcaa-45b5-a016-229a2e7594f6');
        return this.formatCommentaryResponse(data);
    }

    async getMatchScorecard(matchId) {
        const data = await this.makeRequest(`/match/${matchId}/scorecard`, 'ac951751-d311-4d23-8f18-353e75432353');
        return data;
    }

    getPlayerImageUrl(imageId) {
        if (!imageId) return null;
        return `http://static.cricbuzz.com/a/img/v1/i1/c${imageId}/i.jpg`;
    }

    async getMatchSquads(matchId) {
        const data = await this.makeRequest(`/match/${matchId}/squads`, 'be37c2f5-3a12-44bd-8d8b-ba779eb89279');
        return this.formatMatchSquadsResponse(data);
    }

    formatMatchSquadsResponse(data) {
        if (!data) return null;

        const processTeam = (teamData) => {
            if (!teamData) return null;

            // Add image URL to team
            if (teamData.team) {
                teamData.team.imageUrl = this.getTeamImageUrl(teamData.team.imageid || teamData.team.imageId);
            }

            // Process players
            if (Array.isArray(teamData.players)) {
                teamData.players.forEach(category => {
                    if (Array.isArray(category.player)) {
                        category.player.forEach(p => {
                            p.imageUrl = this.getPlayerImageUrl(p.faceimageid || p.faceImageId);
                        });
                    }
                });
            }
            return teamData;
        };

        if (data.team1) {
            data.team1 = processTeam(data.team1);
        }
        if (data.team2) {
            data.team2 = processTeam(data.team2);
        }

        return data;
    }

    async getMatchOvers(matchId) {
        const commentary = await this.getMatchCommentary(matchId);
        return this.formatOversResponse(commentary);
    }

    async getSeriesInfo(seriesId) {
        const data = await this.makeRequest(`/series/${seriesId}`, '95df5edd-bd8b-4881-a12b-1a40e519b693');
        return this.formatSeriesResponse(data);
    }

    async getSeriesPointsTable(seriesId) {
        try {
            const data = await this.makeRequest(`/series/${seriesId}/points`, '95df5edd-bd8b-4881-a12b-1a40e519b693');
            return this.formatPointsTableResponse(data);
        } catch (error) {
            if (error.response?.status === 404) return null;
            throw error;
        }
    }

    async getSeriesSquads(seriesId) {
        const data = await this.makeRequest(`/series/${seriesId}/squads`, '95df5edd-bd8b-4881-a12b-1a40e519b693');
        return this.formatSquadsResponse(data);
    }

    formatDate(timestamp) {
        if (!timestamp) return null;
        try {
            const date = new Date(parseInt(timestamp));
            const formatter = (d) => d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

            const now = new Date();
            const dateStr = formatter(date);
            const todayStr = formatter(now);

            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = formatter(tomorrow);

            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = formatter(yesterday);

            const suffix = date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

            if (dateStr === todayStr) return `TODAY, ${suffix}`;
            if (dateStr === tomorrowStr) return `TOMORROW, ${suffix}`;
            if (dateStr === yesterdayStr) return `YESTERDAY, ${suffix}`;

            return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
        } catch (error) {
            return timestamp;
        }
    }

    formatMatchesResponse(data) {
        if (!data || !data.typeMatches) return [];

        const allMatches = [];

        data.typeMatches.forEach(typeMatch => {
            const matchType = typeMatch.matchType;
            typeMatch.seriesMatches?.forEach(seriesMatch => {
                const matches = seriesMatch.seriesAdWrapper?.matches || [];
                matches.forEach(match => {
                    const formattedMatch = this.formatSingleMatch(match, matchType);
                    allMatches.push(formattedMatch);
                });
            });
        });

        return allMatches;
    }

    formatSingleMatch(match, matchType) {
        const matchInfo = match.matchInfo || {};
        const team1 = matchInfo.team1 || {};
        const team2 = matchInfo.team2 || {};
        const venueInfo = matchInfo.venueInfo || {};
        const matchScore = match.matchScore || {};

        return {
            matchId: matchInfo.matchId,
            seriesId: matchInfo.seriesId,
            seriesName: matchInfo.seriesName,
            matchDesc: matchInfo.matchDesc,
            matchType: matchType,
            matchFormat: matchInfo.matchFormat,
            team1: {
                teamId: team1.teamId,
                name: team1.teamName,
                shortName: team1.teamSName,
                imageId: team1.imageId,
                imageUrl: this.getTeamImageUrl(team1.imageId)
            },
            team2: {
                teamId: team2.teamId,
                name: team2.teamName,
                shortName: team2.teamSName,
                imageId: team2.imageId,
                imageUrl: this.getTeamImageUrl(team2.imageId)
            },
            startDate: this.formatDate(matchInfo.startDate),
            endDate: this.formatDate(matchInfo.endDate),
            status: matchInfo.status,
            state: matchInfo.state,
            stateTitle: matchInfo.stateTitle,
            venueInfo: { id: venueInfo.id, ground: venueInfo.ground, city: venueInfo.city, timezone: venueInfo.timezone },
            currBatTeamId: matchInfo.currBatTeamId,
            isTimeAnnounced: matchInfo.isTimeAnnounced,
            matchScore: this.formatMatchScore(matchScore),
            isLive: this.isMatchLive(matchInfo, matchScore)
        };
    }

    formatMatchDetailsResponse(data) {
        if (!data) return null;

        const team1 = data.team1 || {};
        const team2 = data.team2 || {};
        const venueInfo = data.venueinfo || data.venueInfo || {};
        const matchScore = data.matchScore || data.matchscore || {};

        const formattedScore = this.formatMatchScore(matchScore);
        const liveScore = this.calculateLiveScore(data, matchScore, team1.teamid || team1.teamId, team2.teamid || team2.teamId);

        return {
            matchId: data.matchid || data.matchId,
            seriesId: data.seriesid || data.seriesId,
            seriesName: data.seriesname || data.seriesName,
            matchDesc: data.matchdesc || data.matchDesc,
            matchFormat: data.matchformat || data.matchFormat,
            startDate: this.formatDate(data.startdate || data.startDate),
            endDate: this.formatDate(data.enddate || data.endDate),
            status: data.status,
            state: data.state,
            stateTitle: data.statetitle || data.stateTitle,
            team1: {
                teamId: team1.teamid || team1.teamId,
                name: team1.teamname || team1.teamName,
                shortName: team1.teamsname || team1.teamSName,
                imageId: team1.imageid || team1.imageId,
                imageUrl: this.getTeamImageUrl(team1.imageid || team1.imageId)
            },
            team2: {
                teamId: team2.teamid || team2.teamId,
                name: team2.teamname || team2.teamName,
                shortName: team2.teamsname || team2.teamSName,
                imageId: team2.imageid || team2.imageId,
                imageUrl: this.getTeamImageUrl(team2.imageid || team2.imageId)
            },
            venueInfo: { id: venueInfo.id, ground: venueInfo.ground, city: venueInfo.city, timezone: venueInfo.timezone },
            currBatTeamId: data.currbatteamid || data.currBatTeamId,
            isTimeAnnounced: data.istimeannounced || data.isTimeAnnounced,
            matchScore: formattedScore,
            liveScore: liveScore,
            tossResults: data.tossresults || data.tossResults,
            players: data.players || [],
            officials: data.officials || {}
        };
    }

    calculateLiveScore(matchInfo, matchScore, team1Id, team2Id) {
        if (!matchScore || matchInfo.state !== 'Live') return null;

        const currBatTeamId = matchInfo.currBatTeamId;
        const team1Score = matchScore.team1Score;
        const team2Score = matchScore.team2Score;

        let currentRuns = 0;
        let currentWickets = 0;
        let currentOvers = 0;
        let target = null;
        let ballsRemaining = null;
        let runsNeeded = null;
        let currentRunRate = 0;
        let requiredRunRate = null;

        if (currBatTeamId === team1Id && team1Score?.inngs1) {
            const inngs = team1Score.inngs1;
            currentRuns = inngs.runs || 0;
            currentWickets = inngs.wickets || 0;
            currentOvers = inngs.overs || 0;

            if (team2Score?.inngs1) {
                target = (team2Score.inngs1.runs || 0) + 1;
                runsNeeded = target - currentRuns;
                const totalBalls = (matchInfo.matchFormat === 'T20' ? 20 : matchInfo.matchFormat === 'ODI' ? 50 : 90) * 6;
                const ballsBowled = Math.floor(currentOvers) * 6 + ((currentOvers % 1) * 10);
                ballsRemaining = totalBalls - ballsBowled;
                requiredRunRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : null;
            }

            currentRunRate = currentOvers > 0 ? currentRuns / currentOvers : 0;
        } else if (currBatTeamId === team2Id && team2Score?.inngs1) {
            const inngs = team2Score.inngs1;
            currentRuns = inngs.runs || 0;
            currentWickets = inngs.wickets || 0;
            currentOvers = inngs.overs || 0;

            if (team1Score?.inngs1) {
                target = (team1Score.inngs1.runs || 0) + 1;
                runsNeeded = target - currentRuns;
                const totalBalls = (matchInfo.matchFormat === 'T20' ? 20 : matchInfo.matchFormat === 'ODI' ? 50 : 90) * 6;
                const ballsBowled = Math.floor(currentOvers) * 6 + ((currentOvers % 1) * 10);
                ballsRemaining = totalBalls - ballsBowled;
                requiredRunRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : null;
            }

            currentRunRate = currentOvers > 0 ? currentRuns / currentOvers : 0;
        }

        return {
            currentRuns,
            currentWickets,
            currentOvers: currentOvers.toFixed(1),
            target,
            runsNeeded,
            ballsRemaining,
            currentRunRate: currentRunRate.toFixed(2),
            requiredRunRate: requiredRunRate ? requiredRunRate.toFixed(2) : null,
            battingTeamId: currBatTeamId
        };
    }

    formatCommentaryResponse(data) {
        if (!data) return [];

        let commList = [];
        if (Array.isArray(data)) commList = data;
        else if (data.commentarySnippetList?.length > 0) commList = data.commentarySnippetList;
        else if (data.comwrapper) commList = Object.values(data.comwrapper);
        else if (data.commentaryList) commList = data.commentaryList;

        return commList.map(item => {
            let text = item.commentaryText || item.commentary || item.text || item.comm;
            if (typeof text === 'object' && text !== null) {
                text = text.commtxt || text.text || text.commentary;
            }

            // Try to extract over and ball from text if missing (e.g. "18.4 Bowler to Batsman...")
            let overNum = item.overNumber || item.over || item.overNum;
            let ballNum = item.ballNumber || item.ball || item.ballNbr;

            if (!overNum && text) {
                const match = text.match(/^(\d+)\.(\d+)\s/);
                if (match) {
                    overNum = parseInt(match[1]);
                    ballNum = parseInt(match[2]);
                }
            }

            return {
                commentaryId: item.commentaryId || item.id || item.commId,
                overNumber: overNum,
                ballNumber: ballNum,
                commentaryText: text,
                event: item.event || item.type,
                timestamp: item.timestamp || item.time,
                runs: item.runs || 0,
                wickets: item.wickets || 0,
                batsman: item.batsman || item.batsmanName,
                bowler: item.bowler || item.bowlerName
            };
        });
    }

    formatOversResponse(commentary) {
        if (!commentary || !Array.isArray(commentary)) return [];

        const overs = [];
        let currentOver = null;
        let inferredOverNumber = null;

        commentary.forEach(item => {
            const text = item.commentaryText || item.commentary || "";
            const parsed = this.parseCommentaryText(text);

            // Detect "End of Over" marker
            const endOverMatch = text.match(/End of Over (\d+)/i);
            if (endOverMatch) {
                if (currentOver && currentOver.balls.length > 0) {
                    overs.push(currentOver);
                    currentOver = null;
                }
                inferredOverNumber = parseInt(endOverMatch[1]);
                return;
            }

            // Determine Bowler
            const bowler = item.bowler || parsed.bowler;
            const batsman = item.batsman || parsed.batsman;

            // Strict Filter: Only process if it looks like a ball commentary 
            const isBallCommentary = text.includes(' to ') || item.ballNumber || parsed.runs > 0 || parsed.isWicket || parsed.isWide || parsed.isNoBall || (item.runs !== undefined && item.runs !== 0);

            if (!isBallCommentary) {
                return;
            }

            // Check if switch needed: start new group if bowler changes (and we don't have explicit over numbers)
            let shouldSwitch = false;

            if (!currentOver) {
                shouldSwitch = true;
            } else if (item.overNumber && item.overNumber !== currentOver.overNumber) {
                shouldSwitch = true;
            } else if (!item.overNumber && bowler && currentOver.bowler && bowler !== currentOver.bowler) {
                shouldSwitch = true;
            }

            if (shouldSwitch) {
                if (currentOver && currentOver.balls.length > 0) {
                    overs.push(currentOver);
                }

                let ovNum = item.overNumber || 0;
                if (!item.overNumber && inferredOverNumber !== null) {
                    ovNum = inferredOverNumber;
                }

                currentOver = {
                    overNumber: ovNum,
                    balls: [],
                    runs: 0,
                    wickets: 0,
                    bowler: bowler || "",
                    teamScore: ""
                };
            }

            // Ensure bowler is set
            if (!currentOver.bowler && bowler) currentOver.bowler = bowler;

            // Extract Score Summary
            if (text.includes('End of Over') || text.match(/[A-Z]+\s?\d+[-/]\d+/)) {
                const scoreMatch = text.match(/([A-Z]+)\s?(\d+[-/]\d+)/);
                if (scoreMatch) currentOver.teamScore = `${scoreMatch[1]} ${scoreMatch[2]}`;
            }

            // Add Ball
            const runs = item.runs !== undefined ? item.runs : parsed.runs;

            currentOver.balls.push({
                ballNumber: item.ballNumber || 0,
                runs: runs,
                isWicket: (item.wickets > 0) || parsed.isWicket,
                isBoundary: runs === 4 || runs === 6 || parsed.isBoundary,
                isWide: parsed.isWide,
                isNoBall: parsed.isNoBall,
                commentary: text,
                batsman: batsman,
                bowler: bowler || currentOver.bowler
            });

            currentOver.runs += runs;
            if ((item.wickets > 0) || parsed.isWicket) currentOver.wickets += 1;
        });

        if (currentOver && currentOver.balls.length > 0) {
            overs.push(currentOver);
        }

        return overs;
    }

    parseCommentaryText(text) {
        const result = {
            runs: 0,
            isWicket: false,
            isBoundary: false,
            isWide: false,
            isNoBall: false,
            bowler: '',
            batsman: ''
        };

        if (!text) return result;

        const lowerText = text.toLowerCase();

        // Parse Bowler and Batsman: "Bowler to Batsman, ..."
        if (text.includes(' to ')) {
            const parts = text.split(' to ');
            result.bowler = parts[0].trim();
            if (parts[1]) {
                const batsmanInfo = parts[1].split(',')[0];
                result.batsman = batsmanInfo.trim();
            }
        }

        // Parse Runs and Boundaries
        if (lowerText.includes('boundary') || lowerText.includes('four') || (lowerText.includes('4') && lowerText.includes('runs'))) {
            result.runs = 4;
            result.isBoundary = true;
        } else if (lowerText.includes('six') || (lowerText.includes('6') && lowerText.includes('runs'))) {
            result.runs = 6;
            result.isBoundary = true;
        } else if (lowerText.includes('1 run')) {
            result.runs = 1;
        } else if (lowerText.includes('2 runs')) {
            result.runs = 2;
        } else if (lowerText.includes('3 runs')) {
            result.runs = 3;
        } else if (lowerText.includes('5 runs')) {
            result.runs = 5;
        }

        // Parse Wicket
        if (lowerText.includes('out') || lowerText.includes('wicket')) {
            result.isWicket = true;
        }

        // Parse Extras
        if (lowerText.includes('wide')) {
            result.isWide = true;
            result.runs += 1;
            result.isNoBall = false; // prioritize
        }
        if (lowerText.includes('no ball')) {
            result.isNoBall = true;
            result.runs += 1;
            result.isWide = false;
        }

        return result;
    }

    formatSeriesResponse(data) {
        if (!data || !data.matchDetails) return null;

        const allMatches = [];
        let seriesInfo = {};

        data.matchDetails.forEach(detail => {
            if (detail.matchDetailsMap?.match) {
                detail.matchDetailsMap.match.forEach(m => {
                    const info = m.matchInfo || {};
                    if (!seriesInfo.seriesId) {
                        seriesInfo = {
                            seriesId: info.seriesId,
                            seriesName: info.seriesName,
                            startDate: info.seriesStartDt,
                            endDate: info.seriesEndDt,
                        };
                    }
                    allMatches.push(this.formatSingleMatch(m, info.matchFormat));
                });
            }
        });

        return {
            seriesId: seriesInfo.seriesId,
            seriesName: seriesInfo.seriesName,
            startDate: seriesInfo.startDate,
            endDate: seriesInfo.endDate,
            matches: allMatches,
            teams: []
        };
    }

    formatPointsTableResponse(data) {
        if (!data) return { teams: [] };

        return {
            seriesId: data.seriesId,
            teams: (data.teams || []).map(team => ({
                position: team.position,
                teamId: team.teamId,
                teamName: team.teamName,
                shortName: team.teamSName,
                played: team.played || 0,
                won: team.won || 0,
                lost: team.lost || 0,
                tied: team.tied || 0,
                noResult: team.noResult || 0,
                netRunRate: team.netRunRate || 0,
                points: team.points || 0,
                recentForm: team.recentForm || []
            }))
        };
    }

    formatSquadsResponse(data) {
        if (!data || !data.squads) return { teams: [] };

        const teams = data.squads.filter(s => !s.isHeader).map(squad => ({
            squadId: squad.squadId,
            teamId: squad.teamId,
            teamName: squad.squadType,
            imageId: squad.imageId,
            imageUrl: this.getTeamImageUrl(squad.imageId),
            players: []
        }));

        return {
            seriesId: data.seriesId,
            seriesName: data.seriesName,
            teams: teams
        };
    }

    formatMatchScore(matchScore) {
        if (!matchScore) return {};

        const formatted = {};

        if (matchScore.team1Score) {
            formatted.team1Score = {
                innings1: matchScore.team1Score.inngs1 || {},
                innings2: matchScore.team1Score.inngs2 || {}
            };
        }

        if (matchScore.team2Score) {
            formatted.team2Score = {
                innings1: matchScore.team2Score.inngs1 || {},
                innings2: matchScore.team2Score.inngs2 || {}
            };
        }

        return formatted;
    }

    isMatchLive(matchInfo, matchScore) {
        const state = matchInfo.state || '';
        const status = matchInfo.status || '';

        return state === 'Live' ||
            status.toLowerCase().includes('live') ||
            status.toLowerCase().includes('inning') ||
            status.toLowerCase().includes('overs') ||
            (matchScore.team1Score || matchScore.team2Score);
    }
}

export default new CricketApiService();