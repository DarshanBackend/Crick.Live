import mongoose from "mongoose";

const aboutUsQuestionSchema = mongoose.Schema({
    aboutUsCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "aboutUsCategory"
    },
    aboutUsQuestion: {
        type: String
    },
    aboutUsAnswer: {
        type: String
    },
}, { timestamps: true })

export default mongoose.model("aboutUsQuestion", aboutUsQuestionSchema)