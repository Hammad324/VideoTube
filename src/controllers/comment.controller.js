import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!videoId)
    {
        throw new ApiError(400, "Video Id is required")
    }

    try {
        const video = await Video.findById(videoId)
        if(!video)
        {
            throw new ApiError(404, "Video not found")
        }

        const comments = await Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner"
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: "$owner"
                    }
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "likedBy"
                }
            },
            {
                $skip: (page-1)*limit
            },
            {
                $limit: limit
            }
        ])

        if(!comments || comments.length === 0)
        {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {},
                    "No comments found"
                )
            )
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                comments,
                "Comments fetched successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while fetching comments")
    }
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {commentData} = req.body

    if(!videoId)
    {
        throw new ApiError(400, "Video ID is required")
    }

    try {
        const videoFound = await Video.findById(videoId)
    
        if(!videoFound)
        {
            throw new ApiError(404, "Video not found")
        }
    
        if(!commentData)
        {
            throw new ApiError(400, "Comment is required")
        }
    
        const comment = await Comment.create({
            content: commentData,
            videos: videoFound?._id,
            owner:  req.user?._id
        })
    
        if(!comment)
        {
            throw new ApiError(400, "Error while creating comment")
        }
    
        return res.status(200).json(new ApiResponse(
            200,
            comment,
            "Comment created successfully"
        ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Unable to create comment")
    }

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {newComment} = req.body

    if(!commentId)
    {
        throw new ApiError(400, "Comment ID is required")
    }

    if(!newComment)
    {
        throw new ApiError(400, "New comment is required")
    }

    try {
        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: newComment
                }
            },
            {new: true}
        ).select("-videos -owner")
    
        if(!updatedComment)
        {
            throw new ApiError(404, "Comment to be updated not found")
        }
    
        return res.status(200).json(
            new ApiResponse(
                200,
                updatedComment,
                "Comment updated successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while updating comment")
    }

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params

    if(!commentId)
    {
        throw new ApiError(400, "Comment Id is required")
    }

    try {
        const commentToBeDeleted = await Comment.findByIdAndDelete(commentId)
    
        if(!commentToBeDeleted)
        {
            throw new ApiError(404, "Comment to be deleted not found")
        }
    
        return res.status(200).json(
            new ApiResponse(
                200,
                "Comment deleted successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500, error?.message || "Error while deleting comment")
    }

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}