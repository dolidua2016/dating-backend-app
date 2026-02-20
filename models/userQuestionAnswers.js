const mongoose = require("mongoose");
const questionAnswerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    questionId: {
      type: mongoose.Types.ObjectId,
      ref: "Questions",
    },
    answer: {
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

module.exports = mongoose.model("QuestionAnswers", questionAnswerSchema);
