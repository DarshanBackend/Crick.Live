import mongoose from "mongoose";

const faqCategorySchema = mongoose.Schema({
    faqCategoryName: {
        type: String
    },
    faqCategoryDescription: {
        type: String
    },
    faqCategoryImage: {
        type: String,
        default: null
    }
}, {
    timestamps: true
})

export default mongoose.model("faqCategory", faqCategorySchema)