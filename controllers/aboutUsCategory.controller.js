import mongoose from "mongoose";
import aboutUsCategoryModel from "../models/aboutUsCategory.model.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/response.utils.js";
import { ThrowError } from "../utils/Error.utils.js";

export const createAboutUsCategory = async (req, res) => {
    try {
        const { aboutUsCategoryName, aboutUsCategoryDescription } = req.body

        if (!aboutUsCategoryName || !aboutUsCategoryDescription) {
            return sendBadRequestResponse(res, "Both field are required!!!")
        }

        const checkAboutUsCategoryName = await aboutUsCategoryModel.find({ aboutUsCategoryName })
        if (checkAboutUsCategoryName.length > 0) {
            return sendBadRequestResponse(res, "This category already added...")
        }

        const newAboutUsCategory = await aboutUsCategoryModel.create({
            aboutUsCategoryName,
            aboutUsCategoryDescription,
        })

        return sendSuccessResponse(res, "AboutUsCategory create successfully...", newAboutUsCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAllAboutUsCategory = async (req, res) => {
    try {
        const aboutUsCategory = await aboutUsCategoryModel.find()

        if (!aboutUsCategory) {
            return sendBadRequestResponse(res, "No any aboutUsCategory found...")
        }

        return sendSuccessResponse(res, "AboutUsCategory fetched Successfully...", aboutUsCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getAboutUsCategoryById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Inavalid AboutUsCategoryId...")
        }

        const aboutUsCategory = await aboutUsCategoryModel.findById(id)

        if (!aboutUsCategory) {
            return sendBadRequestResponse(res, "No aboutUsCategory found...")
        }

        return sendSuccessResponse(res, "AboutUsCategory fetched Successfully...", aboutUsCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateAboutUsCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid AboutUsCategoryId!!!");
        }

        const AboutUsCategory = await aboutUsCategoryModel.findById(id);
        if (!AboutUsCategory) {
            return sendNotFoundResponse(res, "AboutUsCategory Not found...");
        }

        const { aboutUsCategoryName } = req.body;

        if (aboutUsCategoryName) {
            const checkAboutUsCategory = await aboutUsCategoryModel.findOne({
                aboutUsCategoryName,
                _id: { $ne: id }
            });
            if (checkAboutUsCategory) {
                return sendBadRequestResponse(res, "This AboutUsCategory already added...");
            }
        }

        const updatedata = {
            ...req.body,
        };

        const newAboutUsCategory = await aboutUsCategoryModel.findByIdAndUpdate(
            id,
            updatedata,
            { new: true }
        )

        return sendSuccessResponse(
            res,
            "AboutUsCategory updated Successfully...",
            newAboutUsCategory
        );

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteAboutUsCategoryById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid AboutUsCategoryId!!!")
        }

        const AboutUsCategory = await aboutUsCategoryModel.findById(id)
        if (!AboutUsCategory) {
            return sendNotFoundResponse(res, "AboutUsCategory Not found...")
        }

        const newAboutUsCategory = await aboutUsCategoryModel.findByIdAndDelete(id)

        return sendSuccessResponse(res, "AboutUsCategory deleted Successfully...", newAboutUsCategory)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}