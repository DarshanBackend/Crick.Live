import mongoose from "mongoose";
import CouponModel from "../models/coupon.model.js";
import { ThrowError } from "../utils/Error.utils.js";
import { sendBadRequestResponse, sendNotFoundResponse, sendSuccessResponse, sendErrorResponse, sendUnauthorizedResponse } from "../utils/response.utils.js";
import { deleteFileFromS3, uploadFile } from "../middleware/imageupload.js";

let cartModel = null;

const loadCartModel = async () => {
  if (cartModel) return cartModel;
  try {
    const cartModule = await import("../models/cart.model.js");
    cartModel = cartModule.default;
    return cartModel;
  } catch (error) {
    return null;
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      description2,
      discountType,
      flatValue,
      percentageValue,
      planName,
      expiryDate,
      isActive,
    } = req.body;

    const file = req.file;

    if (!code || !code.trim()) {
      return sendBadRequestResponse(res, "Coupon code is required");
    }
    if (!description || !description.trim()) {
      return sendBadRequestResponse(res, "Description is required");
    }
    if (!discountType) {
      return sendBadRequestResponse(res, "Discount type is required");
    }
    if (!expiryDate) {
      return sendBadRequestResponse(res, "Expiry date is required");
    }

    const trimmedCode = code.trim().toUpperCase();
    
    if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
      return sendBadRequestResponse(res, "Coupon code must contain only uppercase letters, numbers, and hyphens");
    }

    if (!["flat", "percentage"].includes(discountType)) {
      return sendBadRequestResponse(res, "Discount type must be either 'flat' or 'percentage'");
    }

    const numFlatValue = flatValue !== undefined && flatValue !== null ? Number(flatValue) : 0;
    const numPercentageValue = percentageValue !== undefined && percentageValue !== null ? Number(percentageValue) : 0;

    if (isNaN(numFlatValue) || (numFlatValue < 0)) {
      return sendBadRequestResponse(res, "Flat value must be a valid non-negative number");
    }
    if (isNaN(numPercentageValue) || (numPercentageValue < 0)) {
      return sendBadRequestResponse(res, "Percentage value must be a valid non-negative number");
    }

    const validPlanNames = ["Single Match", "Monthly", "Quarterly", "Annual Plan"];
    if (planName && planName.trim() && !validPlanNames.includes(planName.trim())) {
      return sendBadRequestResponse(res, `Invalid plan name. Must be one of: ${validPlanNames.join(", ")}`);
    }

    let finalFlatValue = numFlatValue;
    let finalPercentageValue = numPercentageValue;

    if (discountType === "flat") {
      if (!flatValue || numFlatValue <= 0)
        return sendBadRequestResponse(res, "Flat value must be provided and > 0 for flat type");
      finalPercentageValue = 0;
    } else {
      if (!percentageValue || numPercentageValue <= 0 || numPercentageValue > 100)
        return sendBadRequestResponse(res, "Percentage value must be between 1–100 for percentage type");
      finalFlatValue = 0;
    }

    const existCoupon = await CouponModel.findOne({ code: trimmedCode });
    if (existCoupon) return sendBadRequestResponse(res, "Coupon code already exists");

    if (!/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(expiryDate)) {
      return sendBadRequestResponse(res, "Invalid expiry date format. Please use DD/MM/YYYY or DD-MM-YYYY format");
    }

    const separator = expiryDate.includes('/') ? '/' : '-';
    const [day, month, year] = expiryDate.split(separator).map(Number);
    
    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
      return sendBadRequestResponse(res, "Invalid date values. Please provide a valid date");
    }

    const expiry = new Date(year, month - 1, day, 23, 59, 59, 999);
    if (isNaN(expiry.getTime())) {
      return sendBadRequestResponse(res, "Invalid expiry date");
    }
    if (expiry < new Date()) return sendBadRequestResponse(res, "Expiry date cannot be in the past");

    let couponImageUrl = null;
    if (file) {
      const uploaded = await uploadFile(file);
      couponImageUrl = uploaded.url;
    }

    const newCoupon = await CouponModel.create({
      code: trimmedCode,
      description: description.trim(),
      description2: description2 ? description2.trim() : "",
      discountType,
      flatValue: finalFlatValue,
      percentageValue: finalPercentageValue,
      planName: planName && planName.trim() ? planName.trim() : null,
      expiryDate: expiry,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      couponImage: couponImageUrl,
    });

    return sendSuccessResponse(res, "Coupon created successfully", newCoupon);
  } catch (error) {
    console.error("Create coupon error:", error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return sendBadRequestResponse(res, `Validation error: ${messages}`);
    }
    
    if (error.code === 11000) {
      return sendBadRequestResponse(res, "Coupon code already exists");
    }

    return ThrowError(res, 500, error.message || "Error creating coupon");
  }
};

export const getAllCoupon = async (req, res) => {
  try {
    const { planName } = req.query;
    
    const query = {
      isActive: true,
      expiryDate: { $gt: new Date() }
    };

    if (planName && planName.trim()) {
      const validPlanNames = ["Single Match", "Monthly", "Quarterly", "Annual Plan"];
      if (validPlanNames.includes(planName.trim())) {
        query.$or = [
          { planName: planName.trim() },
          { planName: null },
          { planName: { $exists: false } }
        ];
      }
    }

    const coupons = await CouponModel.find(query).sort({ createdAt: -1 });

    if (!coupons || coupons.length === 0) {
      return sendNotFoundResponse(res, "No active coupons found!");
    }

    return sendSuccessResponse(res, "Active coupons fetched successfully", coupons);
  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};

export const getAllCouponAdmin = async (req, res) => {
  try {
    const coupons = await CouponModel.find({}).sort({ createdAt: -1 });

    if (!coupons || coupons.length === 0) {
      return sendNotFoundResponse(res, "No coupons found!");
    }

    return sendSuccessResponse(res, "Coupons fetched successfully", coupons);
  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};

export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequestResponse(res, "Invalid Coupon ID");
    }

    const coupon = await CouponModel.findById(id);
    if (!coupon) {
      return sendNotFoundResponse(res, "Coupon not found!");
    }

    return sendSuccessResponse(res, "Coupon fetched successfully", coupon);
  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const {
      code,
      description,
      description2,
      discountType,
      flatValue,
      percentageValue,
      planName,
      expiryDate,
      isActive,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequestResponse(res, "Invalid Coupon ID!");
    }

    const existingCoupon = await CouponModel.findById(id);
    if (!existingCoupon) {
      return sendNotFoundResponse(res, "Coupon not found!");
    }

    if (code) {
      const trimmedCode = code.trim().toUpperCase();
      
      if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
        return sendBadRequestResponse(res, "Coupon code must contain only uppercase letters, numbers, and hyphens");
      }

      if (trimmedCode !== existingCoupon.code) {
        const existCoupon = await CouponModel.findOne({
          code: trimmedCode,
          _id: { $ne: id },
        });
        if (existCoupon) {
          return sendBadRequestResponse(res, "Coupon code already exists");
        }
      }
    }

    const allowedUpdates = [
      "code",
      "description",
      "description2",
      "discountType",
      "flatValue",
      "percentageValue",
      "planName",
      "expiryDate",
      "isActive",
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === 'isActive') {
          updates[key] = req.body[key] === 'true' || req.body[key] === true;
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    if (updates.flatValue !== undefined) {
      const numValue = Number(updates.flatValue);
      if (isNaN(numValue) || numValue < 0) {
        return sendBadRequestResponse(res, "Flat value must be a valid non-negative number");
      }
      updates.flatValue = numValue;
    }
    if (updates.percentageValue !== undefined) {
      const numValue = Number(updates.percentageValue);
      if (isNaN(numValue) || numValue < 0) {
        return sendBadRequestResponse(res, "Percentage value must be a valid non-negative number");
      }
      updates.percentageValue = numValue;
    }

    if (updates.planName !== undefined) {
      const validPlanNames = ["Single Match", "Monthly", "Quarterly", "Annual Plan"];
      if (updates.planName && updates.planName.trim()) {
        if (!validPlanNames.includes(updates.planName.trim())) {
          return sendBadRequestResponse(res, `Invalid plan name. Must be one of: ${validPlanNames.join(", ")} or null`);
        }
        updates.planName = updates.planName.trim();
      } else {
        updates.planName = null;
      }
    }

    let finalFlatValue =
      updates.flatValue !== undefined
        ? updates.flatValue
        : existingCoupon.flatValue;
    let finalPercentageValue =
      updates.percentageValue !== undefined
        ? updates.percentageValue
        : existingCoupon.percentageValue;

    if (
      updates.discountType ||
      updates.flatValue !== undefined ||
      updates.percentageValue !== undefined
    ) {
      const type = updates.discountType || existingCoupon.discountType;

      if (type === "flat") {
        if (updates.flatValue !== undefined && updates.flatValue <= 0) {
          return sendBadRequestResponse(res, "Flat value must be greater than 0");
        }
        finalPercentageValue = 0;
        updates.percentageValue = 0;
      } else if (type === "percentage") {
        if (
          updates.percentageValue !== undefined &&
          (updates.percentageValue <= 0 || updates.percentageValue > 100)
        ) {
          return sendBadRequestResponse(
            res,
            "Percentage value must be between 1 and 100"
          );
        }
        finalFlatValue = 0;
        updates.flatValue = 0;
      }

      updates.flatValue = finalFlatValue;
      updates.percentageValue = finalPercentageValue;
    }

    if (updates.expiryDate) {
      if (!/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(updates.expiryDate)) {
        return sendBadRequestResponse(res, "Invalid expiry date format. Please use DD/MM/YYYY or DD-MM-YYYY format");
      }

      const separator = updates.expiryDate.includes('/') ? '/' : '-';
      const [day, month, year] = updates.expiryDate.split(separator).map(Number);
      
      if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return sendBadRequestResponse(res, "Invalid date values. Please provide a valid date");
      }

      updates.expiryDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      if (isNaN(updates.expiryDate.getTime())) {
        return sendBadRequestResponse(res, "Invalid expiry date");
      }

      if (updates.expiryDate < new Date()) {
        return sendBadRequestResponse(res, "Expiry date cannot be in the past");
      }
    }

    if (updates.code) {
      const trimmedCode = updates.code.trim().toUpperCase();
      if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
        return sendBadRequestResponse(res, "Coupon code must contain only uppercase letters, numbers, and hyphens");
      }
      updates.code = trimmedCode;
    }
    
    if (updates.description) {
      updates.description = updates.description.trim();
    }
    if (updates.description2 !== undefined) {
      updates.description2 = updates.description2 ? updates.description2.trim() : "";
    }

    if (file) {
      if (existingCoupon.couponImage) {
        await deleteFileFromS3(existingCoupon.couponImage);
      }

      const uploaded = await uploadFile(file);
      updates.couponImage = uploaded.url;
    }

    const updatedCoupon = await CouponModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    return sendSuccessResponse(res, "Coupon updated successfully!", updatedCoupon);
  } catch (error) {
    console.error("Error updating coupon:", error);
    return ThrowError(res, 500, error.message);
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequestResponse(res, "Invalid Coupon ID!");
    }

    const coupon = await CouponModel.findById(id);
    if (!coupon) {
      return sendNotFoundResponse(res, "Coupon not found!");
    }

    if (coupon.couponImage) {
      await deleteFileFromS3(coupon.couponImage);
    }

    await CouponModel.findByIdAndDelete(id);

    return sendSuccessResponse(res, "Coupon deleted successfully!", {
      deletedId: id,
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return ThrowError(res, 500, error.message);
  }
};

export const applyCouponController = async (req, res) => {
  try {
    const CartModel = await loadCartModel();
    if (!CartModel) {
      return sendErrorResponse(res, 501, "Cart functionality not available", "Cart model is not implemented. Please create models/cart.model.js");
    }

    if (!req.user) {
      return sendUnauthorizedResponse(res, "Authentication required");
    }

    const { code, planName } = req.body;
    const userId = req.user._id || req.user.id;

    if (!code) {
      return sendBadRequestResponse(res, "Coupon code is required");
    }

    const cart = await CartModel.findOne({ userId })
      .populate({
        path: "items.productId",
        model: "Product",
        select: "productName title description isActive productDetails shippingReturn rating brand mainCategory category subCategory",
        populate: [
          {
            path: "brand",
            model: "Brand",
            select: "brandName brandImage",
          },
          {
            path: "mainCategory",
            model: "MainCategory",
            select: "mainCategoryName mainCategoryImage",
          },
          {
            path: "category",
            model: "Category",
            select: "categoryName categoryImage",
          },
          {
            path: "subCategory",
            model: "SubCategory",
            select: "subCategoryName subCategoryImage",
          },
        ],
      })
      .populate({
        path: "items.productVarientId",
        model: "ProductVariant",
        select: "variantTitle color images sku Artical_Number moreDetails brandIdentifying product_highlight weight sizeGuideId Occasion Outer_material Type_For_Casual Heel_Height",
      });

    if (!cart) {
      return sendNotFoundResponse(res, "Cart not found");
    }

    if (cart.items.length === 0) {
      return sendBadRequestResponse(res, "Cart is empty. Add products to apply coupon.");
    }

    let cartTotal = 0;
    cart.items.forEach((item) => {
      const variant = item.productVarientId;

      if (variant?.color?.sizes && variant.color.sizes.length > 0 && item.selectedSize) {
        const selectedSizeObj = variant.color.sizes.find(size => size.sizeValue === item.selectedSize);
        if (selectedSizeObj) {
          const effectivePrice = selectedSizeObj.discountedPrice && selectedSizeObj.discountedPrice > 0 ? selectedSizeObj.discountedPrice : selectedSizeObj.price;
          cartTotal += effectivePrice * item.quantity;
        }
      } else if (variant?.color) {
        const effectivePrice = variant.color.discountedPrice && variant.color.discountedPrice > 0 ? variant.color.discountedPrice : variant.color.price;
        cartTotal += effectivePrice * item.quantity;
      }
    });

    const coupon = await CouponModel.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return sendNotFoundResponse(res, "Invalid or inactive coupon");
    }

    if (coupon.expiryDate < new Date()) {
      return sendBadRequestResponse(res, "Coupon has expired");
    }

    if (coupon.planName) {
      if (!planName) {
        return sendBadRequestResponse(res, `This coupon is only valid for ${coupon.planName} plan. Please specify plan name.`);
      }
      if (coupon.planName !== planName.trim()) {
        return sendBadRequestResponse(res, `This coupon is only valid for ${coupon.planName} plan. You selected ${planName.trim()} plan.`);
      }
    }

    let discount = 0;
    let finalAmount = cartTotal;

    if (coupon.discountType === "percentage") {
      discount = (cartTotal * coupon.percentageValue) / 100;
    } else if (coupon.discountType === "flat") {
      discount = coupon.flatValue;
    }

    if (discount > cartTotal) {
      discount = cartTotal;
    }

    finalAmount = cartTotal - discount;

    cart.appliedCoupon = {
      code: coupon.code,
      couponId: coupon._id,
      discount: discount,
      discountType: coupon.discountType,
      percentageValue: coupon.percentageValue,
      flatValue: coupon.flatValue,
      planName: coupon.planName || null,
      originalAmount: cartTotal,
      finalAmount: finalAmount
    };

    await cart.save();

    return sendSuccessResponse(res, "Coupon applied successfully", {
      cartId: cart._id,
      items: cart.items,
      appliedCoupon: cart.appliedCoupon,
      originalAmount: cartTotal,
      discount,
      finalAmount,
      discountType: coupon.discountType,
      percentageValue: coupon.percentageValue,
      flatValue: coupon.flatValue,
      planName: coupon.planName || null,
      expiryDate: coupon.expiryDate,
      orderInstruction: cart.orderInstruction,
      isGiftWrap: cart.isGiftWrap
    });

  } catch (error) {
    console.error("applyCouponController error:", error);
    return sendErrorResponse(res, 500, "Error applying coupon", error.message);
  }
};

export const removeCouponController = async (req, res) => {
  try {
    const CartModel = await loadCartModel();
    if (!CartModel) {
      return sendErrorResponse(res, 501, "Cart functionality not available", "Cart model is not implemented. Please create models/cart.model.js");
    }

    if (!req.user) {
      return sendUnauthorizedResponse(res, "Authentication required");
    }

    const userId = req.user._id || req.user.id;

    const cart = await CartModel.findOne({ userId })
      .populate({
        path: "items.productId",
        model: "Product",
        select: "productName title description isActive productDetails shippingReturn rating brand mainCategory category subCategory",
        populate: [
          {
            path: "brand",
            model: "Brand",
            select: "brandName brandImage",
          },
          {
            path: "mainCategory",
            model: "MainCategory",
            select: "mainCategoryName mainCategoryImage",
          },
          {
            path: "category",
            model: "Category",
            select: "categoryName categoryImage",
          },
          {
            path: "subCategory",
            model: "SubCategory",
            select: "subCategoryName subCategoryImage",
          },
        ],
      })
      .populate({
        path: "items.productVarientId",
        model: "ProductVariant",
        select: "variantTitle color images sku Artical_Number moreDetails brandIdentifying product_highlight weight sizeGuideId Occasion Outer_material Type_For_Casual Heel_Height",
      });
    if (!cart) {
      return sendNotFoundResponse(res, "Cart not found");
    }

    let cartTotal = 0;
    cart.items.forEach((item) => {
      const variant = item.productVarientId;

      if (variant?.color?.sizes && variant.color.sizes.length > 0 && item.selectedSize) {
        const selectedSizeObj = variant.color.sizes.find(size => size.sizeValue === item.selectedSize);
        if (selectedSizeObj) {
          const effectivePrice = selectedSizeObj.discountedPrice && selectedSizeObj.discountedPrice > 0 ? selectedSizeObj.discountedPrice : selectedSizeObj.price;
          cartTotal += effectivePrice * item.quantity;
        }
      } else if (variant?.color) {
        const effectivePrice = variant.color.discountedPrice && variant.color.discountedPrice > 0 ? variant.color.discountedPrice : variant.color.price;
        cartTotal += effectivePrice * item.quantity;
      }
    });

    const removedCoupon = cart.appliedCoupon;
    cart.appliedCoupon = undefined;
    await cart.save();

    return sendSuccessResponse(res, "Coupon removed successfully", {
      cartId: cart._id,
      items: cart.items,
      originalAmount: cartTotal,
      finalAmount: cartTotal,
      discount: 0,
      removedCoupon: removedCoupon,
      orderInstruction: cart.orderInstruction,
      isGiftWrap: cart.isGiftWrap
    });

  } catch (error) {
    console.error("removeCouponController error:", error);
    return sendErrorResponse(res, 500, "Error removing coupon", error.message);
  }
};

export const applyCouponForPlan = async (req, res) => {
  try {
    if (!req.user) {
      return sendUnauthorizedResponse(res, "Authentication required");
    }

    const { code, planName, planPrice } = req.body;

    if (!code) {
      return sendBadRequestResponse(res, "Coupon code is required");
    }

    if (!planName) {
      return sendBadRequestResponse(res, "Plan name is required");
    }

    if (!planPrice || planPrice <= 0) {
      return sendBadRequestResponse(res, "Valid plan price is required");
    }

    const validPlanNames = ["Single Match", "Monthly", "Quarterly", "Annual Plan"];
    if (!validPlanNames.includes(planName.trim())) {
      return sendBadRequestResponse(res, `Invalid plan name. Must be one of: ${validPlanNames.join(", ")}`);
    }

    const coupon = await CouponModel.findOne({
      code: code.toUpperCase().trim(),
      isActive: true
    });

    if (!coupon) {
      return sendNotFoundResponse(res, "Invalid or inactive coupon");
    }

    if (coupon.expiryDate < new Date()) {
      return sendBadRequestResponse(res, "Coupon has expired");
    }

    if (coupon.planName) {
      if (coupon.planName !== planName.trim()) {
        return sendBadRequestResponse(res, `This coupon is only valid for ${coupon.planName} plan. You selected ${planName.trim()} plan.`);
      }
    }

    const numPlanPrice = Number(planPrice);
    if (isNaN(numPlanPrice) || numPlanPrice <= 0) {
      return sendBadRequestResponse(res, "Invalid plan price");
    }

    let discount = 0;
    let finalAmount = numPlanPrice;

    if (coupon.discountType === "percentage") {
      discount = (numPlanPrice * coupon.percentageValue) / 100;
    } else if (coupon.discountType === "flat") {
      discount = coupon.flatValue;
    }

    if (discount > numPlanPrice) {
      discount = numPlanPrice;
    }

    finalAmount = numPlanPrice - discount;

    return sendSuccessResponse(res, "Coupon applied successfully", {
      coupon: {
        code: coupon.code,
        couponId: coupon._id,
        description: coupon.description,
      description2,
        discountType: coupon.discountType,
        percentageValue: coupon.percentageValue,
        flatValue: coupon.flatValue,
        planName: coupon.planName || null,
      },
      planName: planName.trim(),
      originalPrice: numPlanPrice,
      discount: discount,
      finalAmount: finalAmount,
      expiryDate: coupon.expiryDate,
    });

  } catch (error) {
    console.error("applyCouponForPlan error:", error);
    return sendErrorResponse(res, 500, "Error applying coupon", error.message);
  }
};
