const mongoose = require("mongoose");
const userReportSchema = new mongoose.Schema(
  {
    toUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    fromUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    reportedId:{
      type: mongoose.Types.ObjectId,
      ref: "Reports",
    },
    inboxId:{
      type: mongoose.Types.ObjectId,
      ref: "Inboxes",
      default: null
    },
    userPictureId:{
      type: mongoose.Types.ObjectId,
      ref: "UserPictures",
      default: null
    },
    userConversationId:{
      type: mongoose.Types.ObjectId,
      ref: "Conversation",
      default: null
    },
    reason: {
      type: String,
    },
    userReason: {
      type: String,
      default: null
    },
    reportType: {
      type: String
    },
    isReported:{
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

module.exports = mongoose.model("UserReport", userReportSchema);
