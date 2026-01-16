import express from "express";
import {
  createCoupon,
  getAllCoupon,
  getAllCouponAdmin,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCouponForPlan
} from "../controllers/coupon.controller.js";
import { AdminAuth, UserAuth } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/imageupload.js";
import { sendBadRequestResponse } from "../utils/response.utils.js";

const router = express.Router();

const uploadMiddleware = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendBadRequestResponse(res, "File size too large. Maximum size is 5MB");
        }
        if (err.message === 'Invalid file type. Only image files are allowed.') {
          return sendBadRequestResponse(res, err.message);
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return sendBadRequestResponse(res, `Unexpected file field. Expected field name: ${fieldName}`);
        }
        return sendBadRequestResponse(res, err.message || "File upload error");
      }
      next();
    });
  };
};

router.get("/getAllCoupon", getAllCoupon);
router.get("/getCouponById/:id", getCouponById);

router.post("/apply-plan", UserAuth, applyCouponForPlan);

router.post("/createCoupon", AdminAuth, uploadMiddleware("couponImage"), createCoupon);
router.get("/admin/getAllCoupon", AdminAuth, getAllCouponAdmin);
router.get("/admin/getCouponById/:id", AdminAuth, getCouponById);
router.patch("/admin/updateCoupon/:id", AdminAuth, uploadMiddleware("couponImage"), updateCoupon);
router.delete("/admin/deleteCoupon/:id", AdminAuth, deleteCoupon);

export default router;