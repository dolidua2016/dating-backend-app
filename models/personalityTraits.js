const mongoose = require("mongoose");

const personalityTraitSchema = new mongoose.Schema(
  {
    categoryTypes: [{
      name: {type: String} }
    ],
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

module.exports = mongoose.model("personalityTraits", personalityTraitSchema);
