const twilio = require("twilio");
const dotenv = require("dotenv");

dotenv.config();

// Twilio credentials from env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

// Send OTP to phone number
const sendOtpToPhoneNumber = async (phoneNumber) => {
    try {
        console.log("Sending OTP to this number:", phoneNumber);

        if (!phoneNumber) {
            throw new Error("Phone number is required");
        }

        if (!accountSid || !authToken || !serviceSid) {
            throw new Error("Twilio environment variables are not configured correctly");
        }

        const response = await client.verify.v2
            .services(serviceSid)
            .verifications.create({
                to: phoneNumber,
                channel: "sms",
            });

        console.log("This is my OTP response:", response);
        return response;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to send OTP");
    }
};

// Verify OTP
const verifyOtp = async (phoneNumber, otp) => {
    try {
        if (!phoneNumber) {
            throw new Error("Phone number is required");
        }

        if (!accountSid || !authToken || !serviceSid) {
            throw new Error("Twilio environment variables are not configured correctly");
        }

        const response = await client.verify.v2
            .services(serviceSid)
            .verificationChecks.create({
                to: phoneNumber,
                code: otp,
            });

        console.log("This is my OTP response:", response);
        return response;
    } catch (error) {
        console.error(error);
        throw new Error("Failed to verify OTP");
    }
};


module.exports = {
    sendOtpToPhoneNumber,
    verifyOtp,
};
