import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    teamId: Number,
    name: String,
    shortName: String,
    imageId: Number
});

const venueSchema = new mongoose.Schema({
    id: Number,
    ground: String,
    city: String,
    timezone: String
});

const inningsScoreSchema = new mongoose.Schema({
    inningsId: Number,
    runs: Number,
    wickets: Number,
    overs: Number,
    extras: Number
});

const matchScoreSchema = new mongoose.Schema({
    team1Score: {
        innings1: inningsScoreSchema,
        innings2: inningsScoreSchema
    },
    team2Score: {
        innings1: inningsScoreSchema,
        innings2: inningsScoreSchema
    }
});

const liveScoreSchema = new mongoose.Schema({
    currentRuns: Number,
    currentWickets: Number,
    currentOvers: String,
    target: Number,
    runsNeeded: Number,
    ballsRemaining: Number,
    currentRunRate: String,
    requiredRunRate: String,
    battingTeamId: Number
});

const matchSchema = new mongoose.Schema({
    matchId: { type: Number, required: true, unique: true },
    seriesId: Number,
    seriesName: String,
    matchDesc: String,
    matchFormat: String,
    startDate: String,
    endDate: String,
    status: String,
    state: String,
    stateTitle: String,
    team1: teamSchema,
    team2: teamSchema,
    venueInfo: venueSchema,
    currBatTeamId: Number,
    isTimeAnnounced: Boolean,
    matchScore: matchScoreSchema,
    liveScore: liveScoreSchema,
    tossResults: Object,
    players: Array,
    officials: Object,
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Match', matchSchema);