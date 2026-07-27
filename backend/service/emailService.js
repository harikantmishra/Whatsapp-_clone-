const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const sendOtpToEmail = async (email, otp) => {
  const html = `
    <h2>WhatsApp Verification</h2>
    <p>Your OTP is:</p>
    <h1>${otp}</h1>
    <p>This OTP is valid for 5 minutes.</p>
  `;

  try {
    console.log("========== BREVO DEBUG ==========");
    console.log("BREVO_API_KEY:", process.env.BREVO_API_KEY?.slice(0, 15));
    console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
    console.log("TO:", email);
    console.log("================================");

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "WhatsApp Web",
          email: process.env.EMAIL_FROM,
        },
        to: [{ email }],
        subject: "Your WhatsApp Verification Code",
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Status:", response.status);
    console.log("Response:", response.data);
  } catch (err) {
    console.error("========== BREVO ERROR ==========");
    console.error(err.response?.data || err.message);
    console.error("================================");
    throw err;
  }
};

module.exports = sendOtpToEmail;