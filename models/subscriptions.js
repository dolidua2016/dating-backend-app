const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
    },
    image:{
      type: String,
      default: ''
    },
    planPrice: {
      type: String,
     
    },
    planDays:{
      type: String,
    },
    planPerDayPrice: {
      type: String,
    },
    perWeekPlanPrice:{
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

module.exports = mongoose.model("Subscription", subscriptionSchema);
