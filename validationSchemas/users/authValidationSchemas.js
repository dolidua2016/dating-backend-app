const JoiBase = require('joi');
const JoiDate = require('@hapi/joi-date');
const Joi = JoiBase.extend(JoiDate); // extend Joi with Joi Date

/**
 * @description Joi validation schema for Login user or Register User
 * @file authValidationSchemas.js
 */
module.exports.loginUserSchema = Joi.object().keys({
  phone: Joi.string().required().min(8).max(11).messages({
    'any.required': `"Phone number" is a required field`,
    'number.min': `Phone number must be at least 8 digits`,
    'number.max': `Phone number cannot exceed 11 digits`,
    'string.empty': `"Phone number" should not be empty`,
  }),
  countryId: Joi.string().required(),
  address: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  state: Joi.string().allow('', null),
  lat: Joi.string().allow('', null),
  long: Joi.string().allow('', null),
  notificationAllow: Joi.string().allow('', null),
  appSignature: Joi.string().allow('', null),
  deviceType: Joi.string().allow('', null),
});

//OTP Verify Schema
module.exports.OTPVerifySchema = Joi.object().keys({
  phone: Joi.string().required().min(8).max(11).messages({
    'any.required': `"Phone number" is a required field`,
    'number.min': `Atleast 8 digit minimum`,
    'string.empty': `"Phone number" should not be empty`,
  }),
  otp: Joi.string().required(),
  fcmToken: Joi.string().allow('', null),
  deviceType: Joi.string().required(),
});

//Login With Phone Number Schema
module.exports.loginUserSchema = Joi.object().keys({
  phone: Joi.string().required().min(8).max(11).messages({
    'any.required': `"Phone number" is a required field`,
    'number.min': `Phone number must be at least 8 digits`,
    'number.max': `Phone number cannot exceed 11 digits`,
    'string.empty': `"Phone number" should not be empty`,
  }),
  countryId: Joi.string().required(),
  address: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  state: Joi.string().allow('', null),
  lat: Joi.string().allow('', null),
  long: Joi.string().allow('', null),
  notificationAllow: Joi.string().allow('', null),
  appSignature: Joi.string().allow('', null),
  deviceType: Joi.string().allow('', null),
});

//Login With Email Number Schema
module.exports.loginWithEmailSchema = Joi.object().keys({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': `"Email" is a required field`,
      'string.empty': `"Email" should not be empty`,
      'string.email': `"Email" must be a valid email address`,
    }),
  password: Joi.string().min(8).required(),
  deviceType: Joi.string().allow('', null),
  fcmToken: Joi.string().allow('', null),
});

/**
 * @file authValidationSchemas.js
 * @description Joi validation schema for Registration data
 */
module.exports.registerSchema = Joi.object().keys({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': `"Email" is a required field`,
      'string.empty': `"Email" should not be empty`,
      'string.email': `"Email" must be a valid email address`,
    }),
  country: Joi.string().allow('', null),
  address: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  state: Joi.string().allow('', null),
  lat: Joi.string().allow('', null),
  long: Joi.string().allow('', null),
  notificationAllow: Joi.string().allow('', null),
  appSignature: Joi.string().allow('', null),
  deviceType: Joi.string().allow('', null),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.any().valid(Joi.ref('password')).messages({
    'any.only': `"Confirm password" must match "Password"`,
  }),
});

//Forgot Password Schema
module.exports.forgotPasswordSchema = Joi.object().keys({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': `"Email" is a required field`,
      'string.empty': `"Email" should not be empty`,
      'string.email': `"Email" must be a valid email address`,
    }),
});

//Reset Password Schema
module.exports.resetPasswordSchema = Joi.object().keys({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'any.required': `"Email" is a required field`,
      'string.empty': `"Email" should not be empty`,
      'string.email': `"Email" must be a valid email address`,
    }),
  otp: Joi.string().required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.any().valid(Joi.ref('password')).messages({
    'any.only': `"Confirm password" must match "Password"`,
  }),
});
