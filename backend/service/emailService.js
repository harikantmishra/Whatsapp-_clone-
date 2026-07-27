const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpToEmail = async (email, otp) => {
  try {
    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ Gmail SMTP Connected");

    const info = await transporter.sendMail({
      from: `"WhatsApp Web" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your WhatsApp Verification Code",
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>WhatsApp Verification</h2>
          <p>Your OTP is:</p>
          <h1 style="color:#25D366">${otp}</h1>
          <p>This OTP is valid for <b>5 minutes</b>.</p>
        </div>
      `,
    });

    console.log("✅ Email Sent");
    console.log("Message ID:", info.messageId);

    return true;
  } catch (error) {
    console.error("❌ Email Error:");
    console.error(error);
    throw error;
  }
};

module.exports = sendOtpToEmail;