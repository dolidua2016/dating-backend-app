const mongoose = require("mongoose");

const subscriptionFeaturesSchema = new mongoose.Schema(
  {
    title:{
      type: String

    },
    message: {
      type: String,
    },
    icon:{
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

module.exports = mongoose.model("subscriptionFeatures", subscriptionFeaturesSchema);
