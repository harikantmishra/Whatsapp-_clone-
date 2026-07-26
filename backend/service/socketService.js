const { Server } = require("socket.io");
const Message = require("../models/Message.js");
const User = require("../models/User.js");
const handleVideoCallEvent = require("./videoService.js");

// Map to store online users => userId -> socketId
const onlineUsers = new Map();

// Map to track typing users => userId -> { conversationId: boolean }
const typingUsers = new Map();

const parseAllowedOrigins = (value) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const initializeSocket = (server) => {
  const allowedOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000,
  });

  // When a new socket connection is established
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    let userId = null;

    // Handle user connection and mark them online
    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        socket.userId = userId;

        onlineUsers.set(userId, socket.id);


        // Join personal room
        socket.join(userId);

        // Update user status
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // Notify everyone
        io.emit("user_status", {
          userId,
          isOnline: true,
        });
      } catch (error) {
        console.error("Error handling user connection", error);
      }
    });

    // Return online status of requested user
    socket.on("get_user_status", async (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      let lastSeen = null;

      if (!isOnline) {
        const requestedUser = await User.findById(requestedUserId).select("lastSeen");
        lastSeen = requestedUser?.lastSeen || null;
      }

      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : lastSeen,
      });
    });

    // Forward message to receiver if online
    socket.on("send_message", async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?._id);

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }
      } catch (error) {
        console.error("Error sending message", error);

        socket.emit("message_error", {
          error: "Failed to send message",
        });
      }
    });

    // Update messages as read and notify sender
    socket.on("mark_messages_as_read", async ({ conversationId, userId: readerId }) => {
      try {
        if (!conversationId || !readerId) return;

        const unreadMessages = await Message.find({
          conversation: conversationId,
          receiver: readerId,
          messageStatus: { $in: ["send", "delivered"] },
        });

        if (!unreadMessages.length) return;

        const unreadIds = unreadMessages.map((message) => message._id);
        const senderIds = [...new Set(unreadMessages.map((message) => message.sender.toString()))];

        await Message.updateMany(
          { _id: { $in: unreadIds } },
          { $set: { messageStatus: "read" } },
        );

        senderIds.forEach((senderId) => {
          const senderSocketId = onlineUsers.get(senderId);

          if (senderSocketId) {
            io.to(senderSocketId).emit("messages_read", {
              conversationId,
              messageIds: unreadIds.map((id) => id.toString()),
            });
          }
        });
      } catch (error) {
        console.error("Error updating message read status", error);
      }
    });
    // handle typing start event and auto-stop after 3s
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (!typingUsers.has(userId)) typingUsers.set(userId, {});

      const userTyping = typingUsers.get(userId);

      userTyping[conversationId] = true;

      // clear any existing timeout
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      // auto-stop after 3s
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;

        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 3000);

      // Notify receiver
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);

        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }

      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    // Add or update reaction on message
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId, reactionUserId }) => {
        try {
          const message = await Message.findById(messageId);

          if (!message) return;

          const reactingUserId = reactionUserId || userId;
          const existingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactingUserId,
          );

          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];

            if (existing.emoji === emoji) {
              // remove same reaction
              message.reactions.splice(existingIndex, 1);
            } else {
              // change emoji
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            // add new reaction
            message.reactions.push({
              user: reactingUserId,
              emoji,
            });
          }

          await message.save();

          const populatedMessage = await Message.findById(message?._id)
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture")
            .populate("reactions.user", "username");

          const reactionUpdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };

          const senderSocket = onlineUsers.get(
            populatedMessage.sender._id.toString(),
          );

          const receiverSocket = onlineUsers.get(
            populatedMessage.receiver._id.toString(),
          );

          if (senderSocket)
            io.to(senderSocket).emit("reaction_update", reactionUpdated);

          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_update", reactionUpdated);
        } catch (error) {
          console.log("Error handling reaction", error);
        }
      },
    );

    socket.on("delete_message", async ({ messageId }) => {
      try {
        if (!messageId) return;

        const message = await Message.findById(messageId);

        if (!message) return;

        const receiverSocketId = onlineUsers.get(message.receiver.toString());

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message_deleted", {
            deletedMessageId: messageId,
          });
        }
      } catch (error) {
        console.error("Error syncing deleted message", error);
      }
    });
// handle video call event 
    handleVideoCallEvent(socket,io,onlineUsers);

    
    // handle disconnection and mark user offline
    const handleDisconnected = async () => {
      if (!userId) return;

      try {
        onlineUsers.delete(userId);

        // clear all typing timeouts
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);

          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) {
              clearTimeout(userTyping[key]);
            }
          });

          typingUsers.delete(userId);
        }

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.leave(userId);

        console.log(`user ${userId} disconnected`);
      } catch (error) {
        console.error("Error handling disconnection", error);
      }
    };

    socket.on("disconnect", handleDisconnected);
  });

  //attach the online user map to the socket server for external user
  io.socketUserMap=onlineUsers;

  return io
};

module.exports = initializeSocket;
