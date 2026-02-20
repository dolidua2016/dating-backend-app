const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    email:{
      type: String,
    },
    password:{
      type: String,
    },
    phone:{
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
    tokens:{
      type: Array
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admins", adminSchema);
