import mongoose from "mongoose";

const aboutUsCategorySchema = mongoose.Schema({
    aboutUsCategoryName: {
        type: String
    },
    aboutUsCategoryDescription: {
        type: String
    }
}, {
    timestamps: true
})

export default mongoose.model("aboutUsCategory", aboutUsCategorySchema)