import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInHours, format } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import {
  FaArrowLeft,
  FaFile,
  FaFileAlt,
  FaImage,
  FaPaperPlane,
  FaPaperclip,
  FaSmile,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import useThemeStore from "../../src/store/themeStore";
import useUserStore from "../../src/store/useUserStore";
import { useChatStore } from "../../src/store/chatStore";
import useVideoCallStore from "../../src/store/videoCallStore";
import { getSocket } from "../../src/services/chat.service";
import whatsappImage from "../../src/utils/images/whatsapp_image.png";
import MessageBubble from "../../src/chatSection/messageBubble.jsx";
import useOutsideClick from "../../src/hooks/useOutsideClick";
import VideoCallManager from "../VideoCall/VideoCallManager";

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startTyping,
    stopTyping,
    markConversationAsRead,
    addReaction,
    deleteMessage,
    isUserTyping,
    isUserOnline,
    getUserLastSeen,
  } = useChatStore();
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showComposerEmojiPicker, setShowComposerEmojiPicker] = useState(false);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const composerEmojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastFetchedConversationRef = useRef(null);
  const previousScrollStateRef = useRef({
    conversationId: null,
    messageCount: 0,
    lastMessageId: null,
  });

  useOutsideClick(composerEmojiPickerRef, () => setShowComposerEmojiPicker(false));

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const activeConversation = useMemo(() => {
    if (!selectedContact || !conversations?.data?.length) return null;

    return (
      conversations.data.find((conversation) =>
        conversation.participants?.some(
          (participant) => participant._id === selectedContact._id,
        ),
      ) || null
    );
  }, [selectedContact, conversations]);

  const selectedFilePreviewUrl = useMemo(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (selectedFilePreviewUrl) {
        URL.revokeObjectURL(selectedFilePreviewUrl);
      }
    };
  }, [selectedFilePreviewUrl]);

  useEffect(() => {
    const nextConversationId = activeConversation?._id || null;

    if (!nextConversationId) {
      lastFetchedConversationRef.current = null;
      return;
    }

    if (lastFetchedConversationRef.current !== nextConversationId) {
      lastFetchedConversationRef.current = nextConversationId;
      fetchMessages(nextConversationId);
    }
  }, [activeConversation, fetchMessages]);

  useEffect(() => {
    const currentConversationId = activeConversation?._id || null;
    const currentMessageCount = messages.length;
    const currentLastMessageId =
      currentMessageCount > 0 ? messages[currentMessageCount - 1]?._id || null : null;
    const previousState = previousScrollStateRef.current;

    const conversationChanged = previousState.conversationId !== currentConversationId;
    const appendedNewMessage =
      currentMessageCount > previousState.messageCount &&
      currentLastMessageId !== previousState.lastMessageId;

    if (conversationChanged || appendedNewMessage) {
      endRef.current?.scrollIntoView({
        behavior: conversationChanged ? "auto" : "smooth",
      });
    }

    previousScrollStateRef.current = {
      conversationId: currentConversationId,
      messageCount: currentMessageCount,
      lastMessageId: currentLastMessageId,
    };
  }, [activeConversation, messages]);

  useEffect(() => {
    if (currentConversation) {
      markConversationAsRead();
    }
  }, [currentConversation, messages, markConversationAsRead]);

  useEffect(() => {
    if (!selectedContact?._id || !currentConversation) return;

    if (draft.trim()) {
      startTyping(selectedContact._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id);
      }, 1200);
    } else {
      stopTyping(selectedContact._id);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [draft, selectedContact, currentConversation, startTyping, stopTyping]);

  const handleSelectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setShowAttachmentMenu(false);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (fileSize) => {
    if (!fileSize) return "";
    if (fileSize < 1024 * 1024) {
      return `${(fileSize / 1024).toFixed(1)} KB`;
    }
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentMeta = () => {
    if (!selectedFile) {
      return {
        icon: <FaFile className="text-lg" />,
        label: "",
        accent: theme === "dark" ? "from-slate-600 to-slate-700" : "from-slate-200 to-slate-100",
      };
    }

    if (selectedFile.type.startsWith("image/")) {
      return {
        icon: <FaImage className="text-lg" />,
        label: "Image ready to send",
        accent: theme === "dark" ? "from-emerald-500/30 to-cyan-500/10" : "from-emerald-100 to-cyan-50",
      };
    }

    if (selectedFile.type.startsWith("video/")) {
      return {
        icon: <FaVideo className="text-lg" />,
        label: "Video ready to send",
        accent: theme === "dark" ? "from-orange-500/30 to-amber-500/10" : "from-orange-100 to-amber-50",
      };
    }

    return {
      icon: <FaFileAlt className="text-lg" />,
      label: "Document ready to send",
      accent: theme === "dark" ? "from-violet-500/30 to-fuchsia-500/10" : "from-violet-100 to-fuchsia-50",
    };
  };

  const attachmentMeta = getAttachmentMeta();
  const socket = getSocket();

  const handleReaction = (messageId, emoji) => {
    addReaction(messageId, emoji);
  };

  const handleDeleteMessage = async (messageId) => {
    await deleteMessage(messageId);
  };

  const handleVideoCall = () => {
    if (!selectedContact?._id) return;

    const { initiateCall } = useVideoCallStore.getState();
    if (typeof initiateCall !== "function") return;

    initiateCall(
      selectedContact._id,
      selectedContact.username,
      selectedContact.profilePicture,
      "video",
    );
  };

  const handleSendMessage = async () => {
    if (!selectedContact?._id || !user?._id) return;
    if (!draft.trim() && !selectedFile) return;

    const formData = new FormData();
    formData.append("senderId", user._id);
    formData.append("receiverId", selectedContact._id);
    formData.append("messageStatus", isUserOnline(selectedContact._id) ? "delivered" : "sent");

    if (draft.trim()) {
      formData.append("content", draft.trim());
    }

    if (selectedFile) {
      formData.append("media", selectedFile, selectedFile.name);
    }

    const result = await sendMessage(formData);

    if (result) {
      setDraft("");
      clearSelectedFile();
      setShowAttachmentMenu(false);
      setShowComposerEmojiPicker(false);

      if (activeConversation?._id && activeConversation._id !== currentConversation) {
        fetchMessages(activeConversation._id);
      }
    }
  };

  const typingVisible = isUserTyping(selectedContact?._id);
  const onlineVisible = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const formattedLastSeen = lastSeen
    ? (() => {
        const lastSeenDate = new Date(lastSeen);
        const includeDate = differenceInHours(new Date(), lastSeenDate) >= 24;

        return includeDate
          ? format(lastSeenDate, "dd MMM yyyy, HH:mm")
          : format(lastSeenDate, "HH:mm");
      })()
    : null;

  if (!selectedContact) {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center gap-6 px-6 text-center ${
          theme === "dark" ? "bg-[#0b141a] text-gray-300" : "bg-white text-gray-500"
        }`}
      >
        <img
          src={whatsappImage}
          alt="WhatsApp preview"
          className="max-h-[320px] w-full max-w-md object-contain"
        />
        <p className="text-lg font-medium">Select a chat to start messaging.</p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${
        theme === "dark" ? "bg-[#0b141a] text-white" : "bg-[#efeae2] text-[#111b21]"
      }`}
    >
      <div className={`flex items-center justify-between gap-3 border-b px-3 py-3 sm:px-4 ${theme === "dark" ? "border-gray-700 bg-[#202c33]" : "border-[#d1d7db] bg-[#f0f2f5]"}`}>
        <div className="flex min-w-0 items-center gap-3">
        {isMobile && (
          <button type="button" onClick={() => setSelectedContact(null)} className="rounded-full p-2 text-lg">
            <FaArrowLeft />
          </button>
        )}
        <img
          src={selectedContact.profilePicture}
          alt={selectedContact.username}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="min-w-0">
          <div className="truncate font-semibold">{selectedContact.username || "User"}</div>
          <div className={`truncate text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            {typingVisible
              ? "Typing..."
              : onlineVisible
                ? "Online"
                : formattedLastSeen
                  ? `Last seen ${formattedLastSeen}`
                  : selectedContact.about || "Offline"}
          </div>
        </div>
        </div>
        <button
          type="button"
          onClick={handleVideoCall}
          disabled={!onlineVisible || !socket}
          title={onlineVisible ? "Start video call" : "User is offline"}
          className={`rounded-full p-3 transition ${
            theme === "dark"
              ? "bg-[#2a3942] text-gray-200 hover:bg-[#354854]"
              : "bg-transparent text-[#54656f] hover:bg-[#e9edef]"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FaVideo />
        </button>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 ${theme === "dark" ? "bg-[#0b141a]" : "bg-[#efeae2]"}`}>
        {loading && messages.length === 0 ? (
          <div className={`text-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className={`mt-10 text-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            No messages yet. Say hello.
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              currentUserId={user?._id}
              theme={theme}
              onReact={handleReaction}
              onDelete={handleDeleteMessage}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      {selectedFile && (
        <div
          className={`mx-3 mb-3 overflow-hidden rounded-3xl border shadow-lg sm:mx-4 ${
            theme === "dark"
              ? "border-white/10 bg-[#16232b]"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className={`bg-gradient-to-r ${attachmentMeta.accent} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    theme === "dark" ? "bg-white/10 text-white" : "bg-white text-gray-700"
                  }`}
                >
                  {attachmentMeta.icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{selectedFile.name}</p>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                    {attachmentMeta.label}
                    {selectedFile.size ? ` • ${formatFileSize(selectedFile.size)}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedFile}
                className={`rounded-full p-2 transition ${
                  theme === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <FaTimes />
              </button>
            </div>

            {selectedFilePreviewUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl">
                <img
                  src={selectedFilePreviewUrl}
                  alt={selectedFile.name}
                  className="max-h-56 w-full object-cover"
                />
              </div>
            )}

            {selectedFile?.type.startsWith("video/") && (
              <div
                className={`mt-4 rounded-2xl border border-dashed px-4 py-6 text-center ${
                  theme === "dark"
                    ? "border-white/15 bg-black/10 text-gray-300"
                    : "border-gray-300 bg-white/70 text-gray-600"
                }`}
              >
                <FaVideo className="mx-auto mb-3 text-2xl" />
                <p className="text-sm font-medium">Video attached</p>
                <p className="mt-1 text-xs">It will be sent as a playable video message.</p>
              </div>
            )}

            {!selectedFile?.type.startsWith("image/") && !selectedFile?.type.startsWith("video/") && (
              <div
                className={`mt-4 rounded-2xl border border-dashed px-4 py-6 text-center ${
                  theme === "dark"
                    ? "border-white/15 bg-black/10 text-gray-300"
                    : "border-gray-300 bg-white/70 text-gray-600"
                }`}
              >
                <FaFileAlt className="mx-auto mb-3 text-2xl" />
                <p className="text-sm font-medium">Document attached</p>
                <p className="mt-1 text-xs">Perfect for PDFs, docs, text files, and presentations.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`relative flex items-end gap-2 border-t px-3 py-3 sm:gap-3 sm:px-4 ${theme === "dark" ? "border-gray-700 bg-[#202c33]" : "border-[#d1d7db] bg-[#f0f2f5]"}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.ppt,.pptx"
          onChange={handleSelectFile}
          className="hidden"
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowComposerEmojiPicker((value) => !value)}
            className={`rounded-full p-3 transition ${
              theme === "dark"
                ? "bg-[#2a3942] text-gray-200 hover:bg-[#354854]"
                : "bg-transparent text-[#54656f] hover:bg-[#e9edef]"
            }`}
          >
            <FaSmile />
          </button>

          {showComposerEmojiPicker && (
            <div
              ref={composerEmojiPickerRef}
              className="absolute bottom-16 left-0 z-50 max-w-[calc(100vw-2rem)]"
            >
              <EmojiPicker
                theme={theme === "dark" ? "dark" : "light"}
                lazyLoadEmojis={true}
                width="min(350px, calc(100vw - 2rem))"
                onEmojiClick={(emojiData) => {
                  setDraft((prev) => prev + emojiData.emoji);
                  setShowComposerEmojiPicker(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttachmentMenu((value) => !value)}
            className={`rounded-full p-3 transition ${
              theme === "dark"
                ? "bg-[#2a3942] text-gray-200 hover:bg-[#354854]"
                : "bg-transparent text-[#54656f] hover:bg-[#e9edef]"
            }`}
          >
            <FaPaperclip />
          </button>

          {showAttachmentMenu && (
            <div
              className={`absolute bottom-16 left-0 z-40 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border shadow-2xl ${
                theme === "dark"
                  ? "border-gray-700 bg-[#16232b]"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className={`px-4 py-3 ${theme === "dark" ? "bg-[#1d2f38]" : "bg-[#f6faf7]"}`}>
                <p className="text-sm font-semibold">Share something</p>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Images, videos, PDFs, docs, and more
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className={`flex w-full items-start gap-3 px-4 py-4 text-left transition ${
                  theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    theme === "dark"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  <FaImage />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Photo, video, or document</span>
                  <span className={`block text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Pick one file and preview it before sending
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          value={draft}
          placeholder="Type a message"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSendMessage();
            }
          }}
          className={`min-w-0 flex-1 rounded-full px-4 py-3 outline-none ${
            theme === "dark" ? "bg-[#2a3942] text-white" : "border border-[#d1d7db] bg-white text-[#111b21]"
          }`}
        />
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={!draft.trim() && !selectedFile}
          className="rounded-full bg-green-500 p-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaPaperPlane />
        </button>
      </div>
      <VideoCallManager socket={socket} />
    </div>
  );
};

export default ChatWindow;
