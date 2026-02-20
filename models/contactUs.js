const mongoose = require("mongoose");
const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    name:{
      type: String,
    },
    email:{
      type: String,
    },
    phone:{
      type: String,
    },
    message: {
      type: String,
    },
    readUnread: {
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

module.exports = mongoose.model("ContactUs", contactSchema);
