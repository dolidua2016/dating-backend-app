/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 6th Dec, 2024`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const subscriptionRepo = require('../../repositories/subscriptionRepo');
const subscriptionFeaturesRepo = require('../../repositories/subscriptionFeaturesRepo');
const userSubscriptionDetailRepo = require('../../repositories/userSubscriptionDetailRepo')
const userSubscriptionRepo = require('../../repositories/userSubscriptionRepo')
const userRepo = require('../../repositories/userRepo');
const userLikeRepo = require("../../repositories/userLikeRepo");
const transactionRepo = require("../../repositories/transactionRepo");

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages')

const { fetchInAppSubscription, handleAppleNotification } = require("../../services/appleService");


const {
  validateRequest,
  verifyPurchase,
  normalizeTransactionData,
  processTransaction } = require("../../services/commonSubscriptionService");
const { handleGoogleNotification } = require("../../services/androidService")
const { fetchAndroidSubscriptions } = require("../../services/androidService");

//################################# Npm Package #################################//
require("dotenv").config();
const mongoose = require('mongoose');
const moment = require('moment');
const { randomUUID } = require("crypto");
const cron = require('node-cron');

/*
|------------------------------------------------ 
| API name          :  fetchAllSubscriptionList
| Response          :  Respective response message in JSON format
| Logic             :  fetch All Subscription List
| Request URL       :  BASE_URL/api/fetch-subscription-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchAllSubscriptionList = (req, res) => {
  (async () => {
    let purpose = "Subscription List Fetch";
    try {
      let userId = req.headers.userId;

      const [subscription, subscriptionFeatures, subscriptionList, userSubscription] = await Promise.all([
        subscriptionRepo.findAll({ isActived: 1, isDeleted: 0 }),
        subscriptionFeaturesRepo.findAll({ isActived: 1, isDeleted: 0 }),
        req.query.type === 'apple' ? fetchInAppSubscription() : fetchAndroidSubscriptions(),
        userSubscriptionRepo.findOne({ userId, status: true, isDeleted: 0, isActived: 1 })
      ]);


      const findAllSubscription = subscription.map(m => { return { ...m, image: process.env.HOST_URL + m.image } })
      const findAllSubscriptionFeatures = subscriptionFeatures.map(m => { return { ...m, icon: process.env.HOST_URL + m.icon } })

      const userLike = await userLikeRepo.findLikeMeUser(
        {
          toUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          isDeleted: 0,
          isActived: 1,
        },
        {
          limit: 3,
          offset: 1 * 3
        }
      );

      const Result = await Promise.all(
        userLike.map(async (element) => ({
          _id: element.userDetails._id,
          name: element.userDetails.firstName + ' ' + element.userDetails.lastName,
          profileImage: element?.userDetails?.profileImage ? process.env.HOST_URL + element.userDetails.profileImage : '',
          address: element.userDetails.address,
          dob: element.userDetails.dob,
          createdAt: element.createdAt,
        }))
      );


      return res.send({
        status: 200,
        msg: responseMessages.subscriptionList,
        data: { findAllSubscription, findAllSubscriptionFeatures, userLikeList: Result, subscriptionList, userSubscription: userSubscription || {} },
        purpose: purpose
      })
    }
    catch (err) {
      console.log("Subscription List Fetch Error : ", err);
      return res.send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose
      })
    }
  })()
}

/*
|------------------------------------------------ 
| API name          :  fetchAllSubscriptionList
| Response          :  Respective response message in JSON format
| Logic             :  fetch All Subscription List
| Request URL       :  BASE_URL/api/fetch-subscription-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.addSubscription = (req, res) => {
  (async () => {
    let purpose = "Subscription Added";
    try {
      const userId = req.headers.userId;
      const subsriptionId = req.query._id;
      const findSubscriptionData = await subscriptionRepo.findOne({ _id: subsriptionId, isActived: 1, isDeleted: 0 })
      const findUserSubscription = await userSubscriptionRepo.findOne({ userId: userId })



      let startDate = findUserSubscription ? moment().utc().add(findUserSubscription.planActiveDays, 'days').format() : moment().utc().format();
      let endDate = findUserSubscription ? moment().utc().add(findUserSubscription.planActiveDays + Number(findSubscriptionData.planDays), 'days').format() : moment().utc().add(findSubscriptionData.planDays, 'days').format();
      let subscriptionStartDate = findUserSubscription ? findUserSubscription.startDate : moment().utc().format();
      let subscriptionEndDate = endDate;
      let planActiveDays = findUserSubscription ? findUserSubscription.planActiveDays + Number(findSubscriptionData.planDays) : findSubscriptionData.planDays;

      let AddSubscriptionDetails = {
        userId: userId,
        planName: findSubscriptionData.planName,
        planPrice: findSubscriptionData.planPrice,
        planDays: findSubscriptionData.planDays,
        planPerDayPrice: findSubscriptionData.planPerDayPrice,
        perWeekPlanPrice: findSubscriptionData.perWeekPlanPrice,
        startDate: startDate,
        endDate: endDate,
      }
      const subscriptionDetailsAdded = await userSubscriptionDetailRepo.create(AddSubscriptionDetails)

      let currentSubId = (findUserSubscription?.currentSubscriptionDetailsId && findUserSubscription?.planActiveDays > 0) ? findUserSubscription?.currentSubscriptionDetailsId : subscriptionDetailsAdded?._id;
      let nextSubId = (findUserSubscription?.currentSubscriptionDetailsId && findUserSubscription?.planActiveDays > 0) ? subscriptionDetailsAdded?._id : null;

      if (!findUserSubscription) {
        const Addsubscription = {
          userId: userId,
          currentSubscriptionDetailsId: currentSubId,
          nextSubscriptionDetailsId: nextSubId,
          startDate: subscriptionStartDate,
          endDate: subscriptionEndDate,
          planActiveDays: planActiveDays,
          planStatus: 'actived',
        }
        await userSubscriptionRepo.create(Addsubscription)
      } else {
        const updatesubscription = {
          currentSubscriptionDetailsId: currentSubId,
          nextSubscriptionDetailsId: nextSubId,
          startDate: subscriptionStartDate,
          endDate: subscriptionEndDate,
          planActiveDays: planActiveDays,
          planStatus: 'actived',
        }
        await userSubscriptionRepo.update({ userId: userId, _id: findUserSubscription._id }, updatesubscription)
      }

      if (subscriptionDetailsAdded) {
        const transactionData = {
          userId: userId,
          subscriptionDetailsId: subscriptionDetailsAdded._id,
          transactionId: randomUUID(),
          planName: findSubscriptionData.planName,
          planPrice: findSubscriptionData.planPrice,
          status: "Success"
        }
        await transactionRepo.create(transactionData);
      }

      await userRepo.update({ _id: userId }, { isSubcription: true, registrationStatus: 'completed' });

      return res.send({
        status: 200,
        msg: responseMessages.subscriptionAdd,
        data: {},
        purpose: purpose
      })
    }
    catch (err) {
      console.log("Subscription Added Error : ", err);
      return res.send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose
      })
    }
  })()
}

/*
|------------------------------------------------ 
| API name          :  verificationSubscription
| Response          :  Respective response message in JSON format
| Logic             : 
| Request URL       :  BASE_URL/api/
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.verificationSubscription = async (req, res) => {
  const purpose = 'Verification';

  try {
    const { transactionId, type, purchaseToken, productId } = req.body;
    console.log('subscription verfication jskdjsa djasd', transactionId, type, purchaseToken, productId)
    const userId = req.headers.userId;
    // Validation
    const validationError = validateRequest({ transactionId, type, purchaseToken, productId });
    if (validationError) {
      return res.json({ status: 400, data: {}, message: validationError, purpose });
    }

    // Verify based on platform
    const verificationResult = await verifyPurchase(type, { transactionId, purchaseToken, productId, userId });
    if (!verificationResult.isValid) {
      return res.json({
        status: 400,
        msg: `Invalid ${type} verification`,
        data: { verifyData: verificationResult },
        purpose
      });
    }

    // Normalize transaction data
    const normalizedData = normalizeTransactionData(verificationResult, userId, type, { productId, transactionId, purchaseToken });

    // Process transaction (create or update)
    const result = await processTransaction(normalizedData, userId);
    // Update user subscription status
    if (verificationResult.isActive) {
      await userRepo.update({ _id: userId }, { isSubcription: true });
    }

    return res.status(200).json({
      status: 200,
      msg: `${type === 'apple' ? 'iOS' : 'Android'} transaction ${result.isNew ? 'verified and saved' : 'updated'}.`,
      data: result.data,
      purpose
    });

  } catch (error) {
    console.error('verificationSubscription error:', error);
    return res.status(500).json({
      status: 500,
      msg: 'Server error',
      data: error.message,
      purpose
    });
  }
};


/*
|------------------------------------------------ 
| API name          :  appleNotification
| Response          :  Respective response message in JSON format
| Logic             :  Apple Real Time Notification
| Request URL       :  BASE_URL/api/fetch-subscription-list
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.appleNotification = async (req, res) => {
  try {
    // V2 always sends: { "signedPayload": "eyJhbGciOi..." }
    const { signedPayload } = req.body;

    if (!signedPayload) {
      console.log('No signedPayload from Apple');
      return res.sendStatus(400); // Apple will retry later
    }

    //  decode payload part (JWS: header.payload.signature)
    const parts = signedPayload.split('.');
    if (parts.length !== 3) {
      console.log('Invalid JWS format');
      return res.sendStatus(400);
    }

    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);



    const {
      notificationType,
      subtype,
      data,
      signedDate
    } = payload;


    await handleAppleNotification(notificationType, subtype, data);


    return res.sendStatus(200);
  } catch (err) {
    console.error('Apple notification error:', err);
    // 5xx dile Apple pore abar retry korbe
    return res.sendStatus(500);
  }
}

/*
|------------------------------------------------ 
| API name          :  androidNotification
| Response          :  Respective response message in JSON format
| Logic             :  Google Real Time Notification
| Request URL       :  BASE_URL/api/google-notification
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.androidNotification = async (req, res) => {
  try {
    // Pub/Sub wrapper
    const pubSubMessage = req.body.message;

    if (!pubSubMessage || !pubSubMessage.data) {
      console.log('Invalid RTDN payload');
      return res.status(200).send('No data');
    }

    // Decode base64
    const decoded = Buffer.from(pubSubMessage.data, 'base64').toString();
    const message = JSON.parse(decoded);

    console.log('RTDN RECEIVED:', JSON.stringify(message));

    // Your existing logic
    await handleGoogleNotification(message);

    // ACK
    return res.status(200).send('OK');
  } catch (error) {
    console.error('RTDN ERROR:', error.message);

    // Still return 200 to avoid infinite retry
    return res.status(200).send('ERROR');
  }
}

/*
|------------------------------------------------ 
| API name          :  transactionList
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Transaction List
| Request URL       :  BASE_URL/api/
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.transactionList = async (req, res) => {
  const purpose = 'Fetch transaction list'
  try {
    const userId = req.headers.userId;
    const { page } = req.query;
    const data = {
      page: Number(page) || 1,
      limit: 10,
      offset: (Number(page) - 1) * 10
    }
    const transactionList = await transactionRepo.findAll({isActived: 1, isDeleted: 0},data);
    const totalCount = await transactionRepo.count({isActived: 1, isDeleted: 0});
    return res.send({
      status: 200,
      msg: responseMessages.subscriptionList,
      data: { transactionList, totalCount},
      purpose: purpose
    });

  } catch (error) {
    console.error('Fetch transaction list ERROR:', error.message);

    // Still return 200 to avoid infinite retry
    return res.status(500).send('ERROR');
  }
}


/**
 * Cleanup expired subscriptions
 * Runs every 2 hours
 */
cron.schedule('0 */2 * * *', async () => {
  console.log('🧹 Starting expired subscription cleanup...', new Date());

  try {
    await cleanupExpiredSubscriptions();
    console.log('✅ Expired subscription cleanup completed');
  } catch (error) {
    console.error('❌ Expired subscription cleanup failed:', error.message);
  }
}, {
  timezone: "Asia/Kolkata"
});


/**
 * Mark expired subscriptions as inactive
 */
async function cleanupExpiredSubscriptions() {
  const now = new Date();

  // Find all subscriptions that expired but still marked as active
  const expiredSubs = await userSubscriptionRepo.findAll({
    status: true,
    expireDate: { $lt: now },
    inGracePeriod: false, // Not in grace period
  });

  console.log(`Found ${expiredSubs.length} expired subscriptions to cleanup`);

  for (const sub of expiredSubs) {
    // Update subscription
    await userSubscriptionRepo.update(
      { _id: sub._id },
      {
        status: false,
        autoRenew: false,
        billingRetry: false,
      }
    );

    // Check if user has other active subscriptions
    const hasOtherActiveSub = await userSubscriptionRepo.findOne({
      userId: sub.userId,
      status: true,
      _id: { $ne: sub._id },
      expireDate: { $gt: now },
    });

    // Update user table if no other active sub
    if (!hasOtherActiveSub) {
      await userRepo.update(
        { _id: sub.userId },
        { isSubcription: false, subscriptionEndDate: sub.expireDate, }
      );

      console.log(`Cleaned up expired subscription for user: ${sub.userId}`);
    }
  }

  return expiredSubs.length;
}



/**
 * Monitor subscriptions in grace period
 * Runs every 12 hours
 */
cron.schedule('0 */12 * * *', async () => {
  console.log('⏰ Starting grace period monitor...', new Date());

  try {
    await monitorGracePeriod();
    console.log('✅ Grace period monitoring completed');
  } catch (error) {
    console.error('❌ Grace period monitoring failed:', error.message);
  }
}, {
  timezone: "Asia/Kolkata"
});

/**
 * Check and update grace period subscriptions
 */
async function monitorGracePeriod() {
  const now = new Date();

  // Find subscriptions in grace period that expired
  const expiredGracePeriod = await userSubscriptionRepo.find({
    inGracePeriod: true,
    gracePeriodExpiresDate: { $lt: now },
  });

  console.log(`Found ${expiredGracePeriod.length} subscriptions with expired grace period`);

  for (const sub of expiredGracePeriod) {
    await userSubscriptionRepo.update(
      { _id: sub._id },
      {
        status: false,
        inGracePeriod: false,
        autoRenew: false,
        billingRetry: false,
      }
    );

    // Update user table
    const hasOtherActiveSub = await userSubscriptionRepo.findOne({
      userId: sub.userId,
      status: true,
      _id: { $ne: sub._id },
    });

    if (!hasOtherActiveSub) {
      await userRepo.update(
        { _id: sub.userId },
        { isSubcription: false }
      );

      // Optional: Send notification to user
      //await sendSubscriptionExpiredEmail(sub.userId);
    }
  }

  return expiredGracePeriod.length;
}


