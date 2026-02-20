const JoiBase = require('joi');
const JoiDate = require('@hapi/joi-date');
const Joi = JoiBase.extend(JoiDate); // extend Joi with Joi Date

//User List Schema
module.exports.userListSchema = Joi.object().keys({
    search: Joi.string().allow('', null),
    page: Joi.string().allow('', null),
    filter: Joi.string().valid("subscribe", "nonsubscribe", "blocked", "requested", "newUser", "day1Repeat", "day7Repeat", "day30Repeat", "activeToday", 'incompleteProfile', "deleteUserByApp", "deleteUserByAdmin", "disableUser", "deactivatedUser", "blockedDuringVerification", "reportedUsers", "all",).allow('', null)
});

//User Enable Disable Schema
module.exports.userEnableDisableSchema = Joi.object().keys({
    id: Joi.string().required()
});

//User Delete Schema
module.exports.userDeleteSchema = Joi.object().keys({
    id: Joi.string().required()
});

//User Details Schema
module.exports.userDetailsSchema = Joi.object().keys({
    id: Joi.string().required(),
    search: Joi.string().allow('', null),
    page: Joi.string().allow('', null),
    type: Joi.string().valid("block", "report", "adminreport").allow('', null),
});


//User Match Schema
module.exports.userMatchSchemaSchema = Joi.object().keys({
    id: Joi.string().required(),
    page: Joi.string().allow('', null),
    matchType: Joi.string().valid("Present", "Past", "Future").allow('', null),
});

//User Image Report Schema
module.exports.userImageReportSchema = Joi.object().keys({
    userId: Joi.string().required(),
    image: Joi.string().required(),
    reportedId: Joi.string().required(),
    userPictureId: Joi.string().allow('', null),
    reason: Joi.string().allow('', null),
    type: Joi.string().valid("picture", "profile", "selfie", "ejamaat").required()
});


//User Last Login Schema
module.exports.userLastLoginSchema = Joi.object().keys({
    id: Joi.string().required(),
    startDate: Joi.string().allow('', null),
    endDate: Joi.string().allow('', null),
});
