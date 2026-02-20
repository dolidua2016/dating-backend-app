const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const wrapItUpSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    types: [ 
        {
        name: {
          type: String,
          required: true,
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

module.exports = mongoose.model("wrapItUps", wrapItUpSchema);
