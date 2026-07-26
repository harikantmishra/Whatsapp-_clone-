import React, { useRef, useState, useEffect } from "react";
import { isToday, isYesterday, format } from "date-fns";
import EmojiPicker from "emoji-picker-react";

import useThemeStore from "../store/themeStore";
import useUserStore from "../store/useUserStore";
import useChatStore from "../store/useChatStore";

import MessageBubble from "./messageBubble.jsx";
import whatsappImage from "../assets/whatsapp.png";
import {socket} = getSocket();

import {
  FaArrowLeft,
  FaVideo,
  FaEllipsisV,
  FaSmile,
  FaPaperclip,
  FaImage,
  FaPaperPlane,
  FaTimes,
  FaLock,
} from "react-icons/fa";

const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};

const ChatWindow = ({ selectedContact, setSelectedContact }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const {
    messages,
    loading,
    sendMessage,
    receiveMessage,
    fetchMessages,
    fetchConversations,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    deleteMessage,
    addReaction,
    cleanup,
  } = useChatStore();

  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  // Fetch messages whenever a contact is selected
  useEffect(() => {
    if (!selectedContact?._id) return;

    const conversation = conversations?.data?.find((conv) =>
      conv.participants.some(
        (participant) => participant._id === selectedContact._id,
      ),
    );

    if (conversation?._id) {
      fetchMessages(conversation._id);
    }
  }, [selectedContact, conversations, fetchMessages]);

  // Load conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Emit typing status
  useEffect(() => {
    if (!selectedContact?._id) return;

    if (message.trim()) {
      startTyping(selectedContact._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id);
      }, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact, startTyping, stopTyping]);

  // Cleanup socket listeners
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setSelectedFile(file);
    setShowFileMenu(false);

    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!selectedContact) return;

    if (!message.trim() && !selectedFile) return;

    try {
      const formData = new FormData();

      formData.append("senderId", user._id);
      formData.append("receiverId", selectedContact._id);

      formData.append("messageStatus", online ? "delivered" : "sent");

      if (message.trim()) {
        formData.append("content", message.trim());
      }

      if (selectedFile) {
        formData.append("media", selectedFile, selectedFile.name);
      }

      await sendMessage(formData);

      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowFileMenu(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };
  // ======================
  // Render Date Separator
  // ======================
  const renderDateSeparator = (date) => {
    if (!isValidate(date)) return null;

    let dateString;

    if (isToday(date)) {
      dateString = "Today";
    } else if (isYesterday(date)) {
      dateString = "Yesterday";
    } else {
      dateString = format(date, "EEEE, MMMM d");
    }

    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm shadow ${
            theme === "dark"
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  // ======================
  // Group Messages By Date
  // ======================
  const groupedMessages = React.useMemo(() => {
    if (!Array.isArray(messages)) return {};

    return messages.reduce((acc, message) => {
      if (!message?.createdAt) return acc;

      const date = new Date(message.createdAt);

      if (!isValidate(date)) {
        console.warn("Invalid message date:", message);
        return acc;
      }

      const key = format(date, "yyyy-MM-dd");

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(message);

      return acc;
    }, {});
  }, [messages]);

  // ======================
  // Message Reaction
  // ======================
  const handleReaction = async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error("Reaction Error:", error);
    }
  };

    const handleVideoCall = ()=>{
      if(selectedContact && online){
        const {initiateCall} = useVideoCallStore.getState();

        const avatar selectedContact?.profilePicture;

        intialCall (
          selectedContact?._id,
          selectedContact?.username,
          avatar,
          'video'
        )

      }else{
        alert('User is offline .Cannot initiate the call')
      }
    }

  if (!selectedContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-screen text-center">
        <div className="max-w-md">
          <img src={whatsappImage} alt="chat-app" className="w-full h-auto" />

          <h2
            className={`text-3xl font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-black"
            }`}
          >
            Select a conversation to start chatting
          </h2>

          <p
            className={`mb-6 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Choose a contact from the list on the left to begin messaging.
          </p>

          <p
            className={`flex items-center justify-center gap-2 text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <FaLock className="w-4 h-4" />
            Your personal messages are end-to-end encrypted
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 h-screen flex flex-col">
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 ${
          theme === "dark"
            ? "bg-[#303430] text-white"
            : "bg-[rgb(239,242,245)] text-gray-700"
        }`}
      >
        <div className="flex items-center">
          <button onClick={() => setSelectedContact(null)} className="mr-3">
            <FaArrowLeft className="w-5 h-5" />
          </button>

          <img
            src={selectedContact?.profilePicture}
            alt={selectedContact?.username}
            className="w-10 h-10 rounded-full object-cover"
          />

          <div className="ml-3">
            <h2 className="font-semibold">{selectedContact?.username}</h2>

            {isTyping ? (
              <p className="text-green-500 text-sm">Typing...</p>
            ) : (
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {online
                  ? "Online"
                  : lastSeen
                    ? `Last seen ${format(new Date(lastSeen), "HH:mm")}`
                    : "Offline"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-5">
          <button className="focus:outline-none "onclick={handleVideoCall} title = {online? "start Video call":"user is offline"}>
            <FaVideo className="w-5 h-5 text-green-500 hover:text-green-600  " />
          </button>
 
          <button>
            <FaEllipsisV className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 overflow-y-auto p-4 ${
          theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"
        }`}
      ></div>
      {Object.entries(groupedMessages).map(([date, msgs]) => (
        <React.Fragment key={date}>
          {renderDateSeparator(new Date(date))}

          {msgs.map((msg) => (
            <MessageBubble
              key={msg._id || msg.tempId}
              message={msg}
              theme={theme}
              currentUser={user}
              onReact={handleReaction}
              deleteMessage={deleteMessage}
            />
          ))}
        </React.Fragment>
      ))}

      <div ref={messageEndRef} />

      {filePreview && (
        <div className="flex justify-center py-4">
          <div className="relative inline-block">
            <img
              src={filePreview}
              alt="Preview"
              className="w-80 rounded-lg shadow-lg object-cover"
            />

            <button
              onClick={() => {
                setSelectedFile(null);
                setFilePreview(null);

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
      {/* Bottom Input */}
      <div
        className={`p-4 flex items-center gap-2 relative ${
          theme === "dark" ? "bg-[#303430]" : "bg-white"
        }`}
      >
        {/* Emoji Button */}
        <button
          onClick={() => setEmojiPicker((prev) => !prev)}
          className="text-gray-500 hover:text-green-500"
        >
          <FaSmile className="w-6 h-6" />
        </button>

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-50">
            <EmojiPicker
              theme={theme === "dark" ? "dark" : "light"}
              onEmojiClick={(emojiData) => {
                setMessage((prev) => prev + emojiData.emoji);
                setEmojiPicker(false);
              }}
            />
          </div>
        )}

        {/* Attachment */}
        <div className="relative">
          <button
            onClick={() => setShowFileMenu((prev) => !prev)}
            className="text-gray-500 hover:text-green-500"
          >
            <FaPaperclip className="w-6 h-6" />
          </button>

          {showFileMenu && (
            <div
              className={`absolute bottom-12 left-0 rounded-lg shadow-lg overflow-hidden ${
                theme === "dark" ? "bg-gray-700" : "bg-white"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center w-full px-4 py-2 ${
                  theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                }`}
              >
                <FaImage className="mr-2" />
                Image / Video
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center w-full px-4 py-2 ${
                  theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                }`}
              >
                📄
                <span className="ml-2">Document</span>
              </button>
            </div>
          )}
        </div>

        {/* Message Input */}
        <input
          type="text"
          value={message}
          placeholder="Type a message..."
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className={`flex-1 px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-green-500 ${
            theme === "dark"
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300 text-black"
          }`}
        />

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() && !selectedFile}
          className={`p-2 rounded-full transition ${
            message.trim() || selectedFile
              ? "text-green-500 hover:bg-green-100"
              : "text-gray-400 cursor-not-allowed"
          }`}
        >
          <FaPaperPlane className="w-6 h-6" />
          
        </button>
      </div>
    </div>


       <VideoCallManager socket ={socket}/>

       </>
  );
};

export default ChatWindow;
