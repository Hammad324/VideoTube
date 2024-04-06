import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/FileUpload.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";


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
    //console.log(avatarLocalPath)
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
            $unset: {
                refreshToken: 1 // removes the field from document.
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

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findOne(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword) // will return true or false

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid OLD password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully."))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200, 
        req.user, 
        "Current user fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body

    if ((!fullName || !email)) {
        throw new ApiError(400, "Email and Fullname is required.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                fullName, // or fullName: fullName
                email, // or email: email
            }
        }, 
        {new: true} // new returns the info AFTER it is saved
    ).select("-password") 

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully."))
})

// files update karne ka alag ik controllers bnate hain better rehta warna text data bho bar bar save hoga

const updateUserAvatar = asyncHandler(async (req, res) => {
    // access user from db
    // take new avatar from user
    // save it and port to db

    const avatarLocalPath = req.file?.path
     // can directly be saved in th db

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing.")
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar.")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        }, {new: true}
    ).select("-password")

    res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar is successfully updated.")
    )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Coverimage file is missing.")
    }

    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath)

    // if (coverImage) {

    //     await User.findByIdAndUpdate(
    //         req.user?._id,
    //         {
    //             $set: {
    //                 coverImage: coverImage.url
    //             }
    //         },
    //         {new: true}).select("-password")

    // } else {

    //     throw new ApiError(400, "Error while uploading avatar.")

    // }

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading coverimage.")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    res
    .status(200)
    .json(
        new ApiResponse(200, user, "Coverimage is successfully updated.")
    )
})

// TODO: Delete the previous avatar and coverImage ater uploading the new one 

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    // User.find({username})

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        }, 
        {
            $lookup: { // finding subscribers
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: { // the ones we have subbed to
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber", 
                as: "subscribedTo"
            }
        },
        {
            $addFields: { // adding both fields.
                subscribersCount: {
                    $size: "$subscribers" // since ye field hai thats why $ sign laga hua 
                },
                channelisSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $condition: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false,
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelisSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                usercreated: 1
            }
        }
    ]) // since db is always in another continent :)

    if (!channel?.length) {
        throw new ApiError(400, "channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler (async (req, res) => {

    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        }, 
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [ // sub-pipeline_one.
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [ // sub-pipeline_two within second lookup.
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                },
                                { // this is for formating data cleanly (we get an array as an output an we need the first value of array.)
                                    $addFields: {
                                        owner: { // first se ya array elements at se bhi nikalsakte (yet to explore this)
                                            $first: "$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )

})

export {
    registerUser,
    userLogin,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}

