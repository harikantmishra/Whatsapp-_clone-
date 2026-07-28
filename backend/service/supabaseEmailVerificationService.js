const getEnvValue = require("../utils/getEnvValue.js");

const supabaseUrl = getEnvValue("SUPABASE_URL", "SUPABASE_PROJECT_URL");
const supabaseAnonKey = getEnvValue(
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY"
);

const isSupabaseEmailVerificationEnabled = () =>
  Boolean(supabaseUrl && supabaseAnonKey);

const createHeaders = () => ({
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  "Content-Type": "application/json",
});

const getErrorMessage = async (res, fallbackMessage) => {
  try {
    const data = await res.json();
    return (
      data?.msg ||
      data?.message ||
      data?.error_description ||
      data?.error ||
      fallbackMessage
    );
  } catch (error) {
    return fallbackMessage;
  }
};

const sendSupabaseEmailOtp = async (email) => {
  if (!isSupabaseEmailVerificationEnabled()) {
    return {
      enabled: false,
    };
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/otp`, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify({
      email,
      create_user: true,
    }),
  });

  if (!res.ok) {
    const message = await getErrorMessage(
      res,
      "Failed to send Supabase email OTP"
    );
    const error = new Error(message);
    error.code = "SUPABASE_EMAIL_OTP_SEND_FAILED";
    throw error;
  }

  return {
    enabled: true,
  };
};

const verifySupabaseEmailOtp = async (email, token) => {
  if (!isSupabaseEmailVerificationEnabled()) {
    return {
      enabled: false,
      verified: false,
    };
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: createHeaders(),
    body: JSON.stringify({
      email,
      token,
      type: "email",
    }),
  });

  if (!res.ok) {
    const message = await getErrorMessage(
      res,
      "Invalid or expired Supabase email OTP"
    );
    const error = new Error(message);
    error.code = "SUPABASE_EMAIL_OTP_VERIFY_FAILED";
    throw error;
  }

  const data = await res.json();

  return {
    enabled: true,
    verified: true,
    user: data?.user || null,
    session: data?.session || null,
  };
};

module.exports = {
  isSupabaseEmailVerificationEnabled,
  sendSupabaseEmailOtp,
  verifySupabaseEmailOtp,
};
