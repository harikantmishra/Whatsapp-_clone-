const { uploadFileToCloudinary } = require("../config/cloudinary");
const Conversation = require("../models/conversation");
const response = require('../utils/responseHandler')
const Message = require('../models/Message.js');

exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;

    const file = req.file;

    const participants = [senderId, receiverId].sort();

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: participants,
    });

    if (!conversation) {
      conversation = new Conversation({
        participants,
      });

      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    // Handle file upload
    // Handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload media");
      }

      imageOrVideoUrl = uploadFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        contentType = "document";
      }
    } else if (content) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    // Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content: content || "",
      imageOrVideoUrl,
      contentType,
      messageStatus: messageStatus || "sent",
    });

    await message.save();
    if (message?.content) {
      conversation.lastMessage = message?._id;
    }
    conversation.unreadCount += 1;
    await conversation.save();

    // Populate sender information
    let populatedMessage = await Message.findById(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");


       // emit socket event for real time 
            if(req.io && req.socketUserMap){
          const receiverSocketId = req.socketUserMap.get(receiverId);
          if(receiverSocketId){
             message.messageStatus = "delivered";
             await message.save();
             populatedMessage.messageStatus = "delivered";
             req.io.to(receiverSocketId).emit("receive_message",populatedMessage);
          }
            }

    return response(res, 201, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error(error);
    return response(res, 401, "Invalid or expired token");
  }
};

//get all conversation

// Get all conversations
exports.getConversation = async (req, res) => {
  const userId = req.user.userId;

  try {
    let conversation = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(res, 201, "Conversation get successfully", conversation);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

// Get messages of a specific conversation
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;

  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      return response(res, 403, "Not authorized to view this conversation");
    }

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort("createdAt");

    return response(res, 200, "Message retrieved", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

exports.markAsRead = async (req, res) => {
  const { messageIds, conversationId } = req.body;
  const userId = req.user.userId;

  try {
    const query = {
      receiver: userId,
      messageStatus: { $in: ["send", "delivered"] },
    };

    if (conversationId) {
      query.conversation = conversationId;
    }

    if (Array.isArray(messageIds) && messageIds.length) {
      query._id = { $in: messageIds };
    }

    const messages = await Message.find(query);

    if (!messages.length) {
      return response(res, 200, "No unread messages found", []);
    }

    const unreadIds = messages.map((message) => message._id);
    const readConversationId = messages[0].conversation?.toString();

    await Message.updateMany(
      { _id: { $in: unreadIds } },
      { $set: { messageStatus: "read" } },
    );

    if (readConversationId) {
      await Conversation.findByIdAndUpdate(readConversationId, {
        unreadCount: 0,
      });
    }

    if (req.io && req.socketUserMap) {
      const senderIds = [...new Set(messages.map((message) => message.sender.toString()))];

      senderIds.forEach((senderId) => {
        const senderSocketId = req.socketUserMap.get(senderId);

        if (senderSocketId) {
          req.io.to(senderSocketId).emit("messages_read", {
            conversationId: readConversationId,
            messageIds: unreadIds.map((id) => id.toString()),
          });
        }
      });
    }

    return response(res, 200, "Messages marked as read", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return response(res, 404, "Message not found");
    }

    if (message.sender.toString() !== userId) {
      return response(res, 403, "Not authorized to delete this message");
    }

    await message.deleteOne();

     if(req.io && req.socketUserMap){
          const receiverSocketId = req.socketUserMap.get(message.receiver.toString());
          if(receiverSocketId){
             req.io.to(receiverSocketId).emit("message_deleted",{ deletedMessageId: messageId });
             
          }
            } 

    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    return response(res, 500, "Internal server error", error.message);
  }
};



