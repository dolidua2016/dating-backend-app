const mongoose = require("mongoose");
const userPassSchema = new mongoose.Schema(
  {
    toUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    fromUserId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
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

module.exports = mongoose.model("userPasses", userPassSchema);
