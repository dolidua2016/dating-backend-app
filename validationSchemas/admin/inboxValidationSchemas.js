const JoiBase = require('joi');
const JoiDate = require('@hapi/joi-date');
const Joi     = JoiBase.extend(JoiDate); // extend Joi with Joi Date

//Inbox List Schema
module.exports.inboxListSchema = Joi.object().keys({ 
    search: Joi.string().allow('', null),
    page: Joi.string().allow('', null),
    startDate: Joi.string().allow('', null),
    endDate: Joi.string().allow('', null),
});

//Inbox Read Message Schema
module.exports.inboxReadMessageSchema = Joi.object().keys({ 
    id: Joi.string().required()
});