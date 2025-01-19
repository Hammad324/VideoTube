import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const isUserOwnerOfPlaylist = (playlist,req) => {
    if(playlist.owner.toString() !== req.user?._id.toString())
    {
        return false
    }

    return true
}

const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body

    if(!name || !description)
    {
        throw new ApiError(400, "Playlist name or description is required")
    }

    try {
        const playlist = await Playlist.create({
            name: name,
            description: description || "",
            videos: [],
            owner: req.user?._id
        })    

        if(!playlist)
        {
            throw new ApiError(500, "Error while creating playlist")
        }

        res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Playlist created successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while creating playlist")
    }
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const {userId} = req.params

    if(!userId)
    {
        throw new ApiError(400, "User Id is required")
    }

    try {
        const playlist = await Playlist.findById(userId)

        if(!playlist)
        {
            throw new ApiError(404, "Playlist not found")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Playlist fetched successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while fetching user playlist")
    }

})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const {playlistId} = req.params

    if(!playlistId)
    {
        throw new ApiError(400, "Playlist Id is required")
    }

    try {
        const playlist = await Playlist.findById(playlistId)
        
        if(!playlist)
        {
            throw new ApiError(404, "Playlist not found")
        }

        res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Playlist fetched successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while fetching playlist")
    }
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId || !videoId)
    {
        throw new ApiError(400, "Playlist Id and Video Id both are required")
    }

    try {
        const playlist = await Playlist.findById(playlistId)
        
        if(!playlist)
        {
            throw new ApiError(404, "Playlist not found")
        }

        //Check if user is owner of playlist
        const isOwner = isUserOwnerOfPlaylist(playlist,req)
        if(!isOwner)
        {
            throw new ApiError(300, "User not authorized")
        }

        const video = await Video.findById(videoId)

        if(!video || ( !(video.owner.toString() === req.user?._id.toString()) && !video.isPublished ) )
        {
            throw new ApiError(400, "Video not found")
        }

        if(playlist.videos.includes(videoId))
        {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    {},
                    "Video is already present in playlist"
                )
            )
        }

        const addToPlaylist = playlist.videos.push(video)
        playlist.videos.remove()

        if(!addToPlaylist)
        {
            throw new ApiError(403, "Error while adding video")
        }

        playlist.save()

        return res.status(200).json(
            new ApiResponse(
                200,
                "Video added to playlist successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while adding video to playlist")
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const {playlistId, videoId} = req.params

    if(!playlistId || !videoId)
    {
        throw new ApiError(400, "Playlist Id or Video Id is required")
    }
    
    try {
        const playlist = await Playlist.findById(playlistId)
        if(!playlist)
        {
            throw new ApiError(404, "Playlist not found")
        }    

        const isAuthorized = isUserOwnerOfPlaylist(playlist,req)
        if(!isAuthorized)
        {
            throw new ApiError(300, "User is not authorized")
        }

        if(playlist.videos.includes(videoId))
        {
            const index = playlist.videos.indexOf(videoId)
            playlist.videos.splice(index,1)

            return res.status(200).json(
                new ApiResponse(
                    200,
                    null,
                    "Video removed from playlist"
                )
            )
        }
        else
        {
            throw new ApiError(404, "Video not found in the playlist")
        }
    } 
    catch (error) {
        throw new ApiError(404, error?.message || "Error while deleting video from playlist")
    }

})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const {playlistId} = req.params

    if(!playlistId)
    {
        throw new ApiError(400, "Playlist Id is required")
    }

    try {
        const playlist = await Playlist.findById(playlistId)
        if(!playlist)
        {
            throw new ApiError(404, "Playlist not found")
        }

        const isAuthorized = isUserOwnerOfPlaylist(playlist,req)
        if(!isAuthorized)
        {
            throw new ApiError(300, "User not authorized")
        }
        
        const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)
        if(!deletedPlaylist)
        {
            throw new ApiError(500, "Unable to delete playlist")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Playlist deleted successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while deleting playlist")
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!playlistId)
    {
        throw new ApiError(400, "Playlist Id is required")
    }

    if(!name || !description)
    {
        throw new ApiError(400, "Playlist name and description are required")
    }

    try {
        const playlist = await Playlist.findById(playlistId)
        
        if(!playlist)
        {
            throw new ApiError(404, "Playlist not found")
        }

        const isAuthorized = isUserOwnerOfPlaylist(playlist,req)
        if(!isAuthorized)
        {
            throw new ApiError(300, "User not authorized")
        }

        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $set: {
                    name: name,
                    description: description
                }
            },
            {new: true}
        )

        if(!updatedPlaylist)
        {
            throw new ApiError(500, "Unable to update playlist")
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while updating playlist")
    }
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}