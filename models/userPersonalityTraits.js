const mongoose = require("mongoose");
const personalityTraitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    personalityTraitId:{
      type: mongoose.Types.ObjectId,
      ref: "personalityTraits",
    },
    categoryTypesId:{
      type: mongoose.Types.ObjectId,
    },
    number:{
      type: Number
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

module.exports = mongoose.model("userPersonalityTraits", personalityTraitSchema);
