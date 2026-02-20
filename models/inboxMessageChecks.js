const mongoose = require("mongoose");

const inboxMessageCheksSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    inboxId: {
        type: mongoose.Types.ObjectId,
        ref: "Inboxes",
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

module.exports = mongoose.model("InboxMessageCheks", inboxMessageCheksSchema);
