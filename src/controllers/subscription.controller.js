import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
    const {channelId} = req.params

    if(!channelId)
    {
        throw new ApiError(400, "Channel Id is required")
    }

    const userId = req.user?._id

    try {
        const subscribed = await Subscription.findOne({
            subscriber: userId,
            channel: channelId
        })

        if(!subscribed)
        {
            const newSubscription = await Subscription.create({
                subscriber: userId,
                channel: channelId
            })

            if(!newSubscription)
            {
                throw new ApiError(500, "Unable to subscribe to channel")
            }

            return res.status(200).json(
                new ApiResponse(
                    200,
                    newSubscription,
                    "Channel subscribed successfully"
                )
            )
        }
        else
        {
            const deleteSubscription = await Subscription.deleteOne({
                subscriber: userId,
                channel: channelId
            })

            if(!deleteSubscription)
            {
                throw new ApiError(500, "Unable to unsubscribe to channel")
            }

            return res.status(200).json(
                new ApiResponse(
                    200,
                    deleteSubscription,
                    "Channel unsubscribed successfully"
                )
            )
        }
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while toggling subscription")
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!subscriberId)
    {
        throw new ApiError(400, "Channel Id is required")
    }

    try {
        const allSubscribers = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(subscriberId)
                }
            },
            {
                $group: {
                    _id: "channel",
                    subscribers: {
                        $push: "$subscriber"
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    subscribers: 1
                }
            }
        ])

        if(!allSubscribers || allSubscribers.length === 0)
        {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    [],
                    "No subscribers found for the channel"
                )
            )
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                allSubscribers,
                "All subscribers fetched successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while fetching subscribers")
    }
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!channelId)
    {
        throw new ApiError(400, "User's channel ID is required to retrieve subscribed channels.")
    }

    try {
        const allSubscribedChannels = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $group: {
                    _id: "subscriber",
                    subscribedChannels: {
                        $push: "$channel"
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    subscribedChannels: 1
                }
            }
        ])

        if(!allSubscribedChannels || allSubscribedChannels.length === 0)
        {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    [],
                    "No subscribed channels found for the user"
                )
            )
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                allSubscribedChannels,
                "All subscribed channels fetched successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, error?.message || "Error while fetching subscribed channels")
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}