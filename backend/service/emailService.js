const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.error("Gmail services connection failed");
    } else {
        console.log("Gmail configured properly and ready to send email");
    }
});

const sendOtpToEmail = async (email, otp) => {
    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #075e54;">🔐 WhatsApp Web Verification</h2>

        <p>Hi there,</p>

        <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>

        <h1 style="
            background: #075e54;
            color: #fff;
            display: inline-block;
            padding: 12px 20px;
            border-radius: 6px;
            letter-spacing: 4px;
        ">
            ${otp}
        </h1>

        <p>This OTP is valid for <strong>5 minutes</strong>.</p>

        <p>If you did not request this code, please ignore this email.</p>

        <p style="margin-top:20px;">
            Thanks & Regards,<br/>
            WhatsApp Web Security Team
        </p>

        <hr style="margin:30px 0;" />

        <small style="color:#777;">
            This is an automated message. Please do not reply.
        </small>
    </div>
    `;

    await transporter.sendMail({
        from: `WhatsApp Web <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your WhatsApp Verification Code",
        html,
    });
};

module.exports = sendOtpToEmail;