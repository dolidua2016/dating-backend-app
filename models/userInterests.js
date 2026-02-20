const mongoose = require("mongoose");
const userInterestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    interestId: {
      type: mongoose.Types.ObjectId,
      ref: "Interests",
    },
    typeId:{
      type: mongoose.Types.ObjectId,
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

module.exports = mongoose.model("userInterests", userInterestSchema);
