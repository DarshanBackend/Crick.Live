import dotenv from "dotenv";
dotenv.config();

import express from "express";
import connectDB from "./config/db.js";
import cricketRoutes from "./routes/cricket.routes.js";

connectDB();

const app = express();
app.use(express.json());
app.use("/api/cricket", cricketRoutes);

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on ${process.env.PORT}`)
);