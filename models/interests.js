const mongoose = require("mongoose");

const interestSchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
    },
    types: [
      {
        name: {
          type: String,
          required: true,
        },
        icon:{
          type: String,
          default: ''
        },
        isActived : {
            type: Number,
            enum: [0, 1],
            default: 1,
        },
      }
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

module.exports = mongoose.model("Interests", interestSchema);
