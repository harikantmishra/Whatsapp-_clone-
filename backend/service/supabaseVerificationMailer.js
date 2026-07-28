const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
});

const sendSupabaseVerificationEmail = async (email, actionLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">Confirm Your Email Address</h2>
      <p>You're almost done setting up your WhatsApp Web account.</p>
      <p>Click the button below to verify your email with Supabase:</p>
      <p style="margin: 24px 0;">
        <a
          href="${actionLink}"
          style="background: #075e54; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;"
        >
          Verify Email
        </a>
      </p>
      <p>If the button does not work, open this link in your browser:</p>
      <p style="word-break: break-all; color: #075e54;">${actionLink}</p>
      <p>This verification email works alongside your OTP login flow. Please complete both steps.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `WhatsApp Web <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your email for WhatsApp Web",
    html,
  });
};

module.exports = sendSupabaseVerificationEmail;
