/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 2th Dec, 2024`
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const userRepo = require('../../repositories/userRepo');
const countriesRepo = require('../../repositories/countriesRepo');
const stateRepo = require('../../repositories/stateRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');
const commonFunction = require('../../helpers/commonFunctions');
const notificationFunction = require('../../helpers/notificationFunctions');
const smsFunctions = require('../../helpers/smsFunctions');
const { sendMail } = require('../../helpers/emailFunction');
const { forgotPasswordEmailTamplate } = require('../../helpers/emailTamplateFunction');

//############################# Service ################################//
const {
  sendResponse,
  getTelephoneCode,
  ensureStateExists,
  handleNewUser,
  handleExistingUser,
  handleNewUserRegister,
} = require('../../services/authService');

//################################# Npm Package #################################//
require('dotenv').config();
const mongoose = require('mongoose');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

const jwtOptionsAccess = global.constants.jwtAccessTokenOptions;
const jwtOptionsRefresh = global.constants.jwtRefreshTokenOptions;


/*
|------------------------------------------------ 
| API name          :  userLogin
| Response          :  Respective response message in JSON format
| Logic             :  Login
| Request URL       :  BASE_URL/api/login
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * User Login Controller
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @deprecated
 */
module.exports.userLogin = (req, res) => {
  (async () => {
    const purpose = 'User Login';

    try {
      const body = req.body;

      // Check is user exists?
      const findUser = await userRepo.findOne({
        phone: body.phone,
        isDeleted: 0,
      });

      // If User Found but isActive status false, then send a response "disabled account"
      if (findUser && findUser.isActived == 0) {
        return sendResponse(res, 409, responseMessages.adminInactivatedCreds, purpose);
      }

      // Here Get the telephone Code from the Countries table
      const telephoneCode = await getTelephoneCode(body.countryId);
     

      if (!findUser) {
        return await handleNewUser(res, body, telephoneCode, purpose);
      }
      //Handle the existing User
      return await handleExistingUser(res, body, findUser, telephoneCode, purpose);
    } catch (err) {
      console.log('User Login Error : ', err);
      return sendResponse(res, 500, responseMessages.serverError, purpose);
    }
  })();
};

/*
|------------------------------------------------ 
| API name          :  OTPverification
| Response          :  Respective response message in JSON format
| Logic             :  Login
| Request URL       :  BASE_URL/api/otp-verify
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * OTP Varification controller
 * @param req
 * @param res
 * @constructor
 */
module.exports.OTPverification = (req, res) => {
  (async () => {
    let purpose = 'User OTP Verification';
    try {
      let body = req.body;
      // Get the current time
      let TimeNow = moment().utc();
      // Find the user
      let findUser = await userRepo.findOne({ phone: body.phone, isDeleted: 0 });
      // if user not found then send invalid user
      if (!findUser) {
        return res.send({
          status: 409,
          msg: responseMessages.invalidUser,
          data: {},
          purpose: purpose,
        });
      }

      if (process.env.SERVER !== 'test') {
        const telephoneCode = await getTelephoneCode(findUser.countryId);
        const isOTPVerified = await smsFunctions.verifyOTP(body.phone, telephoneCode, body.otp);
        if (!isOTPVerified.success) {
          return res.send({
            status: 409,
            msg: isOTPVerified.message,
            data: {},
            purpose: purpose,
          });
        }
      } else {
        if (findUser.otp != body.otp) {
          return res.send({
            status: 409,
            msg: responseMessages.invalidOTP,
            data: {},
            purpose: purpose,
          });
        }
      }

      // Generate access token
      const accessToken = jwt.sign(
        { user_id: findUser._id, phone: findUser.phone },
        jwtOptionsAccess.secret,
        jwtOptionsAccess.options,
      );
      // Update the user with the latest data and accessToken
      await userRepo.update(
        { phone: body.phone, isDeleted: 0 },
        { otp: '', otpExpireTime: '', accessToken: accessToken, token: body.fcmToken, deviceType: body.deviceType },
      );
      findUser.accessToken = accessToken;
      findUser.profileImage = findUser?.profileImage ? process.env.HOST_URL + findUser.profileImage : '';

      if (findUser.steps > 6) {
       
        if (findUser?.selfieImage === '') findUser.steps = 6;
        else if (findUser?.ejamaatImage === '') findUser.steps = 7;
      }

      

      delete findUser.otp;
      delete findUser.otpExpireTime;
      delete findUser.token;
      delete findUser.deviceType;

      return res.send({
        status: 200,
        msg: responseMessages.loginSucess,
        data: findUser,
        purpose: purpose,
      });
    } catch (err) {
      console.log('User OTP Verification Error : ', err);
      return res.send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose,
      });
    }
  })();
};

/*
|------------------------------------------------ 
| API name          :  userRegister
| Response          :  Respective response message in JSON format
| Logic             :  User Register
| Request URL       :  BASE_URL/api/registration
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * @description User registration Controller
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

module.exports.userRegister = (req, res) => {
  (async () => {
    const purpose = 'User Registration';

    try {
      const body = req.body;
      
      const findUser = await userRepo.findOne({
        email: body.email.toLowerCase(),
        isDeleted: 0,
      });

      if (findUser) {
        return sendResponse(res, 409, responseMessages.exitingEmail, purpose);
      }

      if (!findUser) {
        return await handleNewUserRegister(res, body, purpose);
      }
    } catch (err) {
      console.log('User Registration Error : ', err);
      return sendResponse(res, 500, responseMessages.serverError, purpose);
    }
  })();
};

/*
|------------------------------------------------ 
| API name          :  forgotPassword
| Response          :  Respective response message in JSON format
| Logic             :  Forgot Password
| Request URL       :  BASE_URL/api/forgot-password
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * @description Forgot password controller
 * @param {Request} req
 * @param {Response} res
 * @return {Promise<*>}
 */
module.exports.forgotPassword = async (req, res) => {
  let purpose = 'Forgot Password';
  try {
    const { email } = req.body;
    const userDetails = await userRepo.findOne({ email: email.toLowerCase(), isDeleted: 0 });
    if (!userDetails) {
      return res.send({
        status: 409,
        msg: responseMessages.invalidUser,
        data: {},
        purpose: purpose,
      });
    }

    // Generate OTP
    const otpValue = Math.floor(100000 + Math.random() * 900000); // 123456; //
    const otpExpireTime = moment().utc().add(5, 'minutes');
   
    await forgotPasswordEmailTamplate(
      otpValue,
      email,
      'Your FAB password reset code',
      userDetails?.firstName,
    );
    await userRepo.update({ _id: userDetails._id, isDeleted: 0 }, { otpExpireTime: otpExpireTime, otp: otpValue });

    return res.send({
      status: 200,
      msg: responseMessages.otpSendMessgae,
      data: {},
      purpose: purpose,
    });
  } catch (err) {
    console.log('Forgot Password Error : ', err);
    return res.send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose: purpose,
    });
  }
};

/*
|------------------------------------------------ 
| API name          :  verifyEmailOtp
| Response          :  Respective response message in JSON format
| Logic             :  Reset Password
| Request URL       :  BASE_URL/api/reset-password
| Request method    :  POST
| Author            :  DOLI DUA
|------------------------------------------------
*/
/**
 * Controller for reset password
 * @param {Request} req
 * @param {Response} res
 */

module.exports.resetPassword = (req, res) => {
  (async () => {
    let purpose = 'Reset Password';
    try {
      let body = req.body;
      let TimeNow = moment().utc(); // Get the current time
      // Check the user exists or not
      let findUser = await userRepo.findOne({ email: body.email.toLowerCase(), isDeleted: 0 });

      // user does not exist then return 409 and Invalid User
      if (!findUser) {
        return res.send({
          status: 409,
          msg: responseMessages.invalidUser,
          data: {},
          purpose: purpose,
        });
      }
      // If OTP mismatch then Send response of Invalid OTP and 409
      if (findUser.otp != body.otp) {
        return res.send({
          status: 409,
          msg: responseMessages.invalidOTP,
          data: {},
          purpose: purpose,
        });
      }
      // If OTP Expire time pass away then send message OTP expired
      if (!moment(findUser.otpExpireTime).isSameOrAfter(TimeNow)) {
        return res.send({
          status: 409,
          msg: responseMessages.expireCode,
          data: {},
          purpose: purpose,
        });
      }

      // Construct update data and set blank to otp, otpExpireTime, accessToken
      let updateData = { otp: '', otpExpireTime: '', acessToken: '' };

      // Hash the password and add it to update data
      (updateData.password = CryptoJS.AES.encrypt(body.password, global.constants.passCode_for_password).toString()),
          await userRepo.update({email: body.email.toLowerCase(), isDeleted: 0}, updateData);

      return res.send({
        status: 200,
        msg: responseMessages.resetPasswordSuccess,
        data: {},
        purpose: purpose,
      });
    } catch (err) {
      console.log('Reset Password Error : ', err);
      return res.send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose,
      });
    }
  })();
};



/*
|------------------------------------------------ 
| API name          :  userLoginWithEmail
| Response          :  Respective response message in JSON format
| Logic             :  Login With Email Id and Password
| Request URL       :  BASE_URL/api/login
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Login With Email Controller
 * @param {Request} req
 * @param {Response} res
 */
module.exports.userLoginWithEmail = (req, res) => {
  (async () => {
    const purpose = 'User Login With Email';

    try {
      const body = req.body;

      // Find the user with email and isDeleted param to check the user existence
      const findUser = await userRepo.findOne({
        email: body.email.toLowerCase(),
        isDeleted: 0,
      });

      // User isn't found then send invalid User with Code 409
      if (!findUser) {
        return sendResponse(res, 409, responseMessages.invalidUser, purpose);
      }
      // if (findUser && findUser.isActived == 0) {
      //   return sendResponse(res, 409, responseMessages.adminInactivatedCreds, purpose);
      // }

      // Decrypt the Saved password and compare with User given password
      if (
        CryptoJS.AES.decrypt(findUser?.password, global.constants.passCode_for_password).toString(CryptoJS.enc.Utf8) ===
        body.password
      ) {
        // Generate Access token
        const accessToken = jwt.sign(
            {user_id: findUser._id, phone: findUser.phone},
            jwtOptionsAccess.secret,
            jwtOptionsAccess.options,
        );
        // Update User repo with new generated access token
        await userRepo.update(
          { _id: findUser._id, isDeleted: 0 },
          { otp: '', otpExpireTime: '', accessToken: accessToken, token: body.fcmToken, deviceType: body.deviceType },
        );
        findUser.accessToken = accessToken;
        findUser.profileImage = findUser?.profileImage ? process.env.HOST_URL + findUser.profileImage : '';
        if (findUser.steps > 6) {
          if (findUser?.selfieImage === '') findUser.steps = 6;
          else if (findUser?.ejamaatImage === '') findUser.steps = 7;
        }
        delete findUser.otp;
        delete findUser.otpExpireTime;
        delete findUser.token;
        delete findUser.deviceType;
        delete findUser.password;
        return res.send({
          status: 200,
          msg: responseMessages.loginSucess,
          data: findUser,
          purpose: purpose,
        });
      } else {
        
        return res.send({
          status: 409,
          msg: responseMessages.invalidLogInDetails,
          data: {},
          purpose: purpose,
        });
      }
    } catch (err) {
      console.log('User Login Error : ', err);
      return sendResponse(res, 500, responseMessages.serverError, purpose);
    }
  })();
};
