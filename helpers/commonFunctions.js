const axios = require('axios');
const mongoose = require('mongoose');
const userPersonalityTraitRepo = require('../repositories/userPersonalityTraitRepo');
const userInterestRepo = require('../repositories/userInterestRepo');
const notificationRepo = require('../repositories/notificationRepo');
const twilio = require("twilio");

//################################ Function ################################ //
const notificationFunction      = require('../helpers/notificationFunctions');



// Twilio 

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);


module.exports.NewAutoCompleteSearchApi = (data) => { 
    return new Promise(async (resolve, reject) => {
      try {
         const endPoint = 'https://places.googleapis.com/v1/places:autocomplete'
       
        let options = {
          "headers": {
                "Content-Type":"application/json",
                "X-Goog-Api-Key": process.env.GOOGLE_MAP_TOKEN,
                "X-Goog-FieldMask":"*"
              }
        }
  
        const response = await axios.post(endPoint,data,options);
        
  
        resolve(response?.data?.suggestions);
      } catch (error) {
        console.error('Error in location function:', error);
        reject(error);
      }
    });
};




module.exports.calculateCompatibilityScore = async (userId, matchId) => {
  return new Promise(async (resolve, reject) => {
  try {
    // Fetch user traits
    const userTraits = await userPersonalityTraitRepo.findAll({ userId , isDeleted: 0});
    const matchTraits = await userPersonalityTraitRepo.findAll({ userId: matchId , isDeleted: 0});
    
    // // Fetch user interests
    const userInterests = await userInterestRepo.findAll({ userId , isDeleted: 0});
    const matchInterests = await userInterestRepo.findAll({ userId: matchId , isDeleted: 0});

    // Calculate common traits percentage
    const commonTraits = userTraits.filter((trait) =>
      matchTraits.some((mTrait) => mTrait.personalityTraitId.toString() === trait.personalityTraitId.toString() 
    && mTrait.categoryTypesId.toString() === trait.categoryTypesId.toString())
    ).length;
    const traitScore = (commonTraits / userTraits.length) * 50; // 50% weight

    const commonInterests = userInterests.filter((interest) =>
      matchInterests.some((mInterest) => mInterest.interestId.toString() === interest.interestId.toString() 
    && mInterest.typeId.toString() === interest.typeId.toString())
    ).length;
    const interestScore = (commonInterests / userInterests.length) * 50; // 30% weight

    resolve(traitScore + interestScore);  // + interestScore 
  } catch (err) {
    console.error("Error calculating compatibility score:", err);
    reject(err);
  }
});
 };


module.exports.notifyMatch = async (toUserId, fromUserId, type, title, message, linkedId) => {
    try {
          // Save notification to DB
          let create = await notificationRepo.create({
              toUserId: toUserId,
              fromUserId: fromUserId || null,
              type: type,
              linkedId: linkedId || null,
              linkedUserId: fromUserId || null,
              message: message
          });

          // Prepare and send push notification
          const pushData = {
              title: title,
              type: type,
              userId: toUserId,
              linkedId: linkedId, //Page Id Where Redirect
              linkedUserId: fromUserId, //User Id 
              message: message
          };

          const result = await notificationFunction.sendPushNotificationsForSingleUser(pushData);

          console.log(`Notification sent to user ${toUserId}:`, result);
          return result;
      } catch (err) {
          console.error(`Error sending match notification to user ${toUserId}:`, err);
          return { success: false, error: err };
      }
};

/**
 * Notification Create And Send Push Notification to Multiple User
 * @param {string[]} toUserId
 * @param {string} fromUserId
 * @param {string} type
 * @param {string} title
 * @param {string} message
 * @param {string} linkedId
 * @return {Promise<{success: boolean, error}|boolean>}
 */
module.exports.notifyMatchForMultipleUser = async (toUserId, fromUserId, type, title, message, linkedId) => {
    try {
        // Save notification to DB
        if (toUserId.length > 0) {

            for (let userId of toUserId) {

                let notificationCreate = {
                    toUserId: userId,
                    fromUserId: fromUserId,
                    type: type,
                    linkedId: linkedId || null,
                    linkedUserId: fromUserId || null,
                    message: message
                };

                await notificationRepo.create(notificationCreate);

                // Prepare and send push notification
                const pushData = {
                    title: title,
                    type: type,
                    userId: userId,
                    linkedId: linkedId,
                    linkedUserId: fromUserId,
                    message: message
                };


                const result = await notificationFunction.sendPushNotificationsForMultipleUserSamePayload(pushData);

                console.log(`Notification sent to user ${toUserId}:`, result);


            }
            return true;
        }
    } catch (err) {
        console.error(`Error sending match notification to user ${toUserId}:`, err);
        return {success: false, error: err};
    }
};


