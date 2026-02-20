const mongoose = require("mongoose");

const notificationIconSchema = new mongoose.Schema(
  {
    icon: { 
        type: String, 
        
    },
    type: {
      type: String,
      enum: ['message', 'newMatch', 'like', 'firstMatch','profileUpdate'],
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

module.exports = mongoose.model("NotificationIcons", notificationIconSchema);
