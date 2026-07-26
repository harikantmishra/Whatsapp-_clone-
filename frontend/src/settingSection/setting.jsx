import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaComment,
  FaQuestionCircle,
  FaSearch,
  FaUser,
  FaMoon,
  FaSun,
  FaSignInAlt,
  FiEdit2,
} from "react-icons/fa";
import { toast } from "react-toastify";

import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { logoutUser } from "../../services/user.service";
import { axiosInstance } from "../../services/axios.service";

const Setting = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, setUser, clearUser } = useUserStore();
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      const response = await axiosInstance.put('/auth/update-profile', {
        username: name,
      });
      if (response.data.data) {
        setUser(response.data.data);
        toast.success('Name updated successfully!');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error(error.response?.data?.message || 'Error updating name');
    }
    setEditingName(false);
  };

  const handleSaveAbout = async () => {
    try {
      const response = await axiosInstance.put('/auth/update-profile', {
        about: about,
      });
      if (response.data.data) {
        setUser(response.data.data);
        toast.success('About updated successfully!');
      }
    } catch (error) {
      console.error('Error updating about:', error);
      toast.error(error.response?.data?.message || 'Error updating about');
    }
    setEditingAbout(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearUser();
      toast.success("User logged out successfully");
    } catch (error) {
      console.error("Failed to logout", error);
      toast.error("Logout failed");
    }
  };

  const menuItems = [
    {
      icon: FaUser,
      label: "Account",
      href: "/user-profile",
    },
    {
      icon: FaComment,
      label: "Chats",
      href: "/",
    },
    {
      icon: FaQuestionCircle,
      label: "Help",
      href: "/help",
    },
  ];

  return (
    <div
      className={`flex h-screen ${
        theme === "dark"
          ? "bg-[#111b21] text-white"
          : "bg-white text-black"
      }`}
    >
      {/* Left Panel */}
      <div
        className={`w-[400px] border-r ${
          theme === "dark"
            ? "border-gray-700"
            : "border-gray-200"
        }`}
      >
          {/* Header */}
          <div className="p-4">
            <h1 className="text-2xl font-semibold mb-4">Settings</h1>

            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />

              <input
                type="text"
                placeholder="Search settings"
                className={`w-full pl-10 p-2 rounded-lg outline-none ${
                  theme === "dark"
                    ? "bg-[#202c33] text-white placeholder-gray-400"
                    : "bg-gray-100 text-black placeholder-gray-500"
                }`}
              />
            </div>
          </div>

          {/* User */}
          <div
            className={`p-4 cursor-pointer ${
              theme === "dark"
                ? "hover:bg-[#202c33]"
                : "hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <img
                src={
                  user?.profilePicture ||
                  "https://via.placeholder.com/100"
                }
                alt="Profile"
                className="w-14 h-14 rounded-full object-cover"
              />

              <div className="flex-1">
                {editingName ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                    className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      theme === 'dark'
                        ? 'bg-[#202c33] text-white border-gray-600'
                        : 'bg-gray-100 text-black border-gray-300'
                    }`}
                  />
                ) : (
                  <h2 
                    onClick={() => setEditingName(true)}
                    className="font-semibold cursor-pointer hover:opacity-70"
                  >
                    {name}
                  </h2>
                )}
                {editingAbout ? (
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    onBlur={handleSaveAbout}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveAbout()}
                    autoFocus
                    className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${
                      theme === 'dark'
                        ? 'bg-[#202c33] text-gray-300 border-gray-600'
                        : 'bg-gray-100 text-gray-600 border-gray-300'
                    }`}
                  />
                ) : (
                  <p 
                    onClick={() => setEditingAbout(true)}
                    className="text-sm text-gray-400 cursor-pointer hover:opacity-70"
                  >
                    {about || "Hey there! I am using WhatsApp."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="overflow-y-auto h-[calc(100vh-190px)]">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center gap-4 px-4 py-3 ${
                  theme === "dark"
                    ? "hover:bg-[#202c33]"
                    : "hover:bg-gray-100"
                }`}
              >
                <item.icon className="text-xl" />

                <div
                  className={`flex-1 border-b py-2 ${
                    theme === "dark"
                      ? "border-gray-700"
                      : "border-gray-200"
                  }`}
                >
                  {item.label}
                </div>
              </Link>
            ))}

            {/* Theme */}
            <button
              onClick={handleThemeToggle}
              className={`w-full flex items-center gap-4 px-4 py-3 ${
                theme === "dark"
                  ? "hover:bg-[#202c33]"
                  : "hover:bg-gray-100"
              }`}
            >
              {theme === "dark" ? (
                <FaMoon className="text-xl" />
              ) : (
                <FaSun className="text-xl" />
              )}

              <div
                className={`flex justify-between items-center flex-1 border-b py-2 ${
                  theme === "dark"
                    ? "border-gray-700"
                    : "border-gray-200"
                }`}
              >
                <span>Theme</span>

                <span className="text-sm text-gray-400">
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </span>
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-4 px-4 py-3 text-red-500 ${
                theme === "dark"
                  ? "hover:bg-[#202c33]"
                  : "hover:bg-gray-100"
              }`}
            >
              <FaSignInAlt className="text-xl" />

              <div
                className={`flex-1 border-b py-2 ${
                  theme === "dark"
                    ? "border-gray-700"
                    : "border-gray-200"
                }`}
              >
                Log out
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;