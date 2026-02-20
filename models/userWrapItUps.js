const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userWrapItUpSchema = new mongoose.Schema(
  {
    userId:{
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    WrapItUpId: {
      type: mongoose.Types.ObjectId,
      ref: "wrapItUps",
    },
    typeId:{
      type: String
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

module.exports = mongoose.model("userWrapItUp", userWrapItUpSchema);
