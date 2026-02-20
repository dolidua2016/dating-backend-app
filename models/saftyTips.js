const mongoose = require('mongoose');

const saftyTipsSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    message: {
        type: String,
    },
    icon:{
        type: String,
        default: ''
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

module.exports = mongoose.model('saftyTips', saftyTipsSchema);
