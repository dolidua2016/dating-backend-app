const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
  {
    countryName: {
      type: String,
    },
    countryCode: {
      type: String,
    },
    countryFlag: {
      type: String,
    },
    currencyCode: {
      type: String,
    },
    currencyName: {
      type: String,
    },
    currencySymbol: {
      type: String,
    },
    telephoneCode: {
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

module.exports = mongoose.model("Countries", countrySchema);
