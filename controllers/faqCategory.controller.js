import mongoose from "mongoose";
import faqCategoryModel from "../models/faqCategory.model.js";
import { sendBadRequestResponse, sendErrorResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/Response.utils.js";
import { ThrowError } from "../utils/Error.utils.js";
import { uploadFile, deleteFileFromS3 } from "../middleware/imageupload.js";

export const createFaqCategory = async (req, res) => {
    try {
        const { faqCategoryName, faqCategoryDescription } = req.body

        if (!faqCategoryName || !faqCategoryDescription) {
            return sendBadRequestResponse(res, "Both field are required!!!")
        }

        const checkFaqCategoryName = await faqCategoryModel.find({ faqCategoryName })
        if (checkFaqCategoryName.length > 0) {
            return sendBadRequestResponse(res, "This category already added...")
        }

        let faqCategoryImage = null;
        const imageFile = req.file || req.files?.faqCategoryImage?.[0];

        if (!imageFile) {
            return sendBadRequestResponse(res, "FaqCategory image is required!!!");
        }

        if (imageFile) {
            const result = await uploadFile(imageFile);
            faqCategoryImage = result.url;
        }

        const newFaqCategory = await faqCategoryModel.create({
            faqCategoryName,
            faqCategoryDescription,
            faqCategoryImage
        })

        return sendSuccessResponse(res, "FaqCategory create successfully...", newFaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllFaqCategory = async (req, res) => {
    try {
        const faqCategory = await faqCategoryModel.find()

        if (!faqCategory) {
            return sendBadRequestResponse(res, "No any faqCategory found...")
        }

        return sendSuccessResponse(res, "FaqCategory fetched Successfully...", faqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getFaqCategoryById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Inavalid FaqCategoryId...")
        }

        const faqCategory = await faqCategoryModel.findById(id)

        if (!faqCategory) {
            return sendBadRequestResponse(res, "No faqCategory found...")
        }

        return sendSuccessResponse(res, "FaqCategory fetched Successfully...", faqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateFaqCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FaqCategoryId!!!");
        }

        const FaqCategory = await faqCategoryModel.findById(id);
        if (!FaqCategory) {
            return sendNotFoundResponse(res, "FaqCategory Not found...");
        }

        const { faqCategoryName } = req.body;

        if (faqCategoryName) {
            const checkFaqCategory = await faqCategoryModel.findOne({
                faqCategoryName,
                _id: { $ne: id }
            });
            if (checkFaqCategory) {
                return sendBadRequestResponse(res, "This FaqCategory already added...");
            }
        }

        let faqCategoryImage = FaqCategory.faqCategoryImage;
        const imageFile = req.file || req.files?.faqCategoryImage?.[0];

        if (imageFile) {
            if (faqCategoryImage) {
                await deleteFileFromS3(faqCategoryImage);
            }

            const result = await uploadFile(imageFile);
            faqCategoryImage = result.url;
        }

        const updatedata = {
            ...req.body,
            faqCategoryImage
        };

        const newFaqCategory = await faqCategoryModel.findByIdAndUpdate(
            id,
            updatedata,
            { new: true }
        )

        return sendSuccessResponse(
            res,
            "FaqCategory updated Successfully...",
            newFaqCategory
        );

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteFaqCategoryById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FaqCategoryId!!!")
        }

        const FaqCategory = await faqCategoryModel.findById(id)
        if (!FaqCategory) {
            return sendNotFoundResponse(res, "FaqCategory Not found...")
        }

        if (FaqCategory.faqCategoryImage) {
            await deleteFileFromS3(FaqCategory.faqCategoryImage);
        }

        const newFaqCategory = await faqCategoryModel.findByIdAndDelete(id)

        return sendSuccessResponse(res, "FaqCategory deleted Successfully...", newFaqCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}