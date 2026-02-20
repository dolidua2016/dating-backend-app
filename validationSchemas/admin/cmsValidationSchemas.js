const JoiBase = require('joi');
const JoiDate = require('@hapi/joi-date');
const Joi     = JoiBase.extend(JoiDate); // extend Joi with Joi Date

//Cms Fetch Schema
module.exports.cmsFetchSchema = Joi.object().keys({ 
    pageName: Joi.string().required()
});

//Cms Update Schema
module.exports.cmsUpdateSchema = Joi.object().keys({ 
    id: Joi.string().required(),
    content: Joi.string().required()
});

//Dashboard Schema
module.exports.dashboardSchema = Joi.object().keys({ 
    year: Joi.string().allow('',null),
    month: Joi.string().allow('',null),
    type: Joi.string().valid("newUserRegistration","newSubscribeUser","newNotSubscribeUser","totalIncome").allow('',null),
});

//Statistics Schema
module.exports.statisticsSchema = Joi.object().keys({ 
    year: Joi.string().allow('',null),
    startDate: Joi.string().allow('',null),
    endDate: Joi.string().allow('',null),
});