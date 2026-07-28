const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

let transporter;

const getTransporter = () => {
    if (transporter) {
        return transporter;
    }

    transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });

    return transporter;
};

const sendOtpToEmail = async (email, otp) => {
    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #075e54;">📩 WhatsApp Web Verification</h2>

        <p>Hi there,</p>

        <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>

        <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 4px;">
            ${otp}
        </h1>

        <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>

        <p>If you didn't request this OTP, please ignore this email.</p>

        <p style="margin-top: 20px;">
            Thanks & Regards,<br/>
            WhatsApp Web Security Team
        </p>

        <hr style="margin: 30px 0;" />

        <small style="color: #777;">
            This is an automated message. Please do not reply.
        </small>
    </div>
    `;

    await getTransporter().sendMail({
        from: `WhatsApp Web <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your WhatsApp Verification Code",
        html,
    });
};

module.exports = sendOtpToEmail;
