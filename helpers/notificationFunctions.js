require("dotenv").config();
const moment = require('moment');
const admin = require('firebase-admin');
const FCM = require("fcm-node");

// ################################ Repositories ################################ //
const userRepo = require('../repositories/userRepo');

const serverkey = require('../findahohrademo-firebase-adminsdk-fbsvc-99c56739f1.json');

let serviceAccount;

if (process.env.ENVIRONMENT === 'production') {
  // Google Cloud environment
  serviceAccount = admin.credential.applicationDefault();
} else {
  // Local development
  serviceAccount = admin.credential.cert(serverkey);
}

admin.initializeApp({
  credential: serviceAccount,
});



//Send Push Notification For Single User With Same Payload
module.exports.sendPushNotificationsForSingleUser = (notification) => {
  return new Promise(async (resolve, reject) => {
    let successCount = 0;
    let failureCount = 0;
    const responses = [];

    try {
      const userDetails = await userRepo.findAll({
        _id: notification.userId,
        token: { $ne: null },
        isActived: 1,
        isDeleted: 0,
        notificationAllow: 'true'
      });

      if (!userDetails || userDetails.length === 0) {
        return resolve({
          successCount: 0,
          failureCount: 0,
          responses: []
        });
      }

      const fcmTokens = userDetails
        .map(i => i.token)
        .filter(token => token);

      if (fcmTokens.length === 0) {
        return resolve({
          successCount: 0,
          failureCount: 0,
          responses: []
        });
      }

      const message = {
        notification: {
          title: notification.title || "",
          body: notification.message || "",
        },
        data: notification,
        tokens: fcmTokens,
        apns: {
          "headers": {
        "apns-priority": "10"
      },
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              contentAvailable: true,
              priority: "high",
            },
          },
        },
      };


      const response = await admin.messaging().sendEachForMulticast(message);

      response.responses.forEach((resp, idx) => {
        const token = fcmTokens[idx];
        if (resp.success) {
          successCount++;
          responses.push({
            token,
            status: 'success',
            response: resp.messageId
          });
        } else {
          console.error("Failed to send to:", token, resp.error);
          failureCount++;
          responses.push({
            token,
            status: 'failure',
            error: resp.error?.message || 'Unknown error'
          });

          if (resp.error?.code === 'messaging/invalid-argument' || resp.error?.code === 'messaging/registration-token-not-registered') {
            userRepo.update({ _id: notification.userId }, { token }).catch(err => {
              // Suppress token removal errors
            });
          }
        }
      });

      return resolve({
        successCount,
        failureCount,
        responses
      });

    } catch (error) {
      console.error("Error sending push notifications:", error);
      return resolve({
        successCount: 0,
        failureCount: 0,
        responses: []
      });
    }
  });
};

//Send Push Notification For Multiple User With Same Payload
module.exports.sendPushNotificationsForMultipleUserSamePayload = (notification) => {
  return new Promise(async (resolve, reject) => {
    let successCount = 0;
    let failureCount = 0;
    const responses = [];

    try {
      const userDetails = await userRepo.findAll({
        _id: {$in: notification.userId},
        token: { $ne: null },
        isActived: 1,
        isDeleted: 0,
        notificationAllow: 'true'
      });

      if (!userDetails || userDetails.length === 0) {
        return resolve({
          successCount: 0,
          failureCount: 0,
          responses: []
        });
      }

      const fcmTokens = userDetails 
        .map(i => i.token)
        .filter(token => token);

      if (fcmTokens.length === 0) {
        return resolve({
          successCount: 0,
          failureCount: 0,
          responses: []
        });
      }

      const message = {
        notification: {
          title: notification.title || "",
          body: notification.message || "",
        },
        data: notification,
        tokens: fcmTokens,
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              contentAvailable: true,
              priority: "high",
            },
          },
        },
      };


      const response = await admin.messaging().sendEachForMulticast(message);

      response.responses.forEach((resp, idx) => {
        const token = fcmTokens[idx];
        if (resp.success) {
          successCount++;
          responses.push({
            token,
            status: 'success',
            response: resp.messageId
          });
        } else {
          failureCount++;
          responses.push({
            token,
            status: 'failure',
            error: resp.error?.message || 'Unknown error'
          });

          if (resp.error?.code === 'messaging/invalid-argument' || resp.error?.code === 'messaging/registration-token-not-registered') {
            userRepo.update({ _id: notification.userId }, { token }).catch(err => {
              // Suppress token removal errors
            });
          }
        }
      });

      return resolve({
        successCount,
        failureCount,
        responses
      });

    } catch (error) {
      console.error("Error sending push notifications:", error);
      return resolve({
        successCount: 0,
        failureCount: 0,
        responses: []
      });
    }
  });
};

//Send Push Notification For Multiple User With Same Payload
module.exports.sendPushNotificationsForMultipleUserWithImage = (notification, userId) => {
  return new Promise((resolve, reject) => {
    (async () => {
      let successCount = 0;
      let failureCount = 0;
      const responses = [];

      try {
        const userDetails = await userRepo.findAll({
          _id: { $in: userId },
          token: { $ne: null },
          isActived: 1,
          isDeleted: 0,
          notificationAllow: 'true'
        });

        if (!userDetails || userDetails.length === 0) {
          return resolve({ successCount: 0, failureCount: 0, responses: [] });
        }

        const fcmTokens = userDetails
          .map(i => i.token)
          .filter(token => token);

        if (fcmTokens.length === 0) {
          return resolve({ successCount: 0, failureCount: 0, responses: [] });
        }

        const message = {
          notification: {
            title: notification.title || "",
            body: notification.message || "",
            image: notification.image || ""
          },
          data: notification,
          tokens: fcmTokens,
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
                contentAvailable: true,
                priority: "high",
              },
            },
          },
        };


        const response = await admin.messaging().sendEachForMulticast(message);

        response.responses.forEach((resp, idx) => {
          const token = fcmTokens[idx];
          if (resp.success) {
            successCount++;
            responses.push({
              token,
              status: 'success',
              response: resp.messageId
            });
          } else {
            failureCount++;
            responses.push({
              token,
              status: 'failure',
              error: resp.error?.message || 'Unknown error'
            });
          }
        });

        console.log(`Notifications sent: ${successCount} succeeded, ${failureCount} failed.`);
        resolve({ successCount, failureCount, responses });

      } catch (error) {
        console.error("Error sending push notifications:", error);
        resolve({ successCount: 0, failureCount: 0, responses: [] });
      }
    })();
  });
};
