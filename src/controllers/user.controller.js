import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/FileUpload.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";


const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false }) // validateBeforeSave enables us to directly save the refresh token else many other methods of mongodb will also kick in. And it wil take time so use await. saved in db.
        
        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}


const registerUser = asyncHandler(async (req, res) => {

    // user data -> get
    // validate info
    // senstive info should be encrypted
    // check if the user is already logged in: username, email
    // check for images and avatar
    // upload to cloudinary, check avatar once again
    // create user object - create entry in db
    // remove pw and refresh token field
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body // we destructured the object to get the values.
    // console.log("email: ", email)
    // console.log(req.body) // for study purposes.

    // if(fullName === "") {
    //     throw new ApiError(400, "full name is required")
    // }

    if (
        [fullName, email, username, password].some((field) => {
            return field?.trim() === "" // we have used optional chaining operator here.
        }) 
    ) {
        throw new ApiError(400, "All fields are compulsory.")
    }

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existingUser) {
        throw new ApiError(409, "User with email already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log(avatarLocalPath)
    // console.log(req.files) // for study purposes.
    

    // const coverImageLocalPath = req.files?.coverImage[0]?.path; // It uploads it correctly if the coverimage is present it prodes error for beiong undefined. There fore we further checked it in the next written lines of code.

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    } // this can be done for avatar local path as well

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is a required field.")
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath) // because yhan pe time lagega, phir agey barhe ga 
    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath)


    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    ) // removing both of these properties for security purposes 

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user.")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User has been registered successfully.")
    )

})

const userLogin = asyncHandler(async (req, res) => {

    // get data from user -> req.body
    // username or email based login
    // find the user
    // if user available then pw check
    // generate access and refresh token
    // send token via secure cookies
    // login successful message

    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Password is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    } // by doing this the cookies can only be modified by the server and NOT the frontend

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse (200, {
            user: loggedInUser, accessToken, refreshToken
        },
        "User logged in successfully"
        )
    )

})

const logOutUser = asyncHandler(async (req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unautohrized Request. Refresh token does not match.")
    }

    try {

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET) // payload is fancy name for data.
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token.")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is used or expired.")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, NEW_refreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", NEW_refreshToken, options)
        .json(
            new ApiResponse(200,
                {accessToken, refreshToken: NEW_refreshToken},
                "Access token refresed successfully."
            )
        )

    } catch (error) {

        throw new ApiError(401, error?.message || "Invalid refresh token.")

    }
})

export {
    registerUser,
    userLogin,
    logOutUser,
    refreshAccessToken,
}

