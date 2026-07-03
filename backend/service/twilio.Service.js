const twilio = require("twilio");

// Twilio credentials from env
const accountSid = process.env.TWILLO_ACCOUNT_SID;
const authToken = process.env.TWILLO_AUTH_TOKEN;
const serviceSid = process.env.TWILLO_SERVICE_SID;

const client = twilio(accountSid, authToken);

// Send OTP to phone number
const sendOtpToPhoneNumber = async (phoneNumber) => {
    try {
        console.log("Sending OTP to this number:", phoneNumber);

        if (!phoneNumber) {
            throw new Error("Phone number is required");
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