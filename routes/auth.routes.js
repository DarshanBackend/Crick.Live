import express from 'express';
import { sendOTP, verifyOTP, updateProfile, assignAdminRole, removeAdminRole, registerAdmin, deleteAccount } from '../controllers/auth.controller.js';
import { UserAuth, AdminAuth } from '../middleware/auth.middleware.js';
import { upload, listBucketObjects, deleteFromS3, deleteManyFromS3 } from '../middleware/imageupload.js';
import { sendResponse, sendSuccessResponse, sendErrorResponse, sendBadRequestResponse } from '../utils/response.utils.js';
import { createFaqCategory, deleteFaqCategoryById, getAllFaqCategory, getFaqCategoryById, updateFaqCategoryById } from '../controllers/faqCategory.controller.js';
import { createFaqQuestion, deleteFaqQuestion, getAllFaqQuestions, getFaqQuestionById, getFaqQuestionsByCategory, updateFaqQuestion } from '../controllers/faqQuestion.controller.js';
import { createAboutUsCategory, deleteAboutUsCategoryById, getAboutUsCategoryById, getAllAboutUsCategory, updateAboutUsCategoryById } from '../controllers/aboutUsCategory.controller.js';
import { createAboutUsQuestion, deleteAboutUsQuestion, getAboutUsQuestionById, getAboutUsQuestionsByCategory, getAllAboutUsQuestions, updateAboutUsQuestion } from '../controllers/aboutUsQuestion.controller.js';
import { createPremium, deletePremiumById, getAllPremium, getPremiumById, togglePremiumStatus, updatePremiumById } from '../controllers/premium.controller.js';

const indexRoutes = express.Router();

indexRoutes.post('/sendOtp', sendOTP);
indexRoutes.post('/verifyOtp', verifyOTP);
indexRoutes.post('/registerAdmin', registerAdmin);
indexRoutes.put('/updateProfile', UserAuth, upload.single('profileImage'), updateProfile);
indexRoutes.post('/assignAdminRole', AdminAuth, assignAdminRole);
indexRoutes.post('/removeAdminRole', AdminAuth, removeAdminRole);
indexRoutes.delete('/deleteAccount', UserAuth, deleteAccount);

indexRoutes.post("/createFaqCategory", AdminAuth, upload.single("faqCategoryImage"), createFaqCategory)
indexRoutes.get("/getAllFaqCategory", getAllFaqCategory)
indexRoutes.get("/getFaqCategoryById/:id", getFaqCategoryById)
indexRoutes.patch("/updateFaqCategoryById/:id", AdminAuth, upload.single("faqCategoryImage"), updateFaqCategoryById)
indexRoutes.delete("/deleteFaqCategoryById/:id", AdminAuth, deleteFaqCategoryById)

//faqQuestion route
indexRoutes.post("/createFaqQuestion", AdminAuth, createFaqQuestion);
indexRoutes.get("/getAllFaqQuestions", getAllFaqQuestions);
indexRoutes.get("/getFaqQuestionById/:id", getFaqQuestionById);
indexRoutes.patch("/updateFaqQuestion/:id", AdminAuth, updateFaqQuestion);
indexRoutes.delete("/deleteFaqQuestion/:id", AdminAuth, deleteFaqQuestion);
indexRoutes.get("/getFaqQuestionsByCategory/:categoryId", getFaqQuestionsByCategory);

//faqQuestion route
indexRoutes.post("/createAboutUsCategory", AdminAuth, createAboutUsCategory);
indexRoutes.get("/getAllAboutUsCategory", getAllAboutUsCategory);
indexRoutes.get("/getAboutUsCategoryById/:id", getAboutUsCategoryById);
indexRoutes.patch("/updateAboutUsCategoryById/:id", AdminAuth, updateAboutUsCategoryById);
indexRoutes.delete("/deleteAboutUsCategoryById/:id", AdminAuth, deleteAboutUsCategoryById);

//faqQuestion route
indexRoutes.post("/createAboutUsQuestion", AdminAuth, createAboutUsQuestion);
indexRoutes.get("/getAllAboutUsQuestions", getAllAboutUsQuestions);
indexRoutes.get("/getAboutUsQuestionById/:id", getAboutUsQuestionById);
indexRoutes.patch("/updateAboutUsQuestion/:id", AdminAuth, updateAboutUsQuestion);
indexRoutes.delete("/deleteAboutUsQuestion/:id", AdminAuth, deleteAboutUsQuestion);
indexRoutes.get("/getAboutUsQuestionsByCategory/:categoryId", getAboutUsQuestionsByCategory);

//Premium routes
indexRoutes.post("/createPremium", AdminAuth, createPremium);
indexRoutes.get("/getAllPremium", getAllPremium);
indexRoutes.get("/getPremiumById/:id", getPremiumById);
indexRoutes.patch("/updatePremiumById/:id", AdminAuth, updatePremiumById);
indexRoutes.delete("/deletePremiumById/:id", AdminAuth, deletePremiumById);
indexRoutes.patch("/togglePremiumStatus/:id", AdminAuth, togglePremiumStatus);

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