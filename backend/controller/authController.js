const otpGenerate = require("../utils/otpGenerator.js");
const User = require("../models/User.js");
const response = require("../utils/responseHandler.js");
const sendOtpToEmail = require("../service/emailService.js");
const twilioService = require("../service/twilio.Service.js");
const generateToken = require("../utils/generateJWT.js");
const { uploadFileToCloudinary } = require("../config/cloudinary.js");
const Conversation = require("../models/conversation.js");
const {
  isSupabaseEmailVerificationEnabled,
  sendSupabaseEmailOtp,
  verifySupabaseEmailOtp,
} = require("../service/supabaseEmailVerificationService.js");

const isProduction = process.env.NODE_ENV === "production";
const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 1000 * 60 * 60 * 24 * 365,
};

const finalizeAuthenticatedUser = async (user, res, message = "Otp verified successfully") => {
  user.isVerified = true;
  user.pendingEmailVerification = false;
  user.emailOtp = null;
  user.emailOtpExpiry = null;
  user.emailOtpVerifiedAt = null;

  await user.save();

  const token = generateToken(user._id);
  res.cookie("auth_token", token, authCookieOptions);

  return response(res, 200, message, {
    token,
    user,
  });
};

// Send OTP
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const hasEmailAuth = Boolean(email);
  const hasPhoneAuth = Boolean(phoneNumber || phoneSuffix);

  if (hasEmailAuth && hasPhoneAuth) {
    return response(res, 400, "Use either email or phone auth, not both");
  }

  if (!hasEmailAuth && !hasPhoneAuth) {
    return response(res, 400, "Email or phone auth details are required");
  }

  const otp = otpGenerate();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  let user;

  try {
    // Email OTP
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        user = new User({ email: normalizedEmail });
      }

      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      user.emailOtpVerifiedAt = null;
      user.pendingEmailVerification = false;

      if (isSupabaseEmailVerificationEnabled()) {
        await sendSupabaseEmailOtp(normalizedEmail);
      } else {
        await sendOtpToEmail(normalizedEmail, otp);
      }

      await user.save();
      return response(res, 200, "OTP sent successfully", {
        email: normalizedEmail,
        provider: isSupabaseEmailVerificationEnabled() ? "supabase" : "legacy",
      });
    }

    // Phone OTP
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number and phone suffix are required");
    }

    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

    user = await User.findOne({ phoneNumber });

    if (!user) {
      user = new User({
        phoneNumber,
        phoneSuffix,
      });
    }

    await twilioService.sendOtpToPhoneNumber(fullPhoneNumber);

    await user.save();

    return response(res, 200, "OTP sent successfully", {
      phoneNumber,
      phoneSuffix,
    });
  } catch (error) {
    console.error(error);

    if (
      error?.code === "EMAIL_CONFIG_MISSING" ||
      error?.code === "EMAIL_AUTH_FAILED" ||
      error?.code === "EMAIL_NETWORK_ERROR"
    ) {
      return response(res, 500, error.message);
    }

    return response(res, 500, "Internal Server Error");
  }
};

module.exports = { sendOtp };

// step 2 : verify otp

const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;
  const hasEmailAuth = Boolean(email);
  const hasPhoneAuth = Boolean(phoneNumber || phoneSuffix);

  if (hasEmailAuth && hasPhoneAuth) {
    return response(res, 400, "Use either email or phone auth, not both");
  }

  if (!hasEmailAuth && !hasPhoneAuth) {
    return response(res, 400, "Email or phone auth details are required");
  }

  if (!otp) {
    return response(res, 400, "Otp is required");
  }

  try {
    let user;

    // Email OTP Verification
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return response(res, 404, "User not found");
      }

      const now = new Date();

      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        !user.emailOtpExpiry ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return response(res, 400, "Invalid or expired otp");
      }

      if (isSupabaseEmailVerificationEnabled()) {
        const supabaseVerification = await verifySupabaseEmailOtp(
          normalizedEmail,
          String(otp)
        );

        user.emailOtpVerifiedAt = new Date();
        user.pendingEmailVerification = false;
        user.supabaseUserId = supabaseVerification?.user?.id || user.supabaseUserId;
        user.supabaseEmailConfirmedAt = new Date();
        user.emailOtp = null;
        user.emailOtpExpiry = null;
        await user.save();
      } else {
        user.emailOtpVerifiedAt = new Date();
      }
    }

    // Phone OTP Verification
    else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and phone suffix are required");
      }

      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;

      user = await User.findOne({
        phoneNumber,
      });

      if (!user) {
        return response(res, 404, "User not found");
      }

      const result = await twilioService.verifyOtp(fullPhoneNumber, otp);

      if (result.status !== "approved") {
        return response(res, 400, "Invalid otp");
      }

      user.isVerified = true;
      await user.save();
    }

    return finalizeAuthenticatedUser(user, res);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal Server Error");
  }
};

const updateProfile = async (req, res) => {
    const { username, agreed, about, avatar } = req.body;
    const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    const file = req.file;
    if (!user) {
      return response(res, 404, "User not found");
    }

    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.profilePicture = uploadResult?.secure_url;
    } else if (avatar) {
      user.profilePicture = avatar;
    }

    if (username) user.username = username;
    if (typeof agreed !== "undefined") user.agreed = agreed;
    if (about) user.about = about;

    await user.save();

    return response(res, 200, "User Profile updated successfully", user);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const checkAuth = async(req,res)=>{
    try{
        const userId = req.user.userId;
        if(!userId){
            return response(res,404,'Unauthorization ! please login before access our app');
        }
        const user =  await User.findById(userId);
        if(!user){
            return response(res,404,'User not found');
        }
          return response(res,200,'user retrived and allow to use whatsapp',user);
    }
    catch(error){
        console.log(error);
    return response(res, 500, "Internal server error");
    }
}

const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;

  try {
    // Get all users except the logged-in user
    const users = await User.find({
      _id: { $ne: loggedInUser }
    })
      .select(
        "username profilePicture lastSeen isOnline about phoneNumber phoneSuffix"
      )
      .lean();

    // Attach conversation to each user
    const usersWithConversation = await Promise.all(
      users.map(async (user) => {

        const conversation = await Conversation.findOne({
          participants: {
            $all: [loggedInUser, user._id]
          }
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver"
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );

    res.status(200).json({
      success: true,
      users: usersWithConversation,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const logout = (req, res) => {
  try {
    res.cookie("auth_token", "", {
      ...authCookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });
    return response(res, 200, "User logout successfully");
  } catch (error) {
    console.log(error);
    return res(res, 500, "Internal sever error");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuth,
  getAllUsers
};
