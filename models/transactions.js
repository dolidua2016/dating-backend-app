const mongoose = require("mongoose");

const transactionDetailsSchema = new mongoose.Schema(
  {
    userId:{
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    transactionUniqueId: {
      type: String,
    },
    productId: {
       type: String,
    },
   
    transactionId: {
      type: String,
    },
    originalTransactionId:{
      type: String,
    },
    appTransactionId:{
      type: String,
    },
    amount: {
      type: String,
    },
    currency: {
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
    environment:{
      type: String,
    },
    purchaseFrom:{
      type: String,
    },
    transactionReason: {
      type: String,
    },
    purchaseToken: {
      type: String,
      index: true
    },
    status:{
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

module.exports = mongoose.model("Transaction", transactionDetailsSchema);
