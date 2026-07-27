const { Resend } = require("resend");
const dotenv = require("dotenv");

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpToEmail = async (email, otp) => {
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
    const { error } = await resend.emails.send({
      from: "WhatsApp Web <onboarding@resend.dev>",
      to: email,
      subject: "Your WhatsApp Verification Code",
      html,
    });

    if (error) {
      console.error(error);
      throw new Error(error.message);
    }

    console.log("OTP email sent successfully");
  } catch (err) {
    console.error("Resend Error:", err);
    throw err;
  }
};

module.exports = sendOtpToEmail;