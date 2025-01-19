import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import { Playlist } from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteThumbnailOnCloudinary, deleteVideoOnCloudinary} from "../utils/cloudinary.js"

const isUserOwner = (video, req) => {
    if(video.owner.toString() !== req.user?._id.toString())
    {
        return false
    }

    return true
}


const getAllVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc"} = req.query

    if(!isValidObjectId(req.user?._id))
    {
        throw new ApiError(400, "Invalid User Id")
    }

    try {
        const videos = await Video.aggregate([
            {
                $match: {
                    owner: req.user?._id,
                    title: {
                        $regex: query,
                        $options: "i"
                    }
                }
            }
        ]).sort({
            [`${sortType}`]: `${sortBy}`
        })

        const options = {
            page,
            limit
        }
        
        const data = await Video.aggregatePaginate(
            videos,
            options,
            (err, result) => {
                if(err)
                {
                    throw new ApiError(400, "Videos pagination failed!")
                }
                return result
            }
        )

        return res.status(200).json(
            new ApiResponse(
                200,
                data,
                "Videos fetched successfully"
            )
        )
    }
    catch (error) {
        throw new ApiError(500, error?.message || "Error while fetching videos")
    }
})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const { title, description} = req.body

    if(!title || !description)
    {
        throw new ApiError(400, "Title or description is required")
    }

    try {
        const videoLocalPath = req.files?.videoFile[0]?.path
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path

        if(!videoLocalPath)
        {
            throw new ApiError(400, "Video file is required")
        }

        if(!thumbnailLocalPath)
        {
            throw new ApiError(400, "Thumbnail file is required")
        }

        const video = await uploadOnCloudinary(videoLocalPath)
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if(!video)
        {
            throw new ApiError(400, "Error while uploading video")
        }

        if(!thumbnail)
        {
            throw new ApiError(400, "Error while uploading thumbnail")
        }

        const uploadedVideo = await Video.create({
            videoFile: video,
            thumbnail: thumbnail,
            title: title,
            description: description,
            duration: video?.duration,
            isPublished: true,
            owner: req.user?._id
        })

        if(!uploadedVideo)
        {
            throw new ApiError(400, "Error while publishing video")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                uploadedVideo,
                "Video published successfully"
            )
        )

    } 
    catch (error) {
        throw new ApiError(400, error?.message || "Error while publishing video")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params

    if(!videoId)
    {
        throw new ApiError(400, "Video Id is required")
    }

    try {
        const findVideo = await Video.findById(videoId)

        if(!findVideo || (!findVideo.isPublished && !(findVideo.owner.toString() === req.user?._id.toString())))
        {
            throw new ApiError(404, "Video not found")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                findVideo,
                "Video fetched successfully"
            )
        )

    } 
    catch (error) {
        throw new ApiError(404, error?.message || "Error while fetching video")
    }

})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params
    const {title, description} = req.body

    if(!videoId)
    {
        throw new ApiError(400, "Video Id is required")
    }
    
    if(!title || !description)
    {
        throw new ApiError(400, "Title or description is required")
    }

    try {
        const video = await Video.findById(videoId)

        if(!video)
        {
            throw new ApiError(400, "Video doesn't exist")
        }

        const authorized = isUserOwner(video,req)

        if(!authorized)
        {
            throw new ApiError(400, "User is not authorized")
        }

        const thumbnailLocalPath = req.file?.path

        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if(!thumbnail?.url)
        {
            throw new ApiError(400, "Something went wrong while uploading the thumbnail")
        }

        //Delete old thumbnail after uploading new thumbnail successfully
        await deleteThumbnailOnCloudinary(video.thumbnail)

        const updatedVideo = await Video.findByIdAndUpdate(
            videoId,
            {
                $set: {
                    title: title,
                    description: description,
                    thumbnail: thumbnail?.url
                }
            },
            {new: true}
        )
        if(!updatedVideo)
        {
            throw new ApiError(400, "Something went wrong while updating video")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                updatedVideo,
                "Video updated successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(400, error?.message || "Something went wrong while updating video")
    }
})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params

    if(!videoId)
    {
        throw new ApiError(400, "Video Id is required")
    }

    try {
        const video = await Video.findById(videoId)
        if(!video)
        {
            throw new ApiError(400, "Video doesn't exist")
        }

        const authorized = isUserOwner(video,req)
        
        if(!authorized)
        {
            throw new ApiError(400, "User is not authorized")
        }

        //Delete video from cloudinary
        const deleteVideoFromCloudinary = await deleteVideoOnCloudinary(video?.videoFile)
        
        //Delete thumbnail from cloudinary
        const deleteThumbnailFromCloudinary = await deleteThumbnailOnCloudinary(video?.thumbnail)

        const result = await Video.findByIdAndDelete(videoId)
        if(!result)
        {
            throw new ApiError(400, "Cannot delete video")
        }

        //After deleting video, delete likes,comments associated with it
        await Comment.deleteMany({videos: videoId})
        await Like.deleteMany({video: videoId})

        //Remove video from every associated playlist
        const removeFromPlaylist = await Playlist.updateMany(
            {videos: videoId},
            {
                $pull: {
                    videos: videoId
                }
            }
        )

        if(!removeFromPlaylist)
        {
            throw new ApiError(500, "Error while removing video from playlists")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Video deleted successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while deleting video")
    }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId)
    {
        throw new ApiError(400, "Video Id is required")
    }

    try {
        const video = await Video.findById(videoId)

        if(!video)
        {
            throw new ApiError(404, "Video doesn't exist")
        }

        const authorized = isUserOwner(video,req)

        if(!authorized)
        {
            throw new ApiError(403, "User is not authorized to make changes")
        }
        
        video.isPublished = !video.isPublished
        await video.save()

        return res.status(200).json(
            new ApiResponse(
                200,
                video,
                "Publish status toggled successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while changing publish status")
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}