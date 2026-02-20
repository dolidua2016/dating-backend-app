const countriesRepo = require('../repositories/countriesRepo');
const stateRepo = require('../repositories/stateRepo');
const commonFunction = require('../helpers/commonFunctions');
const userRepo = require('../repositories/userRepo');
const responseMessages = require('../responseMessages');
const smsFunctions = require('../helpers/smsFunctions');

const jwtOptionsAccess = global.constants.jwtAccessTokenOptions;

const sharp = require('sharp');
const fs = require('fs');
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const moment = require('moment');

/**
 * @description Common function to send response
 * @param {Response} res
 * @param {number} status
 * @param {string} msg
 * @param {string} purpose
 * @param {*} data
 * @returns
 */
function sendResponse(res, status, msg, purpose, data = {}) {
  return res.send({ status, msg, data, purpose });
}

/**
 * @description Service to get Telephone Code
 * @param {String} countryId
 * @return {Promise<{type: String | StringConstructor}>}
 */
async function getTelephoneCode(countryId) {
  const country = await countriesRepo.findOne({ _id: countryId });
  console.log('Country fetched for telephone code:', country);
  return country.telephoneCode;
}

async function ensureStateExists(countryId, state) {
  const existing = await stateRepo.findOne({ countryId, stateName: state, isDeleted: 0 });
  if (!existing) {
    await stateRepo.create({ countryId, stateName: state });
  }
}

/**
 * - Helper to check or validate is the body contains the required fields
 * @param body
 * @return {boolean}
 */
function isInvalidNewUserBody(body) {
  // return !body.address || !body.city || !body.notificationAllow || !body.lat || !body.long;
  return !body.notificationAllow
}

function buildLocation(long, lat) {
  if (!long || !lat) return {};
  return {
    type: 'Point',
    coordinates: [parseFloat(long), parseFloat(lat)],
  };
}

/**
 * @description helper to generate OTP and otp expiration time
 * @return {{otp: number, otpExpireTime: moment.Moment}}
 */
function generateOtpData() {
  return {
    otp: 123456, // Math.floor(100000 + Math.random() * 900000), //
    otpExpireTime: moment().utc().add(5, 'minutes'),
  };
}

/**
 * Helper to send OTP
 * @param {number} phone
 * @param otpValue
 * @param appSignature
 * @param deviceType
 * @param telephoneCode
 * @return {Promise<{success: (boolean|*), message: *}|*>}
 */
async function sendOtp(phone, otpValue, appSignature, deviceType, telephoneCode) {
  try {
    let response = {};
    // if(['+968','+971','+994','+880','+92','+970','+94','+992','+213','+234','+216','+44'].includes(telephoneCode))
    //   {
    if (process.env.SERVER !== 'test') {
      const data = await smsFunctions.createMessage(phone, telephoneCode, deviceType, appSignature);
      response = {
        success: data.success,
        message: data.message,
      };
    } else {
      response = {
        success: true,
        message: 'Verification code has been sent to your phone number',
      };
    }

    // }
    //  else{
    // const data =  await commonFunction.createMessage(phone, otpValue, appSignature, deviceType, telephoneCode)
    //   response = data;
    //    response = {
    //   success: data.success,
    //   message: data.message
    // };
    //}

    return response;
  } catch (smsErr) {
    console.log('SMS Failed: Number not found', smsErr?.message || smsErr);
    return smsErr?.message || smsErr;
  }
}

/**
 * Service to handle new User
 * @param res
 * @param body
 * @param telephoneCode
 * @param purpose
 * @return {Promise<e.Response<any, Record<string, any>>>}
 */
