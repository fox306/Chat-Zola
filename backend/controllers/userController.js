import mongoose from "mongoose";
import { createError } from "../utils/error.js";

import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";
import cloudinary from "../utils/cloudinary.js";

export const getAllUser = async (req, res, next) => {
    try {
        const users = await User.find({});
        res.status(200).json({
            message: "Success",
            users,
        });
    } catch (error) {
        next(error);
    }
};
export const lockUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { isBlocked: req.body.isBlocked },
            { new: true }
        );
        res.status(200).json({
            message: "Success",
            user,
        });
    } catch (error) {
        next(error);
    }
};
export const getAvatar = async (req, res, next) => {
    try {
        const public_id = "Zola/" + req.params.public_id;
        const result = await cloudinary.api.resource(public_id);
        const imageUrl = result.secure_url;
        res.status(200).json(imageUrl);
    } catch (error) {
        next(error);
    }
};
export const changeAvatar = async (req, res, next) => {
    try {
        let fileStr = req.body.data;
        const uploadedResponse = await cloudinary.uploader.upload(
            fileStr,
            {
                upload_preset: "avatar",
            },
            () => {
                console.log("OK LUON");
            }
        );
        res.status(200).json("OK");
    } catch (error) {
        next(error);
    }
};

export const sendFriendRequest = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        // TODO: chưa check id người gửi
        session.startTransaction();
        const receiverId = req.body.receiverId;

        const sender = await User.findOne({ _id: req.body.senderId });
        if (
            sender.invitationSent.includes(receiverId) ||
            sender.friendsList.includes(receiverId) ||
            sender.friendRequest.includes(receiverId)
        )
            return res
                .status(200)
                .json({ success: false, message: "Send faild" });

        sender.invitationSent.push(req.body.receiverId);
        sender.save();
        if (sender.matchedCount === 0) {
            throw createError(404, "Sender not found");
        }

        await User.updateOne(
            { _id: req.body.receiverId },
            { $push: { friendRequest: req.body.senderId } }
        );
        session.commitTransaction();
        res.status(200).json({
            success: true,
            message: "Invitation sent successfully",
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

export const unsendFriendRequest = async (req, res, next) => {
    let session = await mongoose.startSession();
    try {
        // const friend = await User.findOne({ friendRequest: req.body.receiverId })
        // const user = await User.findOne({ friendRequest: req.body.senderId })
        session.startTransaction();
        // Thu hồi lời mời ở người nhận
        await User.updateOne(
            { _id: req.body.receiverId },
            {
                $pull: { friendRequest: req.body.senderId },
            }
        );

        // Thu hồi ở người gửi
        await User.updateOne(
            { _id: req.body.senderId },
            {
                $pull: { invitationSent: req.body.receiverId },
            }
        );
        await session.commitTransaction();
        res.status(200).json({ success: true, message: "Unsend successfully" });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

export const acceptNewFriend = async (req, res, next) => {
    let session = await mongoose.startSession();
    try {
        const friend = await User.findOne({ friendRequest: req.body.senderId });
        if (friend === null) {
            res.status(404).json({
                success: false,
                message: `The friend with id ${req.body.senderId} hasn't sent a friend request yet`,
            });
        } else {
            session.startTransaction();
            // Receiver accepted a friend request
            await User.updateOne(
                { _id: req.body.receiverId },
                {
                    $pull: { friendRequest: req.body.senderId },
                    $push: { friendsList: req.body.senderId },
                }
            );
            // Sender
            await User.updateOne(
                { _id: req.body.senderId },
                {
                    $push: { friendsList: req.body.receiverId },
                    $pull: { invitationSent: req.body.receiverId },
                }
            );

            // Create a new conversation
            const oldConversation = await Conversation.findOne({
                participants: { $all: [req.body.receiverId, req.body.senderId] }
            })
            if (!oldConversation) {
                const conversation = new Conversation({
                    participants: [req.body.receiverId, req.body.senderId],
                });
                await conversation.save();
            }

            await session.commitTransaction();
            res.status(200).json({
                success: true,
                message: `Successful connection to user ${req.body.senderId}`,
            });
        }
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

export const rejectNewFriend = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        await User.updateOne(
            { _id: req.body.receiverId },
            { $pull: { friendRequest: req.body.senderId } }
        );
        await User.updateOne(
            { _id: req.body.senderId },
            { $pull: { invitationSent: req.body.receiverId } }
        );

        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: `Reject successful `,
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

export const getFriendsList = async (req, res, next) => {
    try {
        const list = await User.findById(req.params.userId)
            .populate("friendsList", "name avatar")
            .select({ friendsList: 1, _id: 0 });
        res.status(200).json(list.friendsList);
    } catch (error) {
        next(error);
    }
};

export const unfriend = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        await User.updateOne(
            { _id: req.params.userId },
            { $pull: { friendsList: req.query.friendId } }
        );

        await User.updateOne(
            { _id: req.query.friendId },
            { $pull: { friendsList: req.params.userId } }
        );
        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: "Unfriend successfully",
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        let { avatar, ...others } = req.body;
        let fileStr = avatar;
        const uploadedResponse = await cloudinary.uploader.upload(fileStr, {
            public_id: others._id,
            upload_preset: 'avatar'
        })
        avatar = uploadedResponse.url

        const result = await User.findByIdAndUpdate(
            req.params.userId,
            { ...req.body, avatar: avatar },
            { new: true },
        )
        if (result.matchedCount !== 0) {
            const { password, friendsList, friendRequest, invitationSent, ...others } = result._doc
            res.status(200).json({ success: true, message: "Update successfully", result: { ...others } })
            return
        }
        res.status(404).json({
            success: false,
            message: "No records found to update",
        });
    } catch (error) {
        next(error);
    }
};
export const getProfileByEmail = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.query.email });
        if (user === null) {
            res.status(200).json(null);
            return;
        }
        const { password, ...others } = user._doc;
        res.status(200).json({ ...others });
    } catch (error) {
        next(error);
    }
};

