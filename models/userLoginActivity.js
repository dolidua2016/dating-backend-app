const mongoose = require("mongoose");
const userLoginActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
    appOpenHistory: [
      {
        date: Date,          
        times: [Date]      
      }
   ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("userLoginActivity", userLoginActivitySchema);
