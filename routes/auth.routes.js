import express from 'express';
import { sendOTP, verifyOTP, updateProfile } from '../controllers/auth.controller.js';
import { UserAuth } from '../middleware/auth.middleware.js';
import { upload, listBucketObjects, deleteFromS3, deleteManyFromS3 } from '../middleware/imageupload.js';
import { sendResponse, sendSuccessResponse, sendErrorResponse, sendBadRequestResponse } from '../utils/Response.utils.js';

const indexRoutes = express.Router();

indexRoutes.post('/sendOtp', sendOTP);
indexRoutes.post('/verifyOtp', verifyOTP);
indexRoutes.put('/updateProfile', UserAuth, upload.single('profileImage'), updateProfile);


//aws
indexRoutes.get("/list", async (req, res) => {
    try {
        const images = await listBucketObjects();

        return sendSuccessResponse(res, "Get all images successfully", {
            total: images.length,
            images: images.map((e) => e.url)
        });
    } catch (error) {
        console.error("ERROR WHILE GET ALL IMAGE FROM S3:", error);
        return sendErrorResponse(res, 500, "ERROR WHILE GET ALL IMAGE FROM S3", error);
    }
});

indexRoutes.delete("/delete", async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return sendBadRequestResponse(res, "URL required");

        const key = url.split(".amazonaws.com/")[1];
        if (!key) return sendBadRequestResponse(res, "Invalid S3 URL");

        await deleteFromS3(key);

        return sendSuccessResponse(res, "Deleted successfully", { key });
    } catch (error) {
        console.error("Delete error:", error);
        return sendErrorResponse(res, 500, "Delete error", error);
    }
});

indexRoutes.delete("/deleteMany", async (req, res) => {
    try {
        const { images } = req.body;
        if (!Array.isArray(images) || !images.length) {
            return sendBadRequestResponse(res, "URLs array required");
        }

        const keys = images.map(url => {
            const key = String(url).split(".amazonaws.com/")[1];
            return key;
        }).filter(Boolean);

        if (!keys.length) return sendBadRequestResponse(res, "Invalid S3 URLs");

        await deleteManyFromS3(keys);

        return sendSuccessResponse(res, "Deleted multiple files", {
            deleted: keys.length,
            keys
        });
    } catch (error) {
        console.error("Delete many error:", error);
        return sendErrorResponse(res, 500, "Delete many error", error);
    }
});

export default indexRoutes;