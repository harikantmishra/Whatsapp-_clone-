import React, { useRef, useState } from "react";
import { format } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import {
  FaCheck,
  FaCheckDouble,
  FaSmile,
  FaRegCopy,
  FaTrash,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import useOutsideClick from "../hooks/useOutsideClick";

const MessageBubble = ({
  message,
  theme,
  currentUser,
  currentUserId,
  onReact,
  deleteMessage,
  onDelete,
}) => {
  if (!message) return null;

  const resolvedCurrentUserId = currentUser?._id || currentUserId;
  const messageSenderId =
    message.sender?._id ||
    message.senderId ||
    (typeof message.sender === "string" ? message.sender : null);
  const isUserMessage = messageSenderId === resolvedCurrentUserId;
  const quickReactions = ["👍", "❤️", "😂", "😮", "🙏"];
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const quickReactionsRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const optionRef = useRef(null);

  const bubbleTone = isUserMessage
    ? theme === "dark"
      ? "bg-[#144d38] text-white"
      : "bg-[#d9fdd3] text-[#111b21]"
    : theme === "dark"
      ? "bg-[#202c33] text-white"
      : "bg-white text-[#111b21]";

  const menuTone =
    theme === "dark"
      ? "border-gray-700 bg-[#202c33] text-white"
      : "border-gray-200 bg-white text-black";

  const handleReact = (emoji) => {
    onReact(message._id, emoji);
    setShowQuickReactions(false);
    setShowEmojiPicker(false);
  };

  const normalizedMessageStatus =
    message.messageStatus === "send" ? "sent" : message.messageStatus;

  useOutsideClick(quickReactionsRef, () => setShowQuickReactions(false));
  useOutsideClick(emojiPickerRef, () => setShowEmojiPicker(false));
  useOutsideClick(optionRef, () => setShowOptions(false));

  return (
    <div className={`mb-2 flex w-full ${isUserMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative flex max-w-[72%] min-w-0 flex-col ${
          isUserMessage ? "items-end" : "items-start"
        }`}
      >
        <div
          onClick={() => {
            setShowQuickReactions((value) => !value);
            setShowOptions(false);
            setShowEmojiPicker(false);
          }}
          className={`relative w-fit max-w-full cursor-pointer rounded-2xl px-4 py-3 shadow-sm ${bubbleTone}`}
        >
          {message.contentType === "text" ? (
            <p className="break-words">{message.content}</p>
          ) : (
            <div className="space-y-2">
              <img
                src={message.imageOrVideoUrl}
                alt="message"
                className="max-h-80 w-full rounded-lg object-cover"
              />
              {message.content && <p className="break-words">{message.content}</p>}
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-1 text-[11px] opacity-70">
            <span>{format(new Date(message.createdAt), "HH:mm")}</span>
            {isUserMessage && (
              <>
                {normalizedMessageStatus === "sent" && <FaCheck size={12} />}
                {normalizedMessageStatus === "delivered" && <FaCheckDouble size={12} />}
                {normalizedMessageStatus === "read" && (
                  <FaCheckDouble size={12} className="text-blue-500" />
                )}
              </>
            )}
          </div>

        </div>

        {showQuickReactions && (
          <div
            ref={quickReactionsRef}
            className={`absolute z-20 flex items-center gap-1 rounded-full px-2 py-1 shadow-lg ${
              isUserMessage ? "right-2 -top-5" : "left-2 -top-5"
            } ${theme === "dark" ? "bg-[#202c33] text-white" : "bg-white text-[#111b21]"}`}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleReact(emoji);
                }}
                className="rounded-full px-1 text-base transition hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div
          className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 ${
            isUserMessage ? "-left-24" : "-right-24"
          }`}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowQuickReactions(false);
              setShowEmojiPicker((value) => !value);
            }}
            className={`rounded-full p-2 shadow-lg transition ${
              theme === "dark"
                ? "bg-[#202c33] text-gray-300 hover:bg-[#2a3942]"
                : "bg-white text-[#54656f] hover:bg-[#f0f2f5]"
            }`}
          >
            <FaSmile />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowQuickReactions(false);
              setShowOptions((value) => !value);
            }}
            className={`rounded-full p-2 shadow-lg transition ${
              theme === "dark"
                ? "bg-[#202c33] text-gray-300 hover:bg-[#2a3942]"
                : "bg-white text-[#54656f] hover:bg-[#f0f2f5]"
            }`}
          >
            <HiDotsVertical size={16} />
          </button>
        </div>

        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className={`absolute bottom-16 z-50 max-w-[calc(100vw-2rem)] ${
              isUserMessage ? "right-0" : "left-0"
            }`}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className={`absolute right-2 top-2 z-50 rounded-full p-1 ${
                  theme === "dark"
                    ? "bg-[#2a3942] text-white hover:bg-[#3b4a54]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <RxCross2 size={16} />
              </button>
              <EmojiPicker
                theme={theme === "dark" ? "dark" : "light"}
                lazyLoadEmojis={true}
                width="min(350px, calc(100vw - 2rem))"
                onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}
              />
            </div>
          </div>
        )}

        {showOptions && (
          <div
            ref={optionRef}
            className={`absolute top-10 z-50 w-44 overflow-hidden rounded-xl border shadow-xl ${
              isUserMessage ? "right-0" : "left-0"
            } ${menuTone}`}
          >
            {message.contentType === "text" && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                  setShowOptions(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  theme === "dark" ? "hover:bg-[#2a3942]" : "hover:bg-gray-100"
                }`}
              >
                <FaRegCopy size={15} />
                <span>Copy</span>
              </button>
            )}

            {isUserMessage && (
              <button
                type="button"
                onClick={() => {
                  (onDelete || deleteMessage)?.(message._id);
                  setShowOptions(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <FaTrash size={15} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}

        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`absolute -bottom-4 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs shadow-md ${
              isUserMessage ? "right-2" : "left-2"
            } ${theme === "dark" ? "bg-[#2a3942] text-white" : "bg-gray-100 text-black"}`}
          >
            {Object.entries(
              message.reactions.reduce((acc, reaction) => {
                acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                return acc;
              }, {}),
            ).map(([emoji, count]) => (
              <span key={emoji} className="flex items-center gap-1 ">
                {emoji}
                {count > 1 && <span className="text-[10px]">{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
