import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { FaPlus, FaSearch } from "react-icons/fa";
import useLayoutStore from "../../src/store/LayoutStore";
import { useChatStore } from "../../src/store/chatStore";
import useThemeStore from "../../src/store/themeStore";
import useUserStore from "../../src/store/useUserStore";

const formatTimestamp = (value) => {
  if (!value) return "";
  return formatDistanceToNow(new Date(value), { addSuffix: true });
};

const ChatList = ({ contacts = [] }) => {
  const setSelectedContact = useLayoutStore((state) => state.setSelectedContact);
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const conversations = useChatStore((state) => state.conversations);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const [searchTerms, setSearchTerms] = useState("");

  const contactsWithConversation = contacts
    .map((contact) => {
      const liveConversation =
        conversations?.data?.find((conversation) =>
          conversation.participants?.some((participant) => participant._id === contact._id),
        ) || null;

      return {
        ...contact,
        conversation: liveConversation || contact.conversation || null,
      };
    })
    .filter((contact) =>
      contact?.username?.toLowerCase().includes(searchTerms.toLowerCase()),
    )
    .sort((first, second) => {
      const firstTime = first.conversation?.lastMessage?.createdAt
        ? new Date(first.conversation.lastMessage.createdAt).getTime()
        : 0;
      const secondTime = second.conversation?.lastMessage?.createdAt
        ? new Date(second.conversation.lastMessage.createdAt).getTime()
        : 0;

      return secondTime - firstTime;
    });

  return (
    <div
      className={`flex h-full w-full flex-col border-r ${
        theme === "dark"
          ? "border-gray-600 bg-[rgb(17,27,33)]"
          : "border-[#d1d7db] bg-white"
      }`}
    >
      <div
        className={`flex justify-between p-4 ${
          theme === "dark" ? "text-white" : "text-gray-800"
        }`}
      >
        <h2 className="text-xl font-semibold">Chats</h2>
        <button className="rounded-full bg-green-500 p-2 text-white transition-colors hover:bg-green-600">
          <FaPlus />
        </button>
      </div>

      <div className="p-2">
        <div className="relative">
          <FaSearch
            className={`absolute top-1/2 left-3 -translate-y-1/2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-800"
            }`}
          />
          <input
            type="text"
            placeholder="Search or start new chat"
            className={`w-full rounded-lg border py-2 pr-4 pl-10 focus:ring-2 focus:ring-green-500 focus:outline-none ${
              theme === "dark"
                ? "border-gray-700 bg-gray-800 text-white placeholder-gray-500"
                : "border-[#d1d7db] bg-[#f0f2f5] text-[#111b21] placeholder-[#667781]"
            }`}
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {contactsWithConversation.map((contact) => (
          <motion.div
            key={contact._id}
            onClick={() => setSelectedContact(contact)}
            className={`flex cursor-pointer items-center p-3 ${
              theme === "dark"
                ? selectedContact?._id === contact?._id
                  ? "bg-gray-700"
                  : "hover:bg-gray-800"
                : selectedContact?._id === contact?._id
                  ? "bg-[#f0f2f5]"
                  : "hover:bg-[#f5f6f6]"
            }`}
          >
            <img
              src={contact?.profilePicture}
              alt={contact?.username}
              className="h-12 w-12 rounded-full object-cover"
            />

            <div className="ml-3 flex-1">
              <div className="flex items-baseline justify-between">
                <h2 className={`font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}>
                  {contact?.username}
                </h2>

                {contact?.conversation?.lastMessage?.createdAt && (
                  <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    {formatTimestamp(contact.conversation.lastMessage.createdAt)}
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <p className={`truncate text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {contact?.conversation?.lastMessage?.content || contact?.about || "No messages yet"}
                </p>

                {contact?.conversation?.unreadCount > 0 &&
                  contact?.conversation?.lastMessage?.receiver?._id === user?._id && (
                    <p
                      className={`flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-sm ${
                        theme === "dark" ? "text-gray-800" : "text-gray-700"
                      }`}
                    >
                      {contact.conversation.unreadCount}
                    </p>
                  )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
