const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    const configError = new Error(
      "Email service is not configured. Set EMAIL_USER and EMAIL_PASS."
    );
    configError.code = "EMAIL_CONFIG_MISSING";
    throw configError;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

const sendOtpToEmail = async (email, otp) => {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #075e54;">WhatsApp Web Verification</h2>

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

  try {
    await transporter.sendMail({
      from: `WhatsApp Web <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your WhatsApp Verification Code",
      html,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error);

    if (error.code === "EAUTH") {
      const authError = new Error(
        "Gmail authentication failed. Use a Gmail app password in EMAIL_PASS."
      );
      authError.code = "EMAIL_AUTH_FAILED";
      throw authError;
    }

    if (error.code === "ESOCKET" || error.code === "ETIMEDOUT") {
      const networkError = new Error(
        "Email service could not reach Gmail. Check your deployment network settings."
      );
      networkError.code = "EMAIL_NETWORK_ERROR";
      throw networkError;
    }

    throw error;
  }
};

module.exports = sendOtpToEmail;
