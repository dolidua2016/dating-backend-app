const mongoose = require("mongoose");

const imageReportsSchema = new mongoose.Schema(
  {
    message: {
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

module.exports = mongoose.model("ImageReports", imageReportsSchema);
