import AboutUsQuestion from '../models/aboutUsQuestion.model.js';
import AboutUsCategory from '../models/aboutUsCategory.model.js';
import mongoose from 'mongoose';
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from '../utils/Response.utils.js';
import { ThrowError } from '../utils/Error.utils.js';

export const createAboutUsQuestion = async (req, res) => {
    try {
        const { aboutUsCategoryId, aboutUsQuestion, aboutUsAnswer } = req.body;

        if (!aboutUsCategoryId || !aboutUsQuestion || !aboutUsAnswer) {
            return sendBadRequestResponse(res, "aboutUsCategoryId, aboutUsQuestion and aboutUsAnswer are required!");
        }

        if (!mongoose.Types.ObjectId.isValid(aboutUsCategoryId)) {
            return sendBadRequestResponse(res, "Invalid AboutUs category ID!");
        }

        const categoryExists = await AboutUsCategory.findById(aboutUsCategoryId);
        if (!categoryExists) {
            return sendNotFoundResponse(res, "AboutUs category not found!");
        }

        if (typeof aboutUsQuestion !== 'string' || aboutUsQuestion.trim().length === 0) {
            return sendBadRequestResponse(res, "AboutUs question must be a non-empty string!");
        }

        if (typeof aboutUsAnswer !== 'string' || aboutUsAnswer.trim().length === 0) {
            return sendBadRequestResponse(res, "AboutUs answer must be a non-empty string!");
        }

        const trimmedQuestion = aboutUsQuestion.trim();

        const existingQuestion = await AboutUsQuestion.findOne({
            aboutUsCategoryId,
            aboutUsQuestion: {
                $regex: `^${trimmedQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                $options: 'i'
            }
        });

        if (existingQuestion) {
            return sendBadRequestResponse(res, "This question already exists in this category!");
        }

        const newAboutUsQuestion = await AboutUsQuestion.create({
            aboutUsCategoryId,
            aboutUsQuestion: trimmedQuestion,
            aboutUsAnswer: aboutUsAnswer.trim(),
        });

        await newAboutUsQuestion.populate('aboutUsCategoryId');

        return sendSuccessResponse(res, "AboutUs question created successfully!", newAboutUsQuestion);

    } catch (error) {
        console.error('Create AboutUs Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const getAllAboutUsQuestions = async (req, res) => {
    try {
        const aboutUsQuestions = await AboutUsQuestion.find()
            .populate('aboutUsCategoryId')              

        if (!aboutUsQuestions || aboutUsQuestions.length === 0) {
            return sendNotFoundResponse(res, "No AboutUs questions found...")
        }

        return sendSuccessResponse(res, "AboutUs questions fetched successfully!", aboutUsQuestions)

    } catch (error) {
        console.error('Get AboutUs Questions Error:', error);
        return ThrowError(res, 500, "Server error while fetching AboutUs questions");
    }
};

export const getAboutUsQuestionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid AboutUs question ID!");
        }

        const question = await AboutUsQuestion.findById(id)
            .populate('aboutUsCategoryId')

        if (!question) {
            return sendNotFoundResponse(res, "AboutUs question not found!");
        }

        return sendSuccessResponse(res, "AboutUs question fetched successfully!", question);

    } catch (error) {
        console.error('Get AboutUs Question Error:', error);
        return ThrowError(res, 500, "Server error while fetching AboutUs question");
    }
};

export const updateAboutUsQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { aboutUsCategoryId, aboutUsQuestion, aboutUsAnswer } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid AboutUs question ID!");
        }

        const existingQuestion = await AboutUsQuestion.findById(id);
        if (!existingQuestion) {
            return sendNotFoundResponse(res, "AboutUs question not found!");
        }

        if (aboutUsCategoryId) {
            if (!mongoose.Types.ObjectId.isValid(aboutUsCategoryId)) {
                return sendBadRequestResponse(res, "Invalid AboutUs category ID!");
            }

            const categoryExists = await AboutUsCategory.findById(aboutUsCategoryId);
            if (!categoryExists) {
                return sendNotFoundResponse(res, "AboutUs category not found!");
            }

            existingQuestion.aboutUsCategoryId = aboutUsCategoryId;
        }

        if (aboutUsQuestion !== undefined) {
            if (typeof aboutUsQuestion !== 'string' || aboutUsQuestion.trim().length === 0) {
                return sendBadRequestResponse(res, "AboutUs question must be a non-empty string!");
            }
            if (aboutUsQuestion.length > 500) {
                return sendBadRequestResponse(res, "AboutUs question must be less than 500 characters!");
            }

            const duplicateQuestion = await AboutUsQuestion.findOne({
                _id: { $ne: id },
                aboutUsCategoryId: existingQuestion.aboutUsCategoryId,
                aboutUsQuestion: { $regex: new RegExp(`^${aboutUsQuestion.trim()}$`, 'i') }
            });

            if (duplicateQuestion) {
                return sendBadRequestResponse(res, "This question already exists in this category!");
            }

            existingQuestion.aboutUsQuestion = aboutUsQuestion.trim();
        }

        if (aboutUsAnswer !== undefined) {
            if (typeof aboutUsAnswer !== 'string' || aboutUsAnswer.trim().length === 0) {
                return sendBadRequestResponse(res, "AboutUs answer must be a non-empty string!");
            }
            if (aboutUsAnswer.length > 2000) {
                return sendBadRequestResponse(res, "AboutUs answer must be less than 2000 characters!");
            }
            existingQuestion.aboutUsAnswer = aboutUsAnswer.trim();
        }

        await existingQuestion.save();
        await existingQuestion.populate('aboutUsCategoryId');

        return sendSuccessResponse(res, "AboutUs question updated successfully!", existingQuestion);

    } catch (error) {
        console.error('Update AboutUs Question Error:', error);
        return ThrowError(res, 500, error.message);
    }
};

export const deleteAboutUsQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid AboutUs question ID!");
        }

        const question = await AboutUsQuestion.findByIdAndDelete(id);

        if (!question) {
            return sendNotFoundResponse(res, "AboutUs question not found!");
        }

        return sendSuccessResponse(res, "AboutUs question deleted successfully!");

    } catch (error) {
        console.error('Delete AboutUs Question Error:', error);
        return ThrowError(res, 500, "Server error while deleting AboutUs question");
    }
};

export const getAboutUsQuestionsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return sendBadRequestResponse(res, "Invalid AboutUs category ID!");
        }

        const categoryExists = await AboutUsCategory.findById(categoryId);
        if (!categoryExists) {
            return sendNotFoundResponse(res, "AboutUs category not found!");
        }

        const questions = await AboutUsQuestion.find({ aboutUsCategoryId: categoryId })
            .populate('aboutUsCategoryId')
            .sort({ createdAt: -1 });

        return sendSuccessResponse(res, "AboutUs questions fetched successfully!", questions);

    } catch (error) {
        console.error('Get AboutUs Questions by Category Error:', error);
        return ThrowError(res, 500, "Server error while fetching AboutUs questions");
    }
};
