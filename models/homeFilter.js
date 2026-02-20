const mongoose = require("mongoose");

const homeFilterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "Users",
    },
  ageRange: {type: String},
  defaultAgeRange: {type: String},
  heightRange: {type: String},
  religious: [{ type: String }],
  education: [{ type: String }],
  maritalStatus: [{ type: String }],
  married: [{ type: String }], //  marriageTimeLine
  kids: [{ type: String }], // haveKids
  wantKids: [{ type: String }],
  queryForPrime:{type: String},
  queryForFree: {type: String},
  countryIds: [
  {
    _id: {
      type: String,
      required: true
    },
    states: {
      type: [String],
      default: []
    }
  }
  ],
  itsVerified:{type: Boolean},

  // states: [{ type: String }],
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

module.exports = mongoose.model("HomeFilter", homeFilterSchema);
