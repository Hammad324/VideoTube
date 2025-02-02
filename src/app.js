import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors( {origin: process.env.CORS_ORIGIN, credentials: true} ))
app.use(express.json( {limit: "16kb"} ))
app.use(express.urlencoded( {extended: true, limit: "16kb"} ))
app.use(cookieParser())

//Import Routes
import userRouter from "./routes/user.routes.js"
import commentRoutes from './routes/comment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthcheckRoutes from './routes/healthcheck.routes.js';
import likesRoutes from './routes/like.routes.js';
import playlistRoutes from './routes/playlist.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import tweetRoutes from './routes/tweet.routes.js';
import videoRoutes from './routes/video.routes.js';

//Routes Declaration
app.use("/api/v1/users",userRouter);
app.use("/api/v1/comment",commentRoutes);
app.use("/api/v1/dashboard",dashboardRoutes);
app.use("/api/v1/healthCheck",healthcheckRoutes);
app.use("/api/v1/likes",likesRoutes);
app.use("/api/v1/playlists",playlistRoutes);
app.use("/api/v1/subscription",subscriptionRoutes);
app.use("/api/v1/tweet",tweetRoutes);
app.use("/api/v1/video",videoRoutes);

export { app }