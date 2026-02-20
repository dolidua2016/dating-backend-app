const mongoose = require("mongoose");

const cmsSchema = new mongoose.Schema(
  {
    pageName: {
      type: String,
    },
    content: {
      type: String,
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

module.exports = mongoose.model("Cms", cmsSchema);