export const getProfileById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);
        // TODO: gắn thêm flag để biết user này có phải là bạn bè không
        if (user === null) {
            res.status(404).json(null);
            return;
        }
        const { password, ...others } = user._doc;
        res.status(200).json({ ...others });
    } catch (error) {
        next(error);
    }
};

export const getProfileMyFriend = async (req, res, next) => {
    try {
        const myId = req.query.my_id;
        const friend = await User.findOne({
            email: req.query.friend_email,
        });
        if (friend === null) {
            res.status(200).json({ success: false, message: "Not found user" });
            return;
        }
        let relationship = "none";

        const isFriend = friend.friendsList.find(
            (friendId) => friendId === myId
        )
            ? true
            : false;
        const sentFriendRequest = friend.friendRequest.find((friendId) => friendId === myId) ? true : false;
        const receivedFriendRequest = friend.invitationSent.find((friendId) => friendId === myId) ? true : false;
        if (isFriend) {
            relationship = "is friend";
        } else if (receivedFriendRequest) {
            relationship = "received request";
        } else if (sentFriendRequest) {
            relationship = "sent request";
        }

        const { password, friendRequest, friendsList, ...others } = friend._doc;
        const data = {
            ...others,
            relationship,
        };
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getFriendsRequestList = async (req, res, next) => {
    try {
        const list = await User.findById(req.params.userId)
            .populate({
                path: "friendRequest",
                select: "_id name avatar",
            })
            .select({ _id: 0, friendRequest: 1 });
        const { friendRequest } = { ...list._doc };
        res.status(200).json(friendRequest);
    } catch (error) {
        next(error);
    }
};

export const getListOfInvitationsSent = async (req, res, next) => {
    try {
        const list = await User.findById(req.params.userId)
            .populate({
                path: "invitationSent",
                select: "_id name avatar",
            })
            .select({ _id: 0, invitationSent: 1 });

        const { invitationSent } = list._doc;
        res.status(200).json(invitationSent);
    } catch (error) {
        next(error);
    }
};
export const getAllUser1 = async (req, res, next) => {
    try {
        const senderId = req.body.senderId;
        const receiverId = req.body.receiverId;
        console.log(req.body)
        const oldConversation = await Conversation.findOne({
            participants: { $all: [receiverId, senderId] }
        })
        console.log(oldConversation)
        res.status(200).json(oldConversation)
    } catch (error) {

    }
}