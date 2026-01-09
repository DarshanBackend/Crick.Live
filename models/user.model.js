import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    mobileNo: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    uid: {
        type: String,
        unique: true
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
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const generateRandomUID = () => {
    const timestampPart = Date.now().toString().slice(-8);
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    return timestampPart + randomPart;
};

userSchema.pre("save", async function () {
    if (this.isNew && !this.uid) {
        let uid;
        let existingUser = true;

        while (existingUser) {
            uid = generateRandomUID();
            // @ts-ignore - this.constructor is the model
            existingUser = await this.constructor.findOne({ uid });
        }

        this.uid = uid;
    }
});

export default mongoose.model("User", userSchema);