import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"


export const verifyJWT = asyncHandler(async (req, _, next) => { // res agar khali ho to uski jaga _ likh sakte hain. _ res ki jaga likha hai
    
    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if (!token) {
            throw new ApiError(401, "Unauthorized Request")
        }
    
        const decodedUserInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedUserInfo?._id).select("-password -refreshToken") // from model in jwt access token
    
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()

    } catch (error) {

        throw new ApiError(401, error.message || "Invalid Access Token")
        
    }

})