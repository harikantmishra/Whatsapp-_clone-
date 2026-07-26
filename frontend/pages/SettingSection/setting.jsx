import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaComment,
  FaMoon,
  FaQuestionCircle,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import useThemeStore from "../../src/store/themeStore.js";
import useUserStore from "../../src/store/useUserStore.js";
import { logoutUser } from "../../src/services/userServices.js";

const Setting = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const { user, clearUser } = useUserStore();
  const [loading, setLoading] = useState(false);

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logoutUser();
      clearUser();
      navigate("/user-login");
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      icon: FaUser,
      label: "Account",
      href: "/user-profile",
      detail: "Profile, photo, and about",
    },
    {
      icon: FaComment,
      label: "Chats",
      href: "/",
      detail: "Open your conversations",
    },
    {
      icon: FaQuestionCircle,
      label: "Help",
      href: "/setting",
      detail: "Support coming soon",
    },
  ];

  return (
    <div
      className={`h-full min-h-0 overflow-hidden ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-[#efeae2] text-[#111b21]"
      }`}
    >
      <div
        className={`mx-auto flex h-full w-full max-w-[430px] flex-col border-x ${
          theme === "dark"
            ? "border-[#2a3942] bg-[#111b21]"
            : "border-[#d1d7db] bg-white"
        }`}
      >
        <div
          className={`px-4 pb-4 pt-5 ${
            theme === "dark" ? "bg-[#202c33]" : "bg-[#f0f2f5]"
          }`}
        >
          <h1 className="mb-4 text-2xl font-semibold">Settings</h1>

          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search settings"
              className={`w-full rounded-lg py-2 pl-10 pr-3 outline-none ${
                theme === "dark"
                  ? "bg-[#111b21] text-white placeholder:text-gray-400"
                  : "bg-white text-[#111b21] placeholder:text-gray-500"
              }`}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={`flex items-center gap-4 px-4 py-4 ${
              theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-50"
            }`}
          >
            <img
              src={user?.profilePicture || "https://via.placeholder.com/100"}
              alt={user?.username || "Profile"}
              className="h-14 w-14 rounded-full object-cover"
            />

            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold">{user?.username || "Your profile"}</h2>
              <p className="truncate text-sm text-gray-400">
                {user?.about || "Hey there! I am using WhatsApp."}
              </p>
            </div>
          </div>

          <div>
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center gap-4 px-4 py-3 ${
                  theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-50"
                }`}
              >
                <item.icon className="text-xl" />
                <div
                  className={`flex-1 border-b py-2 ${
                    theme === "dark" ? "border-[#2a3942]" : "border-[#e9edef]"
                  }`}
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-gray-400">{item.detail}</div>
                </div>
              </Link>
            ))}

            <button
              type="button"
              onClick={handleThemeToggle}
              className={`flex w-full items-center gap-4 px-4 py-3 ${
                theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-50"
              }`}
            >
              {theme === "dark" ? <FaMoon className="text-xl" /> : <FaSun className="text-xl" />}
              <div
                className={`flex flex-1 items-center justify-between border-b py-2 ${
                  theme === "dark" ? "border-[#2a3942]" : "border-[#e9edef]"
                }`}
              >
                <div>
                  <div className="font-medium">Theme</div>
                  <div className="text-sm text-gray-400">Switch between light and dark mode</div>
                </div>
                <span className="text-sm text-gray-400 capitalize">{theme}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className={`flex w-full items-center gap-4 px-4 py-3 text-red-500 ${
                theme === "dark" ? "hover:bg-[#202c33]" : "hover:bg-gray-50"
              } disabled:opacity-70`}
            >
              <FaSignOutAlt className="text-xl" />
              <div
                className={`flex-1 border-b py-2 text-left ${
                  theme === "dark" ? "border-[#2a3942]" : "border-[#e9edef]"
                }`}
              >
                {loading ? "Logging out..." : "Log out"}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;