async function handleNewUser(res, body, telephoneCode, purpose) {
  // If the body doesn't contain the required fields, then send 404 and message regarding this
  if (isInvalidNewUserBody(body)) {
    return sendResponse(res, 404, 'Address, city , latitude, longitude & notificationAllow must be required', purpose);
  }
  let countryDetails = []
  if(body.country){
       countryDetails =
                  (await countriesRepo.findAll({ countryName: { '$regex': body.country }, isActived: 1 })).map(m => {
                      if ((m.countryName).toLowerCase() === (body.country).toLowerCase()) { return { ...m }; }
                      return null; // Return null if no match
                      }).filter(Boolean); // Remove null values from the result
 
  }
  // Generate OTP and Expire time
  const {otp, otpExpireTime} = generateOtpData();

  // Construct New Registration Data
  const createData = {
    phone: body.phone,
    countryId: countryDetails[0]?._id || '',
    city: body.city,
    notificationAllow: body.notificationAllow,
    state: body.state,
    address: body.address,
    location: buildLocation(body.long, body.lat),
    otp,
    otpExpireTime,
  };

  // Add the Data in DB
  await userRepo.create(createData);
     // Here check is the given state exists in db if not then create that state associate this country

  if(!countryDetails.length && body.state ){
      await ensureStateExists(countryDetails[0]?._id, body.state);

  }
  const optData = await sendOtp(body.phone, otp, body?.appSignature, body?.deviceType, telephoneCode);

  if (!optData.success || optData.success !== true) {
    return sendResponse(res, 404, optData.message, purpose, {});
  }
  return sendResponse(res, 200, responseMessages.otpSendPhone, purpose, {otp});
}

/**
 * If User already exists then check all the validation
 * @param res
 * @param body
 * @param findUser
 * @param telephoneCode
 * @param purpose
 * @return {Promise<e.Response<any, Record<string, any>>>}
 */
async function handleExistingUser(res, body, findUser, telephoneCode, purpose) {
  // If User given Country ID and find user details CountryId different, then send error 409 and message
  if (findUser.countryId !== body.countryId) {
    return sendResponse(res, 409, 'This number is already registered with another country code.', purpose);
  }

  // Generate The OTP and otp expiration time
  const {otp, otpExpireTime} = generateOtpData();

  // Construct Data to update in User table ['OTP','expireTime','location']
  const updateData = {
    otp,
    otpExpireTime,
    location: buildLocation(body.long, body.lat),
  };

  // Body contains state then add to update object
  if (body.state) updateData.state = body.state;
  // If height also given then add it too
  if (findUser?.height) {
    updateData.heightInInches = await commonFunction.heightToInches(findUser.height);
  }

  // Finally, update the user with the latest data and OTP and OTP expiration time
  await userRepo.update({_id: findUser._id, isDeleted: 0}, updateData);
  // send otp
  const optData = await sendOtp(body.phone, otp, body?.appSignature, body?.deviceType, telephoneCode);
  if (!optData.success || optData.success !== true) {
    return sendResponse(res, 404, optData.message, purpose, {});
  }
  return sendResponse(res, 200, responseMessages.otpSendPhone, purpose, {otp});
}

