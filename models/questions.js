const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
    },
    placeHolder: {
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
}, { timestamps: true });

module.exports = mongoose.model('Questions', questionSchema);
