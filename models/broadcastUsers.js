const mongoose = require("mongoose");

const broadCastUserSchema = new mongoose.Schema(
  {
    broadcastId: {
          type: mongoose.Types.ObjectId,
          ref: "Broadcasts",
    },
    userId: {
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

module.exports = mongoose.model("BroadcastUser", broadCastUserSchema);
