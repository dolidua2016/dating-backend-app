const mongoose = require("mongoose");
const userPictureReportsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    image:{
      type: String,
    },
    reportedId:{
      type: mongoose.Types.ObjectId,
      ref: "ImageReports",
    },
    userPictureId:{
      type: mongoose.Types.ObjectId,
      ref: "UserPictures",
      default: null
    },
    reason: {
      type: String,
    },
    type: {
      type: String,
      enum: ["picture","profile","selfie",'ejamaat'],
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

module.exports = mongoose.model("UserPictureReports", userPictureReportsSchema);
