const mongoose = require("mongoose");
const userPictureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    index: {
      type: String,
    },
    image: {
      type: String,
    },
    imageVerificationStatus: {
      type: String,
      enum: ["notStarted", "scanned", "completed", "error"],
      default: "notStarted",
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

module.exports = mongoose.model("UserPictures", userPictureSchema);
