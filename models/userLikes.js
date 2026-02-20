const mongoose = require("mongoose");
const userLikeSchema = new mongoose.Schema(
  {
    toUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    fromUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    isRead: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    pageFrom: {
      type: String,
      enum: ['home', 'profile'],
      default: 'home',
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

module.exports = mongoose.model("userLikes", userLikeSchema);
