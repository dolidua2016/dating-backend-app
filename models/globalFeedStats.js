const mongoose = require('mongoose');

const globalFeedStatsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      default: 'GLOBAL_FEED_STATS'
    },

    gender: {
      type: String,
      enum: ['male', 'female'],
      required: true
    },

    avgPendingLikes: {
      type: Number,
      default: 40
    },

    p25LikesReceived: {
      type: Number,
      default: 10
    },

    p50LikesReceived: {
      type: Number,
      default: 30
    },

    p75LikesReceived: {
      type: Number,
      default: 70
    },

    lastCalculatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// 🔥 THIS IS CRITICAL
// Composite unique index (key + gender)
globalFeedStatsSchema.index(
  { key: 1, gender: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'GlobalFeedStats',
  globalFeedStatsSchema
);
