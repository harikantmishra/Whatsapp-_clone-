const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.BREVO_HOST,
    port: Number(process.env.BREVO_PORT),
    secure: false, // Port 587 uses STARTTLS
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS,
    },
  });
};

const sendOtpToEmail = async (email, otp) => {
  console.log("BREVO_HOST:", process.env.BREVO_HOST);
console.log("BREVO_PORT:", process.env.BREVO_PORT);
console.log("BREVO_USER:", process.env.BREVO_USER);
console.log("BREVO_PASS:", process.env.BREVO_PASS ? "Loaded" : "Missing");
console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">WhatsApp Web Verification</h2>

      <p>Hi there,</p>

      <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>

      <h1 style="
        background:#075e54;
        color:#fff;
        display:inline-block;
        padding:12px 20px;
        border-radius:6px;
        letter-spacing:4px;
      ">
        ${otp}
      </h1>

      <p>This OTP is valid for <strong>5 minutes</strong>.</p>

      <p>If you did not request this code, please ignore this email.</p>

      <p style="margin-top:20px;">
        Thanks & Regards,<br/>
        WhatsApp Web Security Team
      </p>

      <hr/>

      <small style="color:#777;">
        This is an automated message. Please do not reply.
      </small>
    </div>
  `;

  try {
      await transporter.verify();
  console.log("SMTP connected");
    await transporter.sendMail({
      from: `WhatsApp Web <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Your WhatsApp Verification Code",
      html,
    });

    console.log("✅ OTP email sent successfully");
  } catch (error) {
    console.error("========== BREVO SMTP ERROR ==========");
    console.error(error);
    console.error("Code:", error.code);
    console.error("Command:", error.command);
    console.error("Response:", error.response);
    console.error("===============================");

    throw error;
  }
};

module.exports = sendOtpToEmail;