import FAQQuestion from '../models/faqQuestion.model.js';
import FAQCategory from '../models/faqCategory.model.js';
import mongoose from 'mongoose';
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from '../utils/response.utils.js';
import { ThrowError } from '../utils/Error.utils.js';

export const createFaqQuestion = async (req, res) => {
    try {
        const { faqCategoryId, faqQuestion, faqAnswer } = req.body;

        if (!faqCategoryId || !faqQuestion || !faqAnswer) {
            return sendBadRequestResponse(res, "faqCategoryId, faqQuestion and faqAnswer are required!");
        }

        if (!mongoose.Types.ObjectId.isValid(faqCategoryId)) {
            return sendBadRequestResponse(res, "Invalid FAQ category ID!");
        }

        const categoryExists = await FAQCategory.findById(faqCategoryId);
        if (!categoryExists) {
            return sendNotFoundResponse(res, "FAQ category not found!");
        }

        if (typeof faqQuestion !== 'string' || faqQuestion.trim().length === 0) {
            return sendBadRequestResponse(res, "FAQ question must be a non-empty string!");
        }

        if (typeof faqAnswer !== 'string' || faqAnswer.trim().length === 0) {
            return sendBadRequestResponse(res, "FAQ answer must be a non-empty string!");
        }

        const trimmedQuestion = faqQuestion.trim();

        const existingQuestion = await FAQQuestion.findOne({
            faqCategoryId,
            faqQuestion: {
                $regex: `^${trimmedQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                $options: 'i'
            }
        });

        if (existingQuestion) {
            return sendBadRequestResponse(res, "This question already exists in this category!");
        }

        const newFAQQuestion = await FAQQuestion.create({
            faqCategoryId,
            faqQuestion: trimmedQuestion,
            faqAnswer: faqAnswer.trim(),
        });

        await newFAQQuestion.populate('faqCategoryId');

        return sendSuccessResponse(res, "FAQ question created successfully!", newFAQQuestion);

    } catch (error) {
        console.error('Create FAQ Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const getAllFaqQuestions = async (req, res) => {
    try {
        const faqQuestions = await FAQQuestion.find()
            .populate('faqCategoryId')              

        if (!faqQuestions || faqQuestions.length === 0) {
            return sendNotFoundResponse(res, "No FAQ questions found...")
        }

        return sendSuccessResponse(res, "FAQ questions fetched successfully!", faqQuestions)

    } catch (error) {
        console.error('Get FAQ Questions Error:', error);
        return ThrowError(res, 500, "Server error while fetching FAQ questions");
    }
};

export const getFaqQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FAQ question ID!");
        }

        const question = await FAQQuestion.findById(id)
            .populate('faqCategoryId')

        if (!question) {
            return sendNotFoundResponse(res, "FAQ question not found!");
        }

        return sendSuccessResponse(res, "FAQ question fetched successfully!", question);

    } catch (error) {
        console.error('Get FAQ Question Error:', error);
        return ThrowError(res, 500, "Server error while fetching FAQ question");
    }
};

export const updateFaqQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { faqCategoryId, faqQuestion, faqAnswer } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FAQ question ID!");
        }

        const existingQuestion = await FAQQuestion.findById(id);
        if (!existingQuestion) {
            return sendNotFoundResponse(res, "FAQ question not found!");
        }

        if (faqCategoryId) {
            if (!mongoose.Types.ObjectId.isValid(faqCategoryId)) {
                return sendBadRequestResponse(res, "Invalid FAQ category ID!");
            }

            const categoryExists = await FAQCategory.findById(faqCategoryId);
            if (!categoryExists) {
                return sendNotFoundResponse(res, "FAQ category not found!");
            }

            existingQuestion.faqCategoryId = faqCategoryId;
        }

        if (faqQuestion !== undefined) {
            if (typeof faqQuestion !== 'string' || faqQuestion.trim().length === 0) {
                return sendBadRequestResponse(res, "FAQ question must be a non-empty string!");
            }
            if (faqQuestion.length > 500) {
                return sendBadRequestResponse(res, "FAQ question must be less than 500 characters!");
            }

            const duplicateQuestion = await FAQQuestion.findOne({
                _id: { $ne: id },
                faqCategoryId: existingQuestion.faqCategoryId,
                faqQuestion: { $regex: new RegExp(`^${faqQuestion.trim()}$`, 'i') }
            });

            if (duplicateQuestion) {
                return sendBadRequestResponse(res, "This question already exists in this category!");
            }

            existingQuestion.faqQuestion = faqQuestion.trim();
        }

        if (faqAnswer !== undefined) {
            if (typeof faqAnswer !== 'string' || faqAnswer.trim().length === 0) {
                return sendBadRequestResponse(res, "FAQ answer must be a non-empty string!");
            }
            if (faqAnswer.length > 2000) {
                return sendBadRequestResponse(res, "FAQ answer must be less than 2000 characters!");
            }
            existingQuestion.faqAnswer = faqAnswer.trim();
        }

        await existingQuestion.save();
        await existingQuestion.populate('faqCategoryId');

        return sendSuccessResponse(res, "FAQ question updated successfully!", existingQuestion);

    } catch (error) {
        console.error('Update FAQ Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteFaqQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid FAQ question ID!");
        }

        const question = await FAQQuestion.findByIdAndDelete(id);

        if (!question) {
            return sendNotFoundResponse(res, "FAQ question not found!");
        }

        return sendSuccessResponse(res, "FAQ question deleted successfully!");

    } catch (error) {
        console.error('Delete FAQ Question Error:', error);
        return ThrowError(res, 500, "Server error while deleting FAQ question");
    }
};

export const getFaqQuestionsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return sendBadRequestResponse(res, "Invalid FAQ category ID!");
        }

        const categoryExists = await FAQCategory.findById(categoryId);
        if (!categoryExists) {
            return sendNotFoundResponse(res, "FAQ category not found!");
        }

        const questions = await FAQQuestion.find({ faqCategoryId: categoryId })
            .populate('faqCategoryId')
            .sort({ createdAt: -1 });

        return sendSuccessResponse(res, "FAQ questions fetched successfully!", questions);

    } catch (error) {
        console.error('Get FAQ Questions by Category Error:', error);
        return ThrowError(res, 500, "Server error while fetching FAQ questions");
    }
};