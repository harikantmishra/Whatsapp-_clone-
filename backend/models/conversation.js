const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: User }],
    lastMessage: [{ type: mongoose.Schema.Types.ObjectId, ref: Message }],
    unreadCount: { type: Number, defeault: 0 },
  },
  {
    timestamps: true,
  },
);

const conversation = mongoose.model('conversation',conversationSchema);

module.exports= conversationSchema;