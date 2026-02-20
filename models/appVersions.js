const mongoose = require("mongoose");
const appVersionSchema = new mongoose.Schema(
  {
    iosVersion: {
      type: String,
    },
    androidVersion: {
      type: String,
    },
    iosPopUpStatus:{
      type: Boolean,
      default: false
    },
    androidPopupStatus:{
      type: Boolean,
      default: false
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

module.exports = mongoose.model("appVersion", appVersionSchema);
