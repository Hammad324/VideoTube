import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express()

// almost sari configurations ke liye app.use() use karte hain.

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
})) // used for middlewares or configurations.

app.use(express.json({limit: "16kb"})) // json data limit
app.use(express.urlencoded({extended: true, limit: "16kb"})) // url encoding
app.use(express.static("public")) // for saving imgaes or favicons.
app.use(cookieParser()) // for parsing cookies into user's device securely

// routes 

import userRouter from "./routes/user.routes.js";


// routes declaration

app.use("/api/v1/users", userRouter)

// http://localhost:3000/api/v1/users/register

export { app }