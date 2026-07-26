import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCog, FaUserCircle, FaWhatsapp } from "react-icons/fa";
import { MdRadioButtonChecked } from "react-icons/md";
import useThemeStore from "../src/store/themeStore";
import useUserStore from "../src/store/useUserStore";
import useLayoutStore from "../src/store/LayoutStore";

const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (location.pathname === "/") setActiveTab("chats");
    else if (location.pathname === "/status") setActiveTab("status");
    else if (location.pathname === "/user-profile") setActiveTab("profile");
    else if (location.pathname === "/setting") setActiveTab("setting");
  }, [location.pathname, setActiveTab]);

  if (isMobile && selectedContact) return null;

  const linkClass = (tab) =>
    `${isMobile ? "" : "mb-8"} ${
      activeTab === tab ? "rounded-full bg-gray-300 p-2 shadow-sm" : ""
    } focus:outline-none`;

  const iconClass = (tab) =>
    `h-6 w-6 ${
      activeTab === tab
        ? theme === "dark"
          ? "text-gray-800"
          : "text-gray-900"
        : theme === "dark"
          ? "text-gray-300"
          : "text-gray-800"
    }`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${
        isMobile ? "fixed bottom-0 left-0 right-0 h-16" : "h-screen w-16 border-r-2"
      } ${
        theme === "dark"
          ? "border-gray-600 bg-gray-800"
          : "border-[#d1d7db] bg-[#f0f2f5]"
      } flex items-center py-4 shadow-lg ${
        isMobile ? "flex-row justify-around" : "flex-col"
      }`}
    >
      <Link to="/" className={linkClass("chats")}>
        <FaWhatsapp className={iconClass("chats")} />
      </Link>

      <Link to="/status" className={linkClass("status")}>
        <MdRadioButtonChecked className={iconClass("status")} />
      </Link>

      {!isMobile && <div className="flex-grow" />}

      <Link to="/user-profile" className={linkClass("profile")}>
        {user?.profilePicture ? (
          <img src={user.profilePicture} alt="user" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <FaUserCircle className={iconClass("profile")} />
        )}
      </Link>

      <Link to="/setting" className={linkClass("setting")}>
        <FaCog className={iconClass("setting")} />
      </Link>
    </motion.div>
  );
};

export default Sidebar;
