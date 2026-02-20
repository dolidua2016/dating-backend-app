const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    inboxId: {
      type: mongoose.Types.ObjectId,
      ref: "Inboxes",
    },
    senderId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    receiverId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
      default: null
    },
    content: {
      type: String,
    },
    contentType: {
      type: String,
      enum: ['text', 'image', 'pdf'],
    },
    isRead:{
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    isBlockMessaged:{
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    isActived: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    isDeleted: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
