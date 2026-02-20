const mongoose = require("mongoose");

const inboxSchema = new mongoose.Schema(
  {
    firstUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    secondUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    lastMesaageSenderId:{
      type: mongoose.Types.ObjectId,
      ref: "Users",
      default: null
    },
    lastMessage: {
      type: String,
      default: null
    },
   
    lastMessageContentType: {
      type: String,
      enum: ['text', 'image', 'pdf'],
      default: 'text'
    },
    messageCount: {
      type: Number,
      default : 0
    },
    lastMessageTime: {
      type: Date,
      default: Date.now
    },
    isAnyMessage:{
      type: Boolean,
      default: false
    },
    isBlocked:{
      type: Boolean,
      default: false
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
    type:{
      type: String,
      enum: ['admin','user'],
      default: 'user'
    },
    isSendButtonHidden: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inboxes", inboxSchema);