async function convertSvgToPng(svgPath) {
  if (!fs.existsSync(svgPath)) {
    throw new Error(`SVG not found at ${svgPath}`);
  }

  let svgContent = fs.readFileSync(svgPath, 'utf8');

  // 🧹 Step 1: sanitize invalid SVG attributes
  svgContent = svgContent
    .replace(/stroke-[a-zA-Z]*="[^"]*"/g, '') // remove incomplete stroke-* attributes
    .replace(/style="[^"]*"/g, '') // remove inline styles if broken
    .replace(/width="[^"]*"/g, '') // remove huge width
    .replace(/height="[^"]*"/g, '') // remove huge height
    .replace(/\s{2,}/g, ' ') // remove excessive spaces
    .trim();

  // 🧠 Step 2: ensure viewBox present
  if (!svgContent.includes('viewBox=')) {
    svgContent = svgContent.replace(/<svg([^>]+)>/, '<svg$1 viewBox="0 0 1024 1024">');
  }

  // 🧠 Step 3: wrap in clean 512×512 container
  const renderWidth = 512;
  const renderHeight = 512;
  const wrappedSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${renderWidth}" height="${renderHeight}">
      ${svgContent}
    </svg>
  `;

  const outputPath = svgPath.replace('.svg', '.png');

  // 🧠 Step 4: convert safely
  await sharp(Buffer.from(wrappedSvg), { density: 72 })
    .resize(renderWidth, renderHeight, { fit: 'contain', withoutEnlargement: true })
    .png()
    .toFile(outputPath);

  console.log('✅ PNG created successfully:', outputPath);
  return outputPath.split('uploads')[1];
}

/**
 * @description A service for registering a new User
 * @file authService.js
 */
// async function handleNewUserRegister(res, body, purpose) {
//   // If a User sends invalid or forget to send required data, then send response of 404 missing data
//   if (isInvalidNewUserBody(body)) {
//     return sendResponse(res, 404, 'Address, city , latitude, longitude & notificationAllow must be required', purpose);
//   }
//   let countryDetails = []
//   if(body.country){
//        countryDetails = 
//                   (await countriesRepo.findAll({ countryName: { '$regex': body.country }, isActived: 1 })).map(m => {
//                       if ((m.countryName).toLowerCase() === (body.country).toLowerCase()) { return { ...m }; }
//                       return null; // Return null if no match
//                       }).filter(Boolean); // Remove null values from the result

//   }

  
//   // Construct the new user creation Data
//   const createData = {
//     email: body?.email.toLowerCase(),
//     countryId: countryDetails[0]?._id || '',
//     city: body.city,
//     notificationAllow: body.notificationAllow,
//     state: body.state,
//     address: body.address,
//     location: buildLocation(body.long, body.lat),
//     password: CryptoJS.AES.encrypt(body.password, global.constants.passCode_for_password).toString(),
//   };

//   // Create the user through the Repo function
//   const createUser = await userRepo.create(createData);

//   // Generate access token
//   const accessToken = jwt.sign(
//     { user_id: createUser._id, phone: createUser.email.toLowerCase() },
//     jwtOptionsAccess.secret,
//     jwtOptionsAccess.options,
//   );

//   // Add the access token in user schema
//   await userRepo.update({ _id: createUser._id }, { accessToken: accessToken });

//   // Add key 'accessToken' in createUser object
//   createUser['accessToken'] = accessToken;
//   delete createUser.password;

//   return sendResponse(res, 200, responseMessages.registrationSuccess, purpose, createUser);
// }

async function handleNewUserRegister(res, body, purpose) {
  // If a User sends invalid or forget to send required data, then send response of 404 missing data
  if (isInvalidNewUserBody(body)) {
    return sendResponse(res, 404, 'Address, city , latitude, longitude & notificationAllow must be required', purpose);
  }
  let countryDetails = []
  if(body.country){
    countryDetails = 
              (await countriesRepo.findAll({ countryName: { '$regex': body.country }, isActived: 1 })).map(m => {
                  if ((m.countryName).toLowerCase() === (body.country).toLowerCase()) { return { ...m }; }
                  return null; // Return null if no match
                  }).filter(Boolean); // Remove null values from the result
  }

  
  // Construct the new user creation Data
  let createData = {
    email: body?.email.toLowerCase(),
    notificationAllow: body.notificationAllow,
    password: CryptoJS.AES.encrypt(body.password, global.constants.passCode_for_password).toString(),
  };

  // If lat and long stay then add address
  if(body.long && body.lat) {
    createData.countryId = countryDetails[0]?._id || null,
    createData.city = body.city,
    createData.state = body.state,
    createData.address = body.address,
    createData.location = buildLocation(body.long, body.lat)
  }

  // Create the user through the Repo function
  const createUser = await userRepo.create(createData);

  // Generate access token
  const accessToken = jwt.sign(
    { user_id: createUser._id, phone: createUser.email.toLowerCase() },
    jwtOptionsAccess.secret,
    jwtOptionsAccess.options,
  );

  // Add the access token in user schema
  await userRepo.update({ _id: createUser._id }, { accessToken: accessToken });

  // Add key 'accessToken' in createUser object
  createUser['accessToken'] = accessToken;
  delete createUser.password;

  return sendResponse(res, 200, responseMessages.registrationSuccess, purpose, createUser);
}

module.exports = {
  sendResponse,
  getTelephoneCode,
  ensureStateExists,
  handleNewUser,
  handleExistingUser,
  convertSvgToPng,
  handleNewUserRegister,
};
