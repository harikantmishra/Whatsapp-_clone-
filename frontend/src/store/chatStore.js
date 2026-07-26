import { create } from "zustand";
import { axiosInstance } from "../services/axios.service";
import { getSocket } from "../services/chat.service";

const getConversationId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return value._id;
  return String(value);
};

const sortMessagesByCreatedAt = (messages) =>
  [...messages].sort(
    (first, second) =>
      new Date(first.createdAt || 0).getTime() - new Date(second.createdAt || 0).getTime(),
  );

const mergeMessages = (existingMessages, incomingMessages) => {
  const messageMap = new Map();

  [...existingMessages, ...incomingMessages].forEach((message) => {
    if (!message?._id) return;

    const previousMessage = messageMap.get(message._id) || {};

    messageMap.set(message._id, {
      ...previousMessage,
      ...message,
    });
  });

  return sortMessagesByCreatedAt(Array.from(messageMap.values()));
};

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  currentUser: null,
  messages: [],
  loading: false,
  error: null,

  onlineUsers: new Map(),
  typingUsers: new Map(),

  updateConversationFromMessage: (message) => {
    const messageConversationId = getConversationId(message?.conversation);

    if (!messageConversationId) return;

    set((state) => {
      const existingConversations = Array.isArray(state.conversations?.data)
        ? state.conversations.data
        : [];

      const updatedConversations = existingConversations.map((conversation) =>
        conversation._id === messageConversationId
          ? {
              ...conversation,
              lastMessage: message,
              updatedAt: message.createdAt || conversation.updatedAt,
            }
          : conversation,
      );

      updatedConversations.sort(
        (first, second) =>
          new Date(second.lastMessage?.createdAt || second.updatedAt || 0).getTime() -
          new Date(first.lastMessage?.createdAt || first.updatedAt || 0).getTime(),
      );

      return {
        conversations: {
          ...state.conversations,
          data: updatedConversations,
        },
      };
    });
  },

  // ============================
  // Socket Listeners
  // ============================
  initSocketListeners: () => {
    const socket = getSocket();

    if (!socket) return;

    // Remove previous listeners
    socket.off("receive_message");
    socket.off("message_send");
    socket.off("message_status_update");
    socket.off("messages_read");
    socket.off("reaction_update");
    socket.off("message_deleted");
    socket.off("message_error");
    socket.off("user_typing");
    socket.off("user_status");

    // ============================
    // Receive Message
    // ============================
    socket.on("receive_message", (message) => {
      get().receiveMessage(message);
    });

    // ============================
    // Message Delivered
    // ============================
    socket.on("message_send", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id
            ? {
                ...msg, 
                ...message,
              }
            : msg,
        ),
      }));
    });

    // ============================
    // Message Status Update
    // ============================
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                messageStatus,
              }
            : msg,
        ),
      }));
    });

    socket.on("messages_read", ({ conversationId, messageIds }) => {
      const readIds = new Set(messageIds || []);

      set((state) => ({
        messages: state.messages.map((message) =>
          readIds.has(message._id)
            ? {
                ...message,
                messageStatus: "read",
              }
            : message,
        ),
        conversations: {
          ...state.conversations,
          data:
            state.conversations?.data?.map((conversation) =>
              conversation._id === conversationId
                ? {
                    ...conversation,
                    unreadCount: 0,
                    lastMessage:
                      conversation.lastMessage && readIds.has(conversation.lastMessage._id)
                        ? {
                            ...conversation.lastMessage,
                            messageStatus: "read",
                          }
                        : conversation.lastMessage,
                  }
                : conversation,
            ) || [],
        },
      }));
    });

    // ============================
    // Reaction Update
    // ============================
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                reactions,
              }
            : msg,
        ),
      }));
    });

    // ============================
    // Delete Message
    // ============================
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });

    // ============================
    // Message Error
    // ============================
    socket.on("message_error", (error) => {
      console.error("Message Error:", error);
    });

    // ============================
    // Typing Users
    // ============================
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);

        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }

        const typingSet = newTypingUsers.get(conversationId);

        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }

        return {
          typingUsers: newTypingUsers,
        };
      });
    });

    // ============================
    // Online / Offline Status
    // ============================
    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);

        newOnlineUsers.set(userId, {
          isOnline,
          lastSeen,
        });

        return {
          onlineUsers: newOnlineUsers,
        };
      });
    });

    // ============================
    // Load current online users
    // ============================
    const { conversations, currentUser } = get();

    if (conversations?.data?.length && currentUser) {
      conversations.data.forEach((conversation) => {
        const otherUser = conversation.participants.find(
          (user) => user._id !== currentUser._id,
        );

        if (!otherUser) return;

        socket.emit("get_user_status", otherUser._id, (status) => {
          set((state) => {
            const newOnlineUsers = new Map(state.onlineUsers);

            newOnlineUsers.set(status.userId, {
              isOnline: status.isOnline,
              lastSeen: status.lastSeen,
            });

            return {
              onlineUsers: newOnlineUsers,
            };
          });
        });
      });
    }
  },

  // ============================
  // Current User
  // ============================
  setCurrentUser: (user) => {
    set({
      currentUser: user,
    });
  },
  // ============================
  // Fetch Conversations
  // ============================
  fetchConversations: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      const { data } = await axiosInstance.get("/chat/conversations");

      set({
        conversations: data,
        loading: false,
      });

      get().initSocketListeners();

      return data;
    } catch (error) {
      set({
        loading: false,
        error: error?.response?.data?.message || error.message,
      });

      return null;
    }
  },

  // ============================
  // Fetch Messages
  // ============================
  fetchMessages: async (conversationId) => {
    if (!conversationId) return [];

    set({
      loading: true,
      error: null,
    });

    try {
      const { data } = await axiosInstance.get(
        `/chat/conversations/${conversationId}/messages`,
      );

      const messageArray = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      set((state) => ({
        messages:
          state.currentConversation === conversationId
            ? mergeMessages(state.messages, messageArray)
            : sortMessagesByCreatedAt(messageArray),
        currentConversation: conversationId,
        loading: false,
      }));

      return messageArray;
    } catch (error) {
      set({
        loading: false,
        error: error?.response?.data?.message || error.message,
      });

      return [];
    }
  },

  // ============================
  // Send Message
  // ============================
 //send message in real time
