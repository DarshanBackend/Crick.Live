import mongoose from "mongoose";

const faqQuestionSchema = mongoose.Schema({
    faqCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "faqCategory"
    },
    faqQuestion: {
        type: String
    },
    faqAnswer: {
        type: String
    },
}, { timestamps: true })

export default mongoose.model("faqQuestion", faqQuestionSchema)