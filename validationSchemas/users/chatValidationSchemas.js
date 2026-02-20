const JoiBase = require('joi');
const JoiDate = require('@hapi/joi-date');
const Joi     = JoiBase.extend(JoiDate); // extend Joi with Joi Date


//Chat Inbox List Schema
module.exports.chatInboxListSchema = Joi.object().keys({ 
   page: Joi.number().min(1).required(),
   search: Joi.string().allow('', null)
});

//Chat Inbox List Schema
module.exports.chatConversationListSchema = Joi.object().keys({ 
   page: Joi.number().min(1).required(),
   anotherUserId: Joi.string().required(),
   inboxId: Joi.string().required(),
});



//Chat Inbox List Schema
module.exports.chatContinueSchema = Joi.object().keys({ 
   chatContinue: Joi.boolean().required()
});