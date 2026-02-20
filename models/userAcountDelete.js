const mongoose = require("mongoose");

const userAccountDeleteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    deleteReasonId: {
      type: mongoose.Types.ObjectId,
      ref: "DeleteReason",
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

module.exports = mongoose.model("UserAccountDelete", userAccountDeleteSchema);
