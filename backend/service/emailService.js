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

    console.log("✅ Email sent");
    console.log(response.data);
  } catch (err) {
    console.error(
      err.response ? err.response.data : err.message
    );
    throw err;
  }
};

module.exports = sendOtpToEmail;