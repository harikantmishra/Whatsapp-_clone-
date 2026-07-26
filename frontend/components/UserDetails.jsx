import React, { useEffect, useRef, useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import useThemeStore from "../src/store/themeStore";
import useUserStore from "../src/store/useUserStore";
import { axiosInstance } from "../src/services/axios.service";

const UserDetails = () => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { user, setUser } = useUserStore();

  const fileInputRef = useRef(null);

  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [profileImage, setProfileImage] = useState(
    "https://via.placeholder.com/150?text=Profile"
  );

  useEffect(() => {
    if (user) {
      setName(user.username || "");
      setAbout(user.about || "");
      setProfileImage(
        user.profilePicture ||
          "https://via.placeholder.com/150?text=Profile"
      );
    }
  }, [user]);

  const bgColor = theme === "dark" ? "#111b21" : "#efeae2";
  const panelBg = theme === "dark" ? "#111b21" : "#ffffff";
  const headerBg = theme === "dark" ? "#202c33" : "#f0f2f5";
  const cardBg = theme === "dark" ? "#202c33" : "#ffffff";
  const textColor = theme === "dark" ? "#ffffff" : "#111b21";
  const labelColor = theme === "dark" ? "#8696a0" : "#667781";
  const inputBg = theme === "dark" ? "#2a3942" : "#f0f2f5";
  const inputBorder = theme === "dark" ? "#3a4a54" : "#d1d7db";
  const hoverBg = theme === "dark" ? "#2a3942" : "#f0f2f5";

  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image should be less than 5MB.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setProfileImage(preview);

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await axiosInstance.put(
        "/auth/update-profile",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.data) {
        setUser(response.data.data);
        setProfileImage(response.data.data.profilePicture);
        toast.success("Profile picture updated.");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Upload failed."
      );

      setProfileImage(
        user?.profilePicture ||
          "https://via.placeholder.com/150?text=Profile"
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      URL.revokeObjectURL(preview);
    }
  };
    const handleSaveName = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }

    if (trimmedName === (user?.username || "")) {
      setEditingName(false);
      return;
    }

    try {
      const response = await axiosInstance.put("/auth/update-profile", {
        username: trimmedName,
      });

      if (response.data.data) {
        setUser(response.data.data);
        setName(response.data.data.username);
        toast.success("Name updated successfully!");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Unable to update name."
      );

      setName(user?.username || "");
    } finally {
      setEditingName(false);
    }
  };

  const handleSaveAbout = async () => {
    const trimmedAbout = about.trim();

    if (trimmedAbout === (user?.about || "")) {
      setEditingAbout(false);
      return;
    }

    try {
      const response = await axiosInstance.put("/auth/update-profile", {
        about: trimmedAbout,
      });

      if (response.data.data) {
        setUser(response.data.data);
        setAbout(response.data.data.about || "");
        toast.success("About updated successfully!");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Unable to update about."
      );

      setAbout(user?.about || "");
    } finally {
      setEditingAbout(false);
    }
  };

  return (
  
    <div style={{ backgroundColor: bgColor }} className="h-full min-h-0 overflow-hidden">
      <div
        className="mx-auto flex h-full w-full max-w-[430px] flex-col border-x"
        style={{
          backgroundColor: panelBg,
          borderColor: theme === "dark" ? "#2a3942" : "#d1d7db",
        }}
      >
        <div
          className="flex items-center gap-4 px-4 py-4"
          style={{ backgroundColor: headerBg, color: textColor }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-xl font-semibold">Profile</h1>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex justify-center px-6 py-10">
            <div className="relative">

          <img
            src={profileImage}
            alt="Profile"
            className="h-48 w-48 rounded-full object-cover border-4"
            style={{
              borderColor:
                theme === "dark" ? "#3b4a54" : "#d9d9d9",
            }}
          />

          {uploading && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          <button
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3 right-2 flex h-12 w-12 items-center justify-center rounded-full transition hover:scale-105"
            style={{
              backgroundColor: "#25D366",
              border: `4px solid ${panelBg}`,
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FaPlus className="text-white" size={18} />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProfileImageChange}
          />
            </div>
          </div>

          <div className="px-4 pb-6">
            <div
              style={{ backgroundColor: cardBg }}
              className="mb-4 rounded-lg shadow-sm"
            >
              <div className="px-5 pt-4">
        <label
          style={{ color: labelColor }}
          className="block text-sm font-semibold mb-3"
        >
          Your Name
        </label>

        <div className="flex items-center justify-between gap-4 pb-4">

          {editingName ? (
            <input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveName();
                }
              }}
              style={{
                backgroundColor: inputBg,
                color: textColor,
                borderColor: inputBorder,
              }}
              className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          ) : (
            <p
              style={{ color: textColor }}
              className="text-lg font-medium"
            >
              {name}
            </p>
          )}

          <button
            onClick={() => {
              if (editingName) {
                handleSaveName();
              } else {
                setEditingName(true);
              }
            }}
            className="p-2 rounded-full transition"
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = hoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <FiEdit2
              className="text-xl"
              style={{ color: labelColor }}
            />
          </button>

        </div>
              </div>
            </div>

            <p style={{ color: labelColor }} className="mb-4 px-1 text-sm leading-6">
              This is not your username or pin. This name will be visible to your WhatsApp contacts.
            </p>

            <div
              style={{ backgroundColor: cardBg }}
              className="rounded-lg shadow-sm"
            >
              <div className="px-5 pt-4">
        <label
          style={{ color: labelColor }}
          className="block text-sm font-semibold mb-3"
        >
          About
        </label>

        <div className="flex items-center justify-between gap-4 pb-4">
          {editingAbout ? (
            <input
              type="text"
              value={about}
              autoFocus
              onChange={(e) => setAbout(e.target.value)}
              onBlur={handleSaveAbout}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveAbout();
                }
              }}
              style={{
                backgroundColor: inputBg,
                color: textColor,
                borderColor: inputBorder,
              }}
              className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          ) : (
            <p
              style={{ color: textColor }}
              className="text-base"
            >
              {about || "Hey there! I am using WhatsApp."}
            </p>
          )}

          <button
            onClick={() => {
              if (editingAbout) {
                handleSaveAbout();
              } else {
                setEditingAbout(true);
              }
            }}
            className="p-2 rounded-full transition-colors"
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = hoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <FiEdit2
              className="text-xl"
              style={{ color: labelColor }}
            />
          </button>
        </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
