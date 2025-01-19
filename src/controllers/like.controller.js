import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on video
    const {videoId} = req.params

    if(!videoId)
    {
        throw new ApiError(400, "Video Id is required")
    }

    try {
        const findVideo = await Video.findById(videoId)
        if(!findVideo || !findVideo.isPublished)
        {
            throw new ApiError(400, "Video not found")
        }

        const alreadyLiked = await Like.find({
            video: videoId,
            likedBy: req.user?._id
        })

        if(alreadyLiked && alreadyLiked.length > 0)
        {
            await Like.findByIdAndDelete(videoId, {new: true})

            return res.status(200).json(
                new ApiResponse(
                    200,
                    "Video was already liked so like removed successfully"
                )
            )
        }

        const likeVideo = await Like.create({
            video: videoId,
            likedBy: req.user?._id
        })

        if(!likeVideo)
        {
            throw new ApiError(400, "Unable to like video")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                likeVideo,
                "Video liked successfully"
            )
        )

    } 
    catch (error) {
        throw new ApiError(401, error?.message || "Unable to like or dislike video")
    }

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    const {commentId} = req.params

    if(!commentId)
    {
        throw new ApiError(400, "Comment Id is required")
    }

    try {
        const findComment = await Comment.find(commentId)

        if(!findComment)
        {
            throw new ApiError(400, "Comment not found")
        }

        const alreadyLiked = await Like.find({
            comment: commentId,
            likedBy: req.user?._id
        })

        if(alreadyLiked && alreadyLiked.length > 0)
        {
            await Like.findByIdAndDelete(commentId,{new: true})
            return res.status(200).json(
                new ApiResponse(
                    200,
                    "Comment was already liked so like removed successfully"
                )
            )
        }

        const likeComment = await Like.create({
            comment: commentId,
            likedBy: req.user?._id
        })

        if(!likeComment)
        {
            throw new ApiError(400, "Unable to like comment")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                likeComment,
                "Comment liked successfully"
            )
        )
    }
    catch (error) {
        throw new ApiError(401, error?.message ||"Unable to like comment")
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on tweet
    const {tweetId} = req.params

    if(!tweetId)
    {
        throw new ApiError(400, "Tweet Id is required")
    }

    try {
        const findTweet = await Tweet.find(tweetId)

        if(!findTweet)
        {
            throw new ApiError(400, "Tweet not found")
        }

        const alreadyLiked = await Like.find({
            tweet: tweetId,
            likedBy: req.user?._id
        })

        if(alreadyLiked && alreadyLiked.length > 0)
        {
            await Like.findByIdAndDelete(tweetId,{new: true})
            return res.status(200).json(
                new ApiResponse(
                    200,
                    "Tweet was already liked so like removed successfully"
                )
            )
        }

        const likeTweet = await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id
        })

        if(!likeTweet)
        {
            throw new ApiError(400, "Unable to like tweet")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                likeTweet,
                "Tweet liked successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(401, error?.message || "Unable to like tweet")
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    try {
        const {userId} = req.user?._id
        
        const likedVideos = await Like.find(
            {
                likedBy: userId,
                video: {
                    $ne: null
                }
            }
        )

        if(!likedVideos)
        {
            throw new ApiError(404, "No videos found")
        }

        res.status(200).json(
            new ApiResponse(
                200,
                likedVideos,
                "All liked videos fetched successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error?.message || "Error while fetching liked videos")
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}