import { useMemo, useState } from "react";
/*
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FaArrowLeft, FaChevronDown, FaUser, FaWhatsapp } from "react-icons/fa";
import countries from "../utils/countries";
import useLoginStore from "../store/useLoginStore";

const loginValidationSchema = yup
  .object({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number must contain only digits")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value,
      ),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email")
      .transform((value, originalValue) =>
        originalValue.trim() === "" ? null : value,
      ),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    (value) => Boolean(value?.phoneNumber || value?.email),
  );

function getFlagEmoji(alpha2) {
  return alpha2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function Login() {
const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { theme, setTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);


  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
    defaultValues: {
      phoneNumber: "",
      email: "",
    },
  });


 
  const filteredCountries = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(searchTerm),
    );
  }, [searchTerm]);


   const onLoginSubmit = async()=>{
      try {
        setLoading(true);
        if(email){
          const response =  await sendOtp(null,null,email);
          if(response.status==='success'){
            toast.info('Otp is sent to your email')
            setUserPhoneData({email})
            setStep(2)
          }
          else {
            const response =  await sendOtp(null,null,email);
          if(response.status==='success'){
            toast.info('Otp is sent to your phone number')
            setUserPhoneData({phoneNumber,phoneSuffix:selectedCountry.dialCode})
            setStep(2)

          }

        }
      } catch (error) {
        console.log(error);
        setError(error.message || 'Failed to send OTP')
        
      }
      finally{
        setLoading(false);

      }
  }


  const onOtpSubmit = async () => {
  try {
    setLoading(true);

    if (!userPhoneData) {
      throw new Error("Phone or email data is missing");
    }

    const otpString = otp.join("");
    let response;

    if (userPhoneData?.email) {
      response = await verifyOtp(null,null,otpString,userPhoneData.email);
    } else {
      response = await verifyOtp( userPhoneData.phoneNumber,userPhoneData.phoneSuffix,otpString );
    }

    if (response.status === "success") {
      toast.success("OTP verified successfully");

      const user = response.data?.user;

      if (user?.username && user?.profilePicture) {
        setUser(user);
        toast.success("Welcome back to WhatsApp");
        navigate("/");
        resetLoginState();
      } else {
        setStep(3);
      }
    }
  } catch (error) {
    console.error(error);
    setError(error.message || "Failed to verify OTP");
  } finally {
    setLoading(false);
  }
};

  const onProfileSubmit = async(data)=>{
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username",username);
      formData.append("agreed",data.agreed);
       if(profilePicture){
        formData.append("media",selectedAvatar);
       }
       else{
             formData.append("profilePicture",selectedAvatar);
       }
       await updateUserProfile(formData);
       toast.success("Welcome back to whatsapp");
       navigate('/')
       resetLoginState();
       
    } catch (error) {
      console.error(error);
    setError(error.message || "Failed to verify OTP");
  } finally {
    setLoading(false);
  }
};

const handleOtpChange = (index,value)=>{
  const newOtp = [...otp];
  newOtp[index] = value;
  setOtp(newOtp);
  setOtpValue('otp',newOtp.join(''));
  if(value && index<5){
    document.getElementById(`otp-${index+1}`).focus();
  }

}

const handleBack  =  ()=>{
  setStep(1);
  setUserPhoneData(null)
  setOtp = (["","","","","",""])
  setError= ""
}
  

      
    
  

  
  const onSubmit = (data) => {
    setUserPhoneData({
      ...data,
      country: selectedCountry,
    });
  };

  const progressWidth = `${Math.min((step / 3) * 100, 100)}%`;



  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500  px-4 py-6 ">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[460px] rounded-xl bg-white px-9 py-10 shadow-[0_30px_70px_rgba(15,23,42,0.28)]"
      >
        <div className="mb-6 flex justify-center">
          <div className="flex h-[116px] w-[116px] items-center justify-center rounded-full bg-[#22c55e] text-white shadow-sm">
            <FaWhatsapp className="text-[48px]" />
          </div>
        </div>

        <h1 className="mb-5 text-center text-[30px] font-bold tracking-[-0.03em] text-slate-800">
          WhatsApp Login
        </h1>

        <div className="mb-6 h-3 w-full rounded-full bg-slate-200">
          <div
            className="h-3 rounded-full bg-[#22c55e] transition-all duration-300"
            style={{ width: progressWidth }}
          />
        </div>

        <p className="mb-6 text-center text-[16px] text-slate-600">
          Enter your phone number to receive an OTP
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-[105px] shrink-0">
              <button
                type="button"
                onClick={() => setShowDropdown((open) => !open)}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-4 text-[18px] text-slate-800 shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <span>{getFlagEmoji(selectedCountry.alpha2)}</span>
                  <span>{selectedCountry.dialCode}</span>
                </span>
                <FaChevronDown className="text-sm text-slate-700" />
              </button>

              {showDropdown && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-20 max-h-64 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 p-3">
                    <input
                      type="text"
                      placeholder="Search country"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#22c55e]"
                    />
                  </div>
                  <div className="max-h-48 overflow-auto py-1">
                    {filteredCountries.map((country) => (
                      <button
                        key={`${country.alpha2}-${country.dialCode}`}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowDropdown(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                      >
                        <span>{getFlagEmoji(country.alpha2)}</span>
                        <span>{country.dialCode}</span>
                        <span className="truncate">{country.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Phone Number"
                {...register("phoneNumber")}
                className="h-14 w-full rounded-xl border-2 border-[#4ade80] px-5 text-base text-slate-700 outline-none transition focus:border-[#22c55e]"
              />
              {errors.phoneNumber && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 py-1">
            <div className="h-px flex-1 bg-slate-300" />
            <span className="text-[15px] font-semibold text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-300" />
          </div>

          <div>
            <div className="flex h-14 items-center rounded-xl border border-slate-300 bg-white px-4">
              <FaUser className="mr-3 text-slate-400" />
              <input
                type="email"
                placeholder="Email (optional)"
                {...register("email")}
                className="w-full text-[18px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>
            )}
            {errors.root && (
              <p className="mt-2 text-sm text-red-500">{errors.root.message}</p>
            )}
          </div>

          <button
  type="submit" 
  disabled={loading}
  className="h-14 w-full rounded-lg bg-[#22c55e] text-[18px] font-semibold text-white transition hover:bg-[#1fb153] disabled:opacity-70 disabled:cursor-not-allowed"
>
  {loading ? <Spinner size="small" color="light" /> : "Send OTP"}
</button>
        </form>

        {step === 2 && (
  <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
    <p
      className={`text-center ${
        theme === "dark" ? "text-gray-300" : "text-gray-600"
      } mb-4`}
    >
      Please enter the 6-digit OTP send to your{" "}
      {userPhoneData ? userPhoneData.phoneSuffix : "Email"}{" "}
      {" "}
      {userPhoneData.phoneNumber && userPhoneData?.phoneNumber}
    </p>

    <div className="flex justify-between">
      {otp.map((digit, index) => (
        <input
          key={index}
          id={`otp-${index}`}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleOtpChange(index, e.target.value)}
          className={`w-12 h-12 text-center border ${
            theme === "dark"
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300 text-black"
          } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
            otpErrors.otp ? "border-red-500" : ""}
          
          `} 
        />
      ))}
      {otpErrors.otp && (
        <p className="text-red-500 text-sm">{otpErrors.otp.message}</p>
      )}
       <button
  type="submit" 
  disabled={loading}
  className="h-14 w-full rounded-lg bg-[#22c55e] text-[18px] font-semibold text-white transition hover:bg-[#1fb153] disabled:opacity-70 disabled:cursor-not-allowed"
>
  {loading ? <Spinner size="small" color="light" /> : "Verify OTP"}
</button>

<button>
  type="button"
  onClick = {handleBack}
  className = {`w-full mt-2 ${theme ==='dark'? "bg-gray-700 text-gray-300" : bg-gray-200 text-gray-700 } py-2 rounded-md hover:bg-gray-300 transition flex items-center justify-center`} 
  <FaArrowLeft className="mr-2"/>
  Wrong number? Go back


</button>
    </div>
  </form>
)}

     
     




      </motion.div>
    </div>
  );
}

export default Login; \

*/

