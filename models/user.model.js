import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    mobileNo: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    name: {
        type: String,
        default: "User"
    },
    profileImage: {
        type: String,
        default: "https://cricklive.s3.eu-north-1.amazonaws.com/default-user.jpg"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    otpExpiry: {
        type: Date
    },
    verificationSid: {
        type: String
    },
    otpSentAt: {
        type: Date
    }
}, {
    timestamps: true
});

export default mongoose.model("User", userSchema);