const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    toUserId: {
        type: mongoose.Types.ObjectId,
        ref: "Users",
    },
    fromUserId: {
        type: mongoose.Types.ObjectId,
        ref: "Users",
    },
    type: {
      type: String,
    },
    linkedId: {
      type: mongoose.Types.ObjectId,
      default: null
    },
    linkedUserId: {
      type: mongoose.Types.ObjectId,
      default: null
    },
    readUnread: {
        type: Number,
        enum: [0, 1],
        default: 0,
    },
    forAdmin: {
        type: Number,
        enum: [0, 1],
        default: 0,
    },
    message: {
      type: String,
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

module.exports = mongoose.model("Notifications", notificationSchema);
