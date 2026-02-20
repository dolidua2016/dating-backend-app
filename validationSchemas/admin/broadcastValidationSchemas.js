const JoiBase = require("joi");
const JoiDate = require("@hapi/joi-date");
const Joi = JoiBase.extend(JoiDate); // extend Joi with Joi Date

//Broadcast Create Schema
module.exports.createBroadcast = Joi.object().keys({
    userIds: Joi.array().required(),
    message: Joi.string().required(),
    title:Joi.string().required(),
    image: Joi.string().allow('', null),
    filter: Joi.object().optional(),
    search: Joi.string().allow('', null),
    isSelectAll: Joi.boolean().optional(),
});

//Broadcast Delete
module.exports.deleteBroadcast = Joi.object().keys({
    id: Joi.string().required()
});