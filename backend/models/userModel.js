import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            unique: true,
            default: () => {
                const randomBytes = crypto.randomBytes(4);
                const id = randomBytes.readUInt32BE();
                return id.toString();
            },
        },
        name: {
            type: String,
            trim: true,
            maxLength: [
                40,
                "A user name must have less or equal than 40 characters",
            ],
            minLength: [
                5,
                "A user name must have more or equal than 5 characters",
            ],
        },
        email: {
            type: String,
            required: [true, "User must have a email"],
            unique: true,
        },
        password: {
            type: String,
            required: [true, "User must have a password"],
            minLength: [
                6,
                "A user password must have more or equal than 6 characters",
            ],
        },
        phoneNumber: {
            type: String,
            //required: [true, "User must have a phone number"],
            // unique: true,
        },
        birthday: { type: Date },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
        },
        avatar: {
            type: String,
        },
        friendsList: [
            {
                type: String,
                ref: "User",
            },
        ],
        friendRequest: [
            {
                type: String,
                ref: "User",
            },
        ],
        invitationSent: [
            {
                type: String,
                ref: "User",
            },
        ],
        isBlocked: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
