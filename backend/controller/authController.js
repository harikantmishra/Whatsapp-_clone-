const otpGenerate = require("../utils/otpGenerator.js");
const User = require("../models/User.js");
const response = require("../utils/responseHandler.js");
const sendOtpToEmail = require('../service/emailService.js')
const twilioService = require('../service/twilio.Service.js')
const generateToken = require('../utils/generateJWT.js')
// Send OTP
const sendOtp = async (req, res) => {
    const { phoneNumber, phoneSuffix, email } = req.body;

    const otp = otpGenerate();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    let user;

    try {
        // Email OTP
        if (email) {
            user = await User.findOne({ email });

            if (!user) {
                user = new User({ email });
            }

            user.emailOtp = otp;
            user.emailOtpExpiry = expiry;

            await user.save();
            await sendOtpToEmail(email,top)
            return response(res, 200, "OTP sent successfully", {
                email,
            });
        }

        // Phone OTP
        if (!phoneNumber || !phoneSuffix) {
            return response(
                res,
                400,
                "Phone number and phone suffix are required"
            );
        }

        const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

        user = await User.findOne({ phoneNumber });

        if (!user) {
            user = new User({
                phoneNumber,
                phoneSuffix,
            });
        }

        await twilioService.sendOtpToPhoneNumber(fullPhoneNumber); 

        await user.save();

        return response(res, 200, "OTP sent successfully",user);
    } catch (error) {
        console.error(error);

        return response(res, 500, "Internal Server Error");
    }
};

module.exports = { sendOtp };

// step 2 : verify otp 

const verifyOtp = async (req, res) => {
    const { phoneNumber, phoneSuffix, email, otp } = req.body;

    try {
        let user;

        // Email OTP Verification
        if (email) {
            user = await User.findOne({ email });

            if (!user) {
                return response(res, 404, "User not found");
            }

            const now = new Date();

            if (
                !user.emailOtp ||
                String(user.emailOtp) !== String(otp) ||
                now > new Date(user.emailOtpExpiry)
            ) {
                return response(res, 400, "Invalid or expired otp");
            }

            user.isVerified = true;
            user.emailOtp = null;
            user.emailOtpExpiry = null;

            await user.save();
        }

        // Phone OTP Verification
        else {
            if (!phoneNumber || !phoneSuffix) {
                return response(
                    res,
                    400,
                    "Phone number and phone suffix are required"
                );
            }

            const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

            user = await User.findOne({
                phoneNumber,
            });

            if (!user) {
                return response(res, 404, "User not found");
            }

            const result = await twilioService.verifyOtp(
                fullPhoneNumber,
                otp
            );

            if (result.status !== "approved") {
                return response(res, 400, "Invalid otp");
            }

            user.isVerified = true;
            await user.save();
        }

        // Generate JWT
        const token = generateToken(user._id);

        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        return response(res, 200, "Otp verified successfully", {
            token,
            user,
        });
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal Server Error");
    }
};

module.exports = {
    sendOtp,verifyOtp
}