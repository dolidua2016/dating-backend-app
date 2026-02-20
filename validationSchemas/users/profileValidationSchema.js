const JoiBase = require('joi');
const JoiDate = require('@hapi/joi-date');
const Joi     = JoiBase.extend(JoiDate); // extend Joi with Joi Date

//Basic Details Add Schema
module.exports.basicDetailsAddSchema = Joi.object().keys({ 
firstName: Joi.string().allow('', null),
lastName: Joi.string().allow('', null),
dateOfBirth:Joi.object().keys({
    day: Joi.string().allow('', null),
    month: Joi.string().allow('', null),
    year: Joi.string().allow('', null)
}),
email: Joi.string().email().allow('', null),
phone: Joi.string().allow('',null).min(8).max(11)
    .messages({
        'number.min':`Atleast 8 digit minimum`,
        'string.empty': `"Phone number" should not be empty`
    }),

countryId: Joi.string().allow('',null),

});

//Add Address Schema
module.exports.AddAddressSchema = Joi.object().keys({ 
    country: Joi.string().required(),
    state: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
});

//Save Photos Schema
module.exports.addPhotosSchema = Joi.object().keys({
    profileImage: Joi.string().required(),
    imageVerificationStatus: Joi.string().required(),
    photos: Joi.array().required(),
    page: Joi.string().allow('',null),
    privacyLocked : Joi.number().valid(0,1).optional(),
});


//Add About SchemaS
module.exports.addAboutSchema = Joi.object().keys({
    description: Joi.string().required()
});


//Add or Update Wrap it up Schema
module.exports.addWrapItUpSchema = Joi.object().keys({
    height: Joi.string().required(),
    profession: Joi.string().required(),
    wrapItUpAnswerArray: Joi.array().required()
});

//Add About Schema
module.exports.addQuestionsAnswerSchema = Joi.object().keys({
    answers: Joi.array().allow('', null),
    type: Joi.string().required(),
});

//Add About Schema
module.exports.addContactUsSchema = Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().required(),
    phone: Joi.string().min(8).max(11).required(),
    message: Joi.string().required(),
});

//Profile Update Schema
module.exports.profileUpdateSchema = Joi.object().keys({ 
    country: Joi.string().allow('', null),
    email: Joi.string().allow('',null),
    address: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    state:Joi.string().allow('', null),
    lat: Joi.string().allow('', null),
    long: Joi.string().allow('', null),
    profileImage : Joi.string().required(),
    imageVerificationStatus: Joi.string().required()
});


//Profile Update Schema
module.exports.reportSubmitSchema = Joi.object().keys({ 
    reportId: Joi.string().required(),
    inboxId: Joi.string().allow('',null),
    userPictureId: Joi.string().allow('',null),
    userConversationId: Joi.string().allow('',null),
    userId: Joi.string().required(),
    reason:  Joi.string().allow('',null),
    reportType: Joi.string().required(),
    userReason: Joi.string().allow('',null),
});


//Email Verify Schema
module.exports.emailVerifySchema = Joi.object().keys({ 
    email: Joi.string().required(),
});

//OTP Verify Schema
module.exports.otpVerifySchema = Joi.object().keys({ 
    otp: Joi.string().required(),
    email: Joi.string().required(),
});