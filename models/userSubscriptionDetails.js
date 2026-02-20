const mongoose = require("mongoose");

const userSubscriptionDetailsSchema = new mongoose.Schema(
  {
    userId:{
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    productId:{
      type: String,
    },
    transactionId:{
      type: String,
    },
    name: {
      type: String,
    },
    amount: {
      type: String,
    },
    currency:{
      type: String,
    },
    purchaseDate: {
      type: Number,
    },
    expireDate:{
      type: Number,
    },
    purchaseFrom:{
      type: String,
    },
    autoRenew:{
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

module.exports = mongoose.model("UserSubscriptionDetails", userSubscriptionDetailsSchema);
