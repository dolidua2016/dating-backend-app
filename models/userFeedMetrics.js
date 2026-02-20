const mongoose = require("mongoose");
const userFeedMetricsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    likesReceived: {
      type:Number,
      default: 0,
    },
    likesGiven:{
      type: Number,
      default: 0,
    },
    passesGiven: {
      type: Number,
       default: 1,
    },
    pendingLikes: {
      type: Number,
      default: 0,
    },
    accountCreatedAt: {
      type: Date,
    },
    accountAgeDays: {
      type: Number,
      default: 0,
    },
    daysSinceLastVisit: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
    engagementScore: {
      type: Number,
      default: 1.0,
    },
    responseRate: {
      type: Number,
      default: 0.5,
    },
    responseLikelihoodBoost:{
      type: Number,
      default: 0.7,
    },
    freshnessBoost: {
      type: Number,
      default: 1.0
    },
    activityPenalty: {
      type: Number,
      default: 1.0
    },
    underexposureBoost: {
        type: Number,
        default: 1.0
    },
    queuePenalty: {
        type: Number,
        default: 1.0
    },
    finalScore: {
      type: Number,
      default: 0,
      index: true,
    },
     gender: {
      type: String,
      enum: ['male', 'female'],
      required: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("userFeedMetrics", userFeedMetricsSchema);
