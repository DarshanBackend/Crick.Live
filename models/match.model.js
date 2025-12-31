import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    matchId: String,
    seriesName: String,
    team1: String,
    team2: String,
    status: String,
    score: Object
  },
  { timestamps: true }
);

export default mongoose.model("Match", matchSchema);