import mongoose from "mongoose";

const PremiumSchema = mongoose.Schema({
    plan_name: {
        type: String,
        enum: ["Single Match", "Monthly", "Quarterly", "Annual Plan"],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        enum: ["Weekly", "Monthly", "Quarterly", "Yearly", "One Time"],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model("Premium", PremiumSchema);
