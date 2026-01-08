import dotenv from "dotenv";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import twilio from 'twilio';
import { uploadFile, deleteFileFromS3 } from "../middleware/imageupload.js";

dotenv.config({ path: '.env' });

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SID;
const defaultUserImage = "https://cricklive.s3.eu-north-1.amazonaws.com/default-user.jpg";

const generateOTPCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPToPhone = async (mobileNo) => {
    try {
        const cleanMobile = mobileNo.toString().replace(/\D/g, '').slice(-10);
        const client = twilio(accountSid, authToken);

        const verification = await client.verify.v2
            .services(verifyServiceSid)
            .verifications.create({
                to: `+91${cleanMobile}`,
                channel: "sms",
            });

        return {
            success: true,
            smsSent: true,
            verificationSid: verification.sid,
            status: verification.status
        };

    } catch (error) {
        return {
            success: false,
            smsSent: false,
            error: error.message,
            code: error.code
        };
    }
};

export const sendOTP = async (req, res) => {
    try {
        const { mobileNo } = req.body;

        if (!mobileNo || typeof mobileNo !== 'string' || mobileNo.length !== 10) {
            return res.status(400).json({
                success: false,
                message: "Valid 10-digit mobile number required"
            });
        }

        const cleanMobileNo = mobileNo.replace(/\D/g, '').slice(-10);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        const otpResult = await sendOTPToPhone(cleanMobileNo);

        if (otpResult.smsSent) {
            try {
                let user = await User.findOne({ mobileNo: cleanMobileNo });

                if (user) {
                    user.verificationSid = otpResult.verificationSid;
                    user.otpExpiry = otpExpiry;
                    user.otpSentAt = new Date();
                    await user.save();
                } else {
                    user = await User.create({
                        mobileNo: cleanMobileNo,
                        verificationSid: otpResult.verificationSid,
                        otpExpiry: otpExpiry,
                        isVerified: false,
                        otpSentAt: new Date(),
                        name: "User",
                        profileImage: defaultUserImage
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "OTP sent to your mobile via Twilio",
                    smsSent: true,
                    verificationSid: otpResult.verificationSid,
                    result: []
                });

            } catch (dbError) {
                return res.status(200).json({
                    success: true,
                    message: "OTP sent but database update failed",
                    smsSent: true,
                    verificationSid: otpResult.verificationSid,
                    dbError: dbError.message,
                    result: []
                });
            }

        } else {
            const fallbackOtp = generateOTPCode();

            try {
                let user = await User.findOne({ mobileNo: cleanMobileNo });

                if (user) {
                    user.otp = fallbackOtp;
                    user.otpExpiry = otpExpiry;
                    user.otpSentAt = new Date();
                    await user.save();
                } else {
                    user = await User.create({
                        mobileNo: cleanMobileNo,
                        otp: fallbackOtp,
                        otpExpiry: otpExpiry,
                        isVerified: false,
                        otpSentAt: new Date(),
                        name: "User",
                        profileImage: defaultUserImage
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "OTP in console (Twilio failed)",
                    smsSent: false,
                    error: otpResult.error,
                    code: otpResult.code,
                    otpInConsole: fallbackOtp,
                    result: []
                });

            } catch (dbError) {
                return res.status(200).json({
                    success: true,
                    message: "OTP generated but database failed",
                    smsSent: false,
                    otpInConsole: fallbackOtp,
                    result: []
                });
            }
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { mobileNo, otp } = req.body;

        if (!mobileNo || !otp) {
            return res.status(400).json({
                success: false,
                message: "Mobile number and OTP required"
            });
        }

        const cleanMobileNo = mobileNo.replace(/\D/g, '').slice(-10);
        const client = twilio(accountSid, authToken);

        let user = await User.findOne({ mobileNo: cleanMobileNo });
        let sidToVerify = user?.verificationSid;

        if (!sidToVerify) {
            if (user && user.otp) {
                if (!user.otpExpiry || user.otpExpiry < new Date()) {
                    return res.status(400).json({
                        success: false,
                        message: "OTP expired"
                    });
                }

                if (user.otp !== otp) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid OTP"
                    });
                }

                user.isVerified = true;
                user.otp = null;
                user.otpExpiry = null;
                await user.save();
            } else {
                return res.status(400).json({
                    success: false,
                    message: "No verification method found"
                });
            }
        } else {
            const verificationCheck = await client.verify.v2
                .services(verifyServiceSid)
                .verificationChecks.create({
                    verificationSid: sidToVerify,
                    code: otp,
                });

            if (!verificationCheck.valid) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP"
                });
            }

            if (!user) {
                user = await User.create({
                    mobileNo: cleanMobileNo,
                    isVerified: true,
                    name: "User",
                    profileImage: defaultUserImage
                });
            } else {
                user.isVerified = true;
                user.verificationSid = null;
                user.otp = null;
                await user.save();
            }
        }

        const token = jwt.sign(
            { _id: user._id, mobileNo: user.mobileNo },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: "Verification successful",
            result: {
                token,
                user: {
                    _id: user._id,
                    mobileNo: user.mobileNo,
                    name: user.name,
                    profileImage: user.profileImage,
                    isVerified: user.isVerified
                }
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user._id;
        const file = req.file;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        let profileImageUrl = user.profileImage;

        if (file) {
            if (user.profileImage && user.profileImage !== defaultUserImage) {
                await deleteFileFromS3(user.profileImage);
            }

            const uploadResult = await uploadFile(file);
            profileImageUrl = uploadResult.url;
        }

        if (name) user.name = name;
        user.profileImage = profileImageUrl;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            result: {
                user: {
                    _id: user._id,
                    mobileNo: user.mobileNo,
                    name: user.name,
                    profileImage: user.profileImage,
                    isVerified: user.isVerified
                }
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};