const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
{
    userId:{
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    productId:{
      type: String,
    },
    latestTransactionId:{
      type: String,
    },
    originalTransactionId:{
      type: String,
    },
     // Apple specific fields
    appTransactionId:{
      type: String,
    },
    // Android specific fields
    purchaseToken: {
      type: String,
      index: true
    },
    acknowledgementState: {
      type: Number,
      enum: [0, 1], // 0 = not acknowledged, 1 = acknowledged
    },
    // Common fields
    name: {
      type: String,
    },
    amount: {
      type: String,
    },
    currency:{
      type: String,
    },
    currencySymbol: {
      type: String,
    },
    purchaseDate: {
      type: Date,
    },
    expireDate: {
      type: Date,
    },
    purchaseFrom:{
      type: String,
    },
    autoRenew:{
      type: Boolean,
      default: false
    },
    billingRetry:{
      type: Boolean,
      default: false  
    },
    inGracePeriod:{
      type: Boolean,  
      default: false
    },
    status:{
      type: Boolean,
      default: false
    },
    transactionReason: {
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
    gracePeriodExpiresDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("userSubscriptions", userSubscriptionSchema);