// convert height string to inches
module.exports.heightToInches = (heightStr)=>{
  console.log(heightStr)
  const [feet, inches] = heightStr.split(".").map(Number);
  return feet * 12 + (inches || 0);
}


module.exports.createMessage = async (phoneNumber, otp, appSignature, deviceType, telephoneCode) => {
  try {
    console.log("Preparing to send OTP: common function" , otp, "to phone number:", phoneNumber);
    // Fallback-safe message formatting
    let messageBody = `<#> Your OTP code is: ${otp}`;

    if (deviceType === 'android' && appSignature?.trim()) {
      messageBody += `\n${appSignature.trim()}`;
    } else {
      messageBody += `\n@findabohra.com`;
    }

    let cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // "19878779797"
    const e164Number = `${telephoneCode}${cleanPhoneNumber}`; // "+19878779797"

    if (cleanPhoneNumber.startsWith('1')) {
      cleanPhoneNumber.slice(1);
    }

    const message = await client.messages.create({
      body: messageBody,
      from: '+16893081570',
      to: `${e164Number}`,
    });

    console.log("OTP SENT: ", message.sid);
    return {
       success: true,
       message: "OTP sent successfully",
    };
  } catch (error) {
    console.error("SEND SMS ERROR: ", error);
     if (error?.message) {
      console.error("More Info:", error.moreInfo || '');
    }

    return {
      success: false,
      message: error?.message || "Failed to send OTP",
    };
  }
};

 module.exports.calculateCompatibilityScoresBatch = async (userId, matchIds = []) => {
  try {
    if (!matchIds.length) return [];

    // Fetch base user data once
    const [userTraits, userInterests, matchTraits, matchInterests] = await Promise.all([
      userPersonalityTraitRepo.findAll({ userId, isDeleted: 0 , isActived: 1}),
      userInterestRepo.findAll({ userId, isDeleted: 0 , isActived: 1}),
       userPersonalityTraitRepo.findAll({
        userId: { $in: matchIds },
        isDeleted: 0,
        isActived: 1
      }),
       userInterestRepo.findAll({
        userId: { $in: matchIds },
        isDeleted: 0,
        isActived: 1
      })
    ]);

    // Group by match userId
    const traitMap = new Map();
    const interestMap = new Map();

    for (const t of matchTraits) {
      const key = t.userId.toString();
      if (!traitMap.has(key)) traitMap.set(key, []);
      traitMap.get(key).push(t);
    }

    for (const i of matchInterests) {
      const key = i.userId.toString();
      if (!interestMap.has(key)) interestMap.set(key, []);
      interestMap.get(key).push(i);
    }

    // Calculate score per match user
    const result = [];

    for (const matchId of matchIds) {
      const mId = matchId.toString();

      const mTraits = traitMap.get(mId) || [];
      const mInterests = interestMap.get(mId) || [];

      const commonTraits = userTraits.filter(trait =>
        mTraits.some(mTrait =>
          mTrait.personalityTraitId.toString() === trait.personalityTraitId.toString() &&
          mTrait.categoryTypesId.toString() === trait.categoryTypesId.toString()
        )
      ).length;

      const traitScore = userTraits.length
        ? (commonTraits / userTraits.length) * 50
        : 0;

      const commonInterests = userInterests.filter(interest =>
        mInterests.some(mInterest =>
          mInterest.interestId.toString() === interest.interestId.toString() &&
          mInterest.typeId.toString() === interest.typeId.toString()
        )
      ).length;

      const interestScore = userInterests.length
        ? (commonInterests / userInterests.length) * 50
        : 0;

      result.push([mId, traitScore + interestScore]);
    }

    return result; 
  } catch (err) {
    console.error("Error calculating compatibility score:", err);
    throw err;
  }
};
