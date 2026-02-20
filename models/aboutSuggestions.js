const mongoose = require("mongoose");

const aboutSuggestionsSchema = new mongoose.Schema(
  {
    suggestions: {
      type: String,
    },
    isDeleted: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AboutSuggestions", aboutSuggestionsSchema);
