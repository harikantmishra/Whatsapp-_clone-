import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FaArrowLeft, FaChevronDown, FaUser, FaWhatsapp } from "react-icons/fa";
import countries from "../utils/countries";
import useLoginStore from "../store/useLoginStore";

import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

import Spinner from "../utils/Spinner";

import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/themeStore";

import {
  sendOtp,
  verifyOtp,
  updateUserProfile,
} from "../services/userServices";

const loginSchema = yup
  .object({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d*$/, "Phone number must contain only digits"),

    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email"),
  })
  .test(
    "phone-or-email",
    "Either phone number or email is required",
    (value) => !!value?.phoneNumber || !!value?.email,
  );

const profileSchema = yup.object({
  username: yup
    .string()
    .required("Username is required")
    .min(3, "Minimum 3 characters"),

  agreed: yup.bool().oneOf([true], "Accept Terms & Conditions"),
});

function getFlagEmoji(alpha2) {
  return alpha2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt()))
    .join("");
}

const createOtpState = () => Array(8).fill("");
const EMAIL_OTP_LENGTH = 8;
const PHONE_OTP_LENGTH = 6;

function Login() {
  const navigate = useNavigate();

  const { user, setUser } = useUserStore();

  const { theme } = useThemeStore();

  const {
    step,
    setStep,
    userPhoneData,
    setUserPhoneData,
    resetLoginState,
  } = useLoginStore();
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState(createOtpState);

  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState(countries[0]);

  const [profilePicture, setProfilePicture] = useState(null);

  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      phoneNumber: "",
      email: "",
    },
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      username: "",
      agreed: false,
    },
  });

  const filteredCountries = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query),
    );
  }, [searchTerm]);

  const progressWidth = `${(step / 3) * 100}%`;
  const isEmailOtpFlow = userPhoneData?.authMethod === "email";
  const otpLength = isEmailOtpFlow ? EMAIL_OTP_LENGTH : PHONE_OTP_LENGTH;

  // =======================
  // Login Submit
  // =======================

  const onLoginSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");

      const phoneNumber = data.phoneNumber?.trim();
      const email = data.email?.trim();

      let response;

      if (email) {
        response = await sendOtp(null, null, email);

        if (response.status === "success") {
          toast.success("OTP sent to your email");
          setOtp(createOtpState());

          setUserPhoneData({
            email,
            authMethod: "email",
          });

          setStep(2);
        } else {
          throw new Error(response.message);
        }
      } else {
        response = await sendOtp(phoneNumber, selectedCountry.dialCode, null);

        if (response.status === "success") {
          toast.success("OTP sent successfully");
          setOtp(createOtpState());

          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
            authMethod: "phone",
          });

          setStep(2);
        } else {
          throw new Error(response.message);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Verify OTP
  // =======================

  const onOtpSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (!userPhoneData) {
        throw new Error("User information missing");
      }

      const otpString = otp.join("");

      if (otpString.length !== otpLength) {
        throw new Error("Please enter complete OTP");
      }

      let response;

      if (isEmailOtpFlow) {
        response = await verifyOtp(null, null, otpString, userPhoneData.email);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          otpString,
        );
      }

      if (response.status !== "success") {
        throw new Error(response.message);
      }

      toast.success("OTP Verified");

      const user = response.data.user;

      if (user.username && user.profilePicture) {
        setUser(user);
        resetLoginState();
        navigate("/");
        return;
      }

      setUser(user);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // Profile Submit
  // =======================

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");

      const formData = new FormData();

      formData.append("username", data.username);
      formData.append("agreed", String(data.agreed));

      if (profilePicture) {
        formData.append("media", profilePicture);
      } else {
        formData.append("avatar", selectedAvatar);
      }

      const response = await updateUserProfile(formData);

      if (response.status !== "success") {
        throw new Error(response.message);
      }

      toast.success("Profile Updated");

      setUser(response.data);

      resetLoginState();

      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // OTP Input
  // =======================

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];

    newOtp[index] = value;

    setOtp(newOtp);

    if (value && index < otpLength - 1) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pastedValue = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, otpLength);

    if (!pastedValue) {
      return;
    }

    e.preventDefault();

    const nextOtp = createOtpState();

    pastedValue.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);

    const focusIndex = Math.min(pastedValue.length, otpLength) - 1;
    if (focusIndex >= 0) {
      document.getElementById(`otp-${focusIndex}`)?.focus();
    }
  };

  // =======================
  // OTP Backspace
  // =======================

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // =======================
  // Go Back
  // =======================

  const handleBack = () => {
    setStep(1);

    setOtp(createOtpState());

    setUserPhoneData(null);

    setError("");
  };

  // =======================
  // Avatar
  // =======================

  const handleAvatarSelect = (avatar) => {
    setSelectedAvatar(avatar);

    setProfilePicture(null);
  };

  // =======================
  // Image Upload
  // =======================

  const handleImageUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setProfilePicture(file);
  };

  // =======================
  // Preview
  // =======================

  const previewImage = profilePicture
    ? URL.createObjectURL(profilePicture)
    : selectedAvatar;

  useEffect(() => {
    if (!user?._id) {
      resetLoginState();
      setError("");
      return;
    }

    if (!user.username || !user.profilePicture) {
      setStep(3);
    }
  }, [user, resetLoginState, setStep]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
      >
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-lg">
            <FaWhatsapp className="text-5xl text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-center text-3xl font-bold text-gray-800">
          WhatsApp
        </h1>

        <p className="mt-2 mb-6 text-center text-gray-500">Secure Login</p>

        {/* Progress Bar */}
        <div className="mb-8 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-green-500 transition-all duration-300"
            style={{ width: progressWidth }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-5">
            <h2 className="text-center text-xl font-semibold">Login</h2>

            <p className="text-center text-gray-500">
              Enter your phone number or email
            </p>

            {/* Phone Input */}
            <div className="flex gap-3">
              {/* Country Code */}
              <div className="relative w-32">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex w-full items-center justify-between rounded-xl border px-3 py-3"
                >
                  <span className="flex items-center gap-2">
                    <span>{getFlagEmoji(selectedCountry.alpha2)}</span>
                    <span>{selectedCountry.dialCode}</span>
                  </span>

                  <FaChevronDown />
                </button>

                {showDropdown && (
                  <div className="absolute z-50 mt-2 max-h-64 w-72 overflow-auto rounded-xl border bg-white shadow-xl">
                    <input
                      type="text"
                      placeholder="Search Country..."
                      className="w-full border-b p-3 outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {filteredCountries.map((country) => (
                      <button
                        key={country.alpha2}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowDropdown(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 hover:bg-green-100"
                      >
                        <span>{getFlagEmoji(country.alpha2)}</span>
                        <span>{country.dialCode}</span>
                        <span>{country.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Phone Number"
                  {...register("phoneNumber")}
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-500"
                />

                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-300"></div>
              <span className="text-gray-500">OR</span>
              <div className="h-px flex-1 bg-gray-300"></div>
            </div>

            {/* Email */}
            <div className="relative">
              <FaUser className="absolute top-4 left-4 text-gray-400" />

              <input
                type="email"
                placeholder="Email Address"
                {...register("email")}
                className="w-full rounded-xl border py-3 pr-4 pl-12 outline-none focus:border-green-500"
              />

              {errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-500 py-3 text-lg font-semibold text-white transition hover:bg-green-600 disabled:opacity-60"
            >
              {loading ? <Spinner size="small" color="light" /> : "Send OTP"}
            </button>
          </form>
        )}

        {/* ================= STEP 2 ================= */}

        {step === 2 && (
          <form onSubmit={onOtpSubmit} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>

              <p className="mt-2 text-gray-500">
                We&apos;ve sent an {isEmailOtpFlow ? "8" : "6"}-digit OTP to
              </p>

              <p className="mt-1 font-semibold text-green-600">
                {isEmailOtpFlow
                  ? userPhoneData.email
                  : `${userPhoneData?.phoneSuffix} ${userPhoneData?.phoneNumber}`}
              </p>
            </div>

            {/* OTP BOXES */}

            <div className="grid grid-cols-4 gap-2">
              {otp.slice(0, otpLength).map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="h-14 w-14 rounded-xl border-2 border-gray-300 text-center text-2xl font-bold outline-none transition focus:border-green-500"
                />
              ))}
            </div>

            {/* VERIFY BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-500 py-3 text-lg font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Spinner size="small" color="light" /> : "Verify OTP"}
            </button>

            {/* RESEND */}

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  if (isEmailOtpFlow) {
                    onLoginSubmit({
                      email: userPhoneData.email,
                    });
                  } else {
                    onLoginSubmit({
                      phoneNumber: userPhoneData.phoneNumber,
                    });
                  }
                }}
                className="text-sm font-semibold text-green-600 hover:underline"
              >
                Resend OTP
              </button>
            </div>

            {/* BACK BUTTON */}

            <button
              type="button"
              onClick={handleBack}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              <FaArrowLeft />
              Change Phone / Email
            </button>
          </form>
        )}
        {/* ================= STEP 3 ================= */}

        {step === 3 && (
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-6"
          >
            {/* Heading */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Complete Your Profile
              </h2>

              <p className="mt-2 text-gray-500">
                Choose a profile picture and username.
              </p>
            </div>

            {/* Profile Picture */}
            <div className="flex justify-center">
              <div className="relative flex flex-col items-center">
                <img
                  src={previewImage}
                  alt="Profile"
                  className="h-28 w-28 rounded-full border-4 border-green-500 object-cover"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-4 block w-full text-sm text-gray-600
            file:mr-4 file:rounded-lg file:border-0
            file:bg-green-500 file:px-4 file:py-2
            file:text-white hover:file:bg-green-600"
                />
              </div>
            </div>

            {/* Avatar Selection */}
            <div>
              <p className="mb-3 text-center text-sm font-medium text-gray-600">
                Or choose an avatar
              </p>

              <div className="grid grid-cols-4 gap-3">
                {avatars.map((avatar, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAvatarSelect(avatar)}
                    className={`rounded-full border-2 p-1 transition ${
                      selectedAvatar === avatar
                        ? "border-green-500"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={`Avatar ${index + 1}`}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <input
                type="text"
                placeholder="Username"
                {...registerProfile("username")}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-500"
              />

              {profileErrors.username && (
                <p className="mt-1 text-sm text-red-500">
                  {profileErrors.username.message}
                </p>
              )}
            </div>

            {/* Terms & Conditions */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...registerProfile("agreed")}
                  className="h-4 w-4 accent-green-500"
                />

                <span className="text-sm text-gray-600">
                  I agree to the Terms & Conditions
                </span>
              </label>

              {profileErrors.agreed && (
                <p className="mt-1 text-sm text-red-500">
                  {profileErrors.agreed.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-500 py-3 text-lg font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Spinner size="small" color="light" /> : "Continue"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default Login;