sendMessage: async (formData) => {
  const senderId = formData.get("senderId");
  const receiverId = formData.get("receiverId");
  const media = formData.get("media");
  const content = formData.get("content");
  const messageStatus = formData.get("messageStatus");

  const socket = getSocket();

  const { conversations } = get();

  let conversationId = null;

  if (conversations?.data?.length > 0) {
    const conversation = conversations.data.find(
      (conv) =>
        conv.participants.some((p) => p._id === senderId) &&
        conv.participants.some((p) => p._id === receiverId)
    );

    if (conversation) {
      conversationId = conversation._id;
      set({ currentConversation: conversationId });
    }
  }

  //temp message before actual response
  const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
    _id: tempId,
    sender: { _id: senderId },
    receiver: { _id: receiverId },
    conversation: conversationId,
    imageOrVideoUrl:
      media && typeof media !== "string"
        ? URL.createObjectURL(media)
        : null,
    content: content,
    contentType: media
      ? media.type.startsWith("image")
        ? "image"
        : "video"
      : "text",
    createdAt: new Date().toISOString(),
    messageStatus,
  };

  set((state) => ({
    messages: [...state.messages, optimisticMessage],
  }));
  get().updateConversationFromMessage(optimisticMessage);

  try {
    const { data } = await axiosInstance.post(
      "/chat/send-message",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const messageData = data.data || data;

    //replace optimistic message with real one
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === tempId ? messageData : msg
      ),
    }));
    get().updateConversationFromMessage(messageData);

    return messageData;
  } catch (error) {
    console.error("Error sending message", error);

    set((state) => ({
      messages: state.messages.map((msg) =>
        msg._id === tempId
          ? {
              ...msg,
              messageStatus: "failed",
            }
          : msg
      ),
    }));
  }
},
  // ============================
  // Receive Message
  // ============================
  receiveMessage: (message) => {
    if (!message) return;

    const { currentConversation, currentUser, messages } = get();
    const messageConversationId = getConversationId(message.conversation);
    const activeConversationId = getConversationId(currentConversation);

    const messageExists = messages.some((msg) => msg._id === message._id);

    if (messageExists) return;

    // Add to current chat
    if (messageConversationId && messageConversationId === activeConversationId) {
      set((state) => ({
        messages: mergeMessages(state.messages, [message]),
      }));
    }

    // Update conversation preview & unread count
    set((state) => {
      const updatedConversations =
        state.conversations?.data?.map((conversation) => {
          if (conversation._id !== messageConversationId) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: message,
            unreadCount:
              message.receiver?._id === currentUser?._id
                ? (conversation.unreadCount || 0) + 1
                : conversation.unreadCount || 0,
            updatedAt: message.createdAt || conversation.updatedAt,
          };
        }) || [];

      updatedConversations.sort(
        (first, second) =>
          new Date(second.lastMessage?.createdAt || second.updatedAt || 0).getTime() -
          new Date(first.lastMessage?.createdAt || first.updatedAt || 0).getTime(),
      );

      return {
        conversations: {
          ...state.conversations,
          data: updatedConversations,
        },
      };
    });
  },

  // ============================
  // Mark Messages As Read
  // ============================
  markConversationAsRead: () => {
    const socket = getSocket();
    const { currentConversation, currentUser, messages } = get();

    if (!socket || !currentConversation || !currentUser?._id) return;

    const unreadIds = messages
      .filter(
        (message) =>
          message.receiver?._id === currentUser._id &&
          getConversationId(message.conversation) === currentConversation &&
          message.messageStatus !== "read",
      )
      .map((message) => message._id);

    if (!unreadIds.length) return;

    set((state) => ({
      messages: state.messages.map((message) =>
        unreadIds.includes(message._id)
          ? {
              ...message,
              messageStatus: "read",
            }
          : message,
      ),
      conversations: {
        ...state.conversations,
        data:
          state.conversations?.data?.map((conversation) =>
            conversation._id === currentConversation
              ? {
                  ...conversation,
                  unreadCount: 0,
                }
              : conversation,
          ) || [],
      },
    }));

    socket.emit("mark_messages_as_read", {
      conversationId: currentConversation,
      userId: currentUser._id,
    });
  },

  // ============================
  // Delete Message
  // ============================
  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);

      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));

      const socket = getSocket();

      if (socket) {
        socket.emit("delete_message", {
          messageId,
        });
      }

      return true;
    } catch (error) {
      console.error("Delete Message Error:", error);

      set({
        error: error?.response?.data?.message || error.message,
      });

      return false;
    }
  },

  // ============================
  // Add / Change Reaction
  // ============================
  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();

    if (!socket || !currentUser) return;

    socket.emit("add_reaction", {
      messageId,
      emoji,
      userId: currentUser._id,
    });
  },
  // ============================
  // Start Typing
  // ============================
  startTyping: (receiverId) => {
    const socket = getSocket();
    const { currentConversation } = get();

    if (!socket || !currentConversation || !receiverId) return;

    socket.emit("typing_start", {
      conversationId: currentConversation,
      receiverId,
    });
  },

  // ============================
  // Stop Typing
  // ============================
  stopTyping: (receiverId) => {
    const socket = getSocket();
    const { currentConversation } = get();

    if (!socket || !currentConversation || !receiverId) return;

    socket.emit("typing_stop", {
      conversationId: currentConversation,
      receiverId,
    });
  },

  // ============================
  // Check Typing Status
  // ============================
  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();

    if (
      !currentConversation ||
      !typingUsers.has(currentConversation) ||
      !userId
    ) {
      return false;
    }

    return typingUsers.get(currentConversation)?.has(userId);
  },

  // ============================
  // Check Online Status
  // ============================
  isUserOnline: (userId) => {
    if (!userId) return false;

    const { onlineUsers } = get();

    return onlineUsers.get(userId)?.isOnline || false;
  },

  // ============================
  // Last Seen
  // ============================
  getUserLastSeen: (userId) => {
    if (!userId) return null;

    const { onlineUsers } = get();

    return onlineUsers.get(userId)?.lastSeen || null;
  },

  // ============================
  // Cleanup Store
  // ============================
  cleanup: () => {
    const socket = getSocket();

    if (socket) {
      socket.off("receive_message");
      socket.off("message_send");
      socket.off("message_status_update");
      socket.off("messages_read");
      socket.off("reaction_update");
      socket.off("message_deleted");
      socket.off("message_error");
      socket.off("user_typing");
      socket.off("user_status");
    }

    set({
      conversations: [],
      currentConversation: null,
      currentUser: null,
      messages: [],
      loading: false,
      error: null,
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },
}));
