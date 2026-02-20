const mongoose = require("mongoose");

const userBlockSchema = new mongoose.Schema(
  {
    toUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    fromUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
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

module.exports = mongoose.model("UserBlock", userBlockSchema);
