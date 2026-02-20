const mongoose = require("mongoose");

const deleteReasonsSchema = new mongoose.Schema(
    {
        message: {
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

module.exports = mongoose.model("DeleteReasons", deleteReasonsSchema);
