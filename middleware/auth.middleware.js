import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { sendUnauthorizedResponse } from "../utils/Response.utils.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const UserAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return sendUnauthorizedResponse(res, "Authorization token missing or invalid");
        }   

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded._id).select('-otp -otpExpiry');
        if (!user) {
            return sendUnauthorizedResponse(res, "User not found");
        }

        if (!user.isVerified) {
            return sendUnauthorizedResponse(res, "Please verify your account");
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return sendUnauthorizedResponse(res, "Token expired");
        }
        if (error.name === 'JsonWebTokenError') {
            return sendUnauthorizedResponse(res, "Invalid token");
        }
        return sendUnauthorizedResponse(res, "Authentication failed");
    }
};

export const isUser = async (req, res, next) => {
    try {
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }
        next();
    } catch (error) {
        return sendUnauthorizedResponse(res, error.message);
    }
};

export const AdminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return sendUnauthorizedResponse(res, "Authorization token missing or invalid");
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded._id).select('-otp -otpExpiry');
        if (!user) {
            return sendUnauthorizedResponse(res, "User not found");
        }

        if (!user.isVerified) {
            return sendUnauthorizedResponse(res, "Please verify your account");
        }

        if (user.role !== "admin" || !user.isAdmin) {
            return sendUnauthorizedResponse(res, "Admin access required");
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return sendUnauthorizedResponse(res, "Token expired");
        }
        if (error.name === 'JsonWebTokenError') {
            return sendUnauthorizedResponse(res, "Invalid token");
        }
        return sendUnauthorizedResponse(res, "Authentication failed");
    }
};