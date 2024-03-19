import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFileOnCloudinary } from "../utils/FileUpload.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {

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

export {registerUser}

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