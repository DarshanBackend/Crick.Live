import mongoose from "mongoose";
import PremiumModel from "../models/premium.model.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse } from "../utils/response.utils.js";
import { ThrowError } from "../utils/Error.utils.js";

export const createPremium = async (req, res) => {
    try {
        const { plan_name, price, description, duration, isActive } = req.body;

        if (!plan_name || price === undefined || !duration) {
            return sendBadRequestResponse(res, "plan_name, price and duration are required!!!");
        }

        if (typeof price !== 'number' || price < 0) {
            return sendBadRequestResponse(res, "Price must be a valid positive number");
        }

        const validPlanNames = ["Single Match", "Monthly", "Quarterly", "Annual Plan"];
        if (!validPlanNames.includes(plan_name)) {
            return sendBadRequestResponse(res, "Invalid plan_name. Must be one of: Single Match, Monthly, Quarterly, Annual Plan");
        }

        const validDurations = ["Weekly", "Monthly", "Quarterly", "Yearly", "One Time"];
        if (!validDurations.includes(duration)) {
            return sendBadRequestResponse(res, "Invalid duration. Must be one of: Weekly, Monthly, Quarterly, Yearly, One Time");
        }

        const existingPlan = await PremiumModel.findOne({ plan_name, duration });
        if (existingPlan) {
            return sendBadRequestResponse(res, "This plan with same name and duration already exists!!!");
        }

        const newPremium = await PremiumModel.create({
            plan_name,
            price,
            description,
            duration,
            isActive: isActive !== undefined ? isActive : true
        });

        return sendSuccessResponse(res, "Premium plan created successfully...", newPremium);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getAllPremium = async (req, res) => {
    try {
        const { isActive } = req.query;

        let query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const premiumPlans = await PremiumModel.find(query)
        if (!premiumPlans || premiumPlans.length === 0) {
            return sendNotFoundResponse(res, "No premium plans found...");
        }

        return sendSuccessResponse(res, "Premium plans fetched successfully...", premiumPlans);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getPremiumById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid PremiumId...");
        }

        const premium = await PremiumModel.findById(id);

        if (!premium) {
            return sendNotFoundResponse(res, "Premium plan not found...");
        }

        return sendSuccessResponse(res, "Premium plan fetched successfully...", premium);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updatePremiumById = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_name, price, description, duration, isActive } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid PremiumId!!!");
        }

        const premium = await PremiumModel.findById(id);
        if (!premium) {
            return sendNotFoundResponse(res, "Premium plan not found...");
        }

        if (plan_name) {
            const validPlanNames = ["Single Match", "Monthly", "Quarterly", "Annual Plan"];
            if (!validPlanNames.includes(plan_name)) {
                return sendBadRequestResponse(res, "Invalid plan_name");
            }

            const checkPlan = await PremiumModel.findOne({
                plan_name,
                duration: duration || premium.duration,
                _id: { $ne: id }
            });
            if (checkPlan) {
                return sendBadRequestResponse(res, "This plan with same name and duration already exists...");
            }
        }

        if (price !== undefined) {
            if (typeof price !== 'number' || price < 0) {
                return sendBadRequestResponse(res, "Price must be a valid positive number");
            }
        }

        if (duration) {
            const validDurations = ["Weekly", "Monthly", "Quarterly", "Yearly", "One Time"];
            if (!validDurations.includes(duration)) {
                return sendBadRequestResponse(res, "Invalid duration");
            }
        }

        const updateData = {};
        if (plan_name) updateData.plan_name = plan_name;
        if (price !== undefined) updateData.price = price;
        if (description) updateData.description = description;
        if (duration) updateData.duration = duration;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedPremium = await PremiumModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        return sendSuccessResponse(
            res,
            "Premium plan updated successfully...",
            updatedPremium
        );

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deletePremiumById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid PremiumId!!!");
        }

        const premium = await PremiumModel.findById(id);
        if (!premium) {
            return sendNotFoundResponse(res, "Premium plan not found...");
        }

        const deletedPremium = await PremiumModel.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Premium plan deleted successfully...", deletedPremium);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const togglePremiumStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid PremiumId!!!");
        }

        const premium = await PremiumModel.findById(id);
        if (!premium) {
            return sendNotFoundResponse(res, "Premium plan not found...");
        }

        premium.isActive = !premium.isActive;
        await premium.save();

        return sendSuccessResponse(
            res,
            `Premium plan ${premium.isActive ? 'activated' : 'deactivated'} successfully...`,
            premium
        );

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
