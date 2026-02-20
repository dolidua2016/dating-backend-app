// const { google } = require('googleapis');
// const transactionRepo = require('../repositories/transactionRepo');
// const userSubscriptionRepo = require('../repositories/userSubscriptionRepo');
// const {generateTransactionId} = require("../helpers/transactionIdGenerate");
// const userRepo = require("../repositories/userRepo");

// const {
//   GOOGLE_APPLICATION_CREDENTIALS,
//   GOOGLE_PACKAGE_NAME,
//   NODE_ENV,
// } = process.env;

// /**
//  * Initialize Google Play Developer API client
//  */
// function getGooglePlayClient() {
//   const auth = new google.auth.GoogleAuth({
//     keyFile: GOOGLE_APPLICATION_CREDENTIALS,
//     scopes: ['https://www.googleapis.com/auth/androidpublisher'],
//   });

//   return google.androidpublisher({
//     version: 'v3',
//     auth,
//   });
// }

// /**
//  * Fetch In-App Subscriptions for Android App
//  * @returns {Array} List of subscription products
//  */
// async function fetchAndroidSubscriptions() {
//   try {
//     const androidPublisher = getGooglePlayClient();

//     // ✅ NEW API - monetization.subscriptions.list
//     const response = await androidPublisher.monetization.subscriptions.list({
//       packageName: GOOGLE_PACKAGE_NAME,
//     });

//     const subscriptions = response.data.subscriptions || [];
//     const formattedList = formatAndroidSubscriptionList(subscriptions);

//     return formattedList;
//   } catch (error) {
//     console.error("Error fetching Android subscriptions:", error.message);
//     throw error;
//   }
// }

// /**
//  * Format Android subscription list
//  */
// function formatAndroidSubscriptionList(subscriptions) {
//   return subscriptions.map(sub => ({
//     id: sub.productId,
//     name: sub.listings?.['en-US']?.title || sub.productId,
//     productId: sub.productId,
//     state: sub.basePlans?.[0]?.state, // ACTIVE, INACTIVE, DRAFT
//     basePlanId: sub.basePlans?.[0]?.basePlanId,
//   }));
// }

// function getBaseOrderId(orderId) {
//   return orderId.split('..')[0];
// }

// /**
//  * Verify an Android in-app purchase transaction
//  * @param {string} productId - The product/SKU ID
//  * @param {string} purchaseToken - The purchase token from the client
//  * @returns {Object} Parsed transaction details
//  */
// async function verifyAndroid(productId, purchaseToken, userId) {
//   try {
//     const androidPublisher = getGooglePlayClient();
//     const response = await androidPublisher.purchases.subscriptions.get({
//       packageName: GOOGLE_PACKAGE_NAME,
//       subscriptionId: productId,
//       token: purchaseToken,
//     });

//     const purchase = response.data;
//     if (!purchase) {
//       throw new Error('Failed to fetch purchase data');
//     }

//     const now = Date.now();
//     const expiresDate = parseInt(purchase.expiryTimeMillis);
//     const purchaseDate = parseInt(purchase.startTimeMillis);
   
//     // Parse payment state
//     const paymentState = parseInt(purchase.paymentState);
//     const isPaymentPending = paymentState === 0;
//     const isPaymentReceived = paymentState === 1;
//     const isFreeTrial = paymentState === 2;
//     const isPendingDeferred = paymentState === 3;

//     // Parse auto-renew status
//     const autoRenewStatus = purchase.autoRenewing === true;

//     // Check cancellation
//     const isCanceled = purchase.cancelReason !== undefined;

    
//     if (
//         purchase.paymentState === 1 &&
//         purchase.acknowledgementState === 0
//       ) {
//         await acknowledgeSubscription(productId, purchaseToken);
//       }

//     // Check acknowledgement
//     const isAcknowledged = true; //purchase.acknowledgementState === 1;
//     const baseOrderId = getBaseOrderId(purchase.orderId);
    
//     return {
//       userId,
//       productId,
//       purchaseToken,
//       orderId: baseOrderId,
//       purchaseDate,
//       expiresDate,
//       now,
//       priceCurrencyCode: purchase.priceCurrencyCode,
//       priceAmountMicros: purchase.priceAmountMicros,
//       countryCode: purchase.countryCode,
//       paymentState,
//       isPaymentPending,
//       isPaymentReceived,
//       isFreeTrial,
//       isPendingDeferred,
//       autoRenewStatus,
//       isCanceled,
//       cancelReason: purchase.cancelReason,
//       isAcknowledged,
//       isActive: expiresDate > now && !isCanceled,
//       billingRetry: isPaymentPending,
//       inGracePeriod: purchase.paymentState === 0 && expiresDate > now,
//       rawPurchase: purchase,
//       environment: NODE_ENV || 'production',
//     };
//   } catch (error) {
//     console.error('Error verifying Android transaction:', error.message);
//     throw new Error(`Failed to verify purchase ${purchaseToken}: ${error.message}`);
//   }
// }

// /**
//  * Acknowledge a subscription purchase
//  * @param {string} productId - The product/SKU ID
//  * @param {string} purchaseToken - The purchase token
//  */
// async function acknowledgeSubscription(productId, purchaseToken) {
//   try {
//     const androidPublisher = getGooglePlayClient();

//     await androidPublisher.purchases.subscriptions.acknowledge({
//       packageName: GOOGLE_PACKAGE_NAME,
//       subscriptionId: productId,
//       token: purchaseToken,
//     });

//     console.log('Subscription acknowledged:', purchaseToken);
//   } catch (error) {
//     console.error('Error acknowledging subscription:', error.message);
//     throw error;
//   }
// }

// /**
//  * Refund and revoke a subscription
//  * @param {string} productId - The product/SKU ID
//  * @param {string} purchaseToken - The purchase token
//  */
// async function refundSubscription(productId, purchaseToken) {
//   try {
//     const androidPublisher = getGooglePlayClient();

//     await androidPublisher.purchases.subscriptions.revoke({
//       packageName: GOOGLE_PACKAGE_NAME,
//       subscriptionId: productId,
//       token: purchaseToken,
//     });

//     console.log('Subscription refunded and revoked:', purchaseToken);
//   } catch (error) {
//     console.error('Error refunding subscription:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle Google Play Real-time Developer Notifications (RTDN)
//  * @param {Object} message - Pub/Sub message from Google
//  */
// async function handleGoogleNotification(message) {
//   try {
//     const { subscriptionNotification, testNotification } = message;

//     // Handle test notifications
//     if (testNotification) {
//       console.log('Google TEST notification received');
//       return;
//     }

//     if (!subscriptionNotification) {
//       console.log('No subscriptionNotification found');
//       return;
//     }

//     const {
//       version,
//       notificationType,
//       purchaseToken,
//       subscriptionId,
//     } = subscriptionNotification;

//     console.log('Notification Type:', notificationType);
//     console.log('Product ID:', subscriptionId);
//     console.log('Purchase Token:', purchaseToken);

//     // Fetch full purchase details
//     const purchaseDetails = await verifyAndroid(subscriptionId, purchaseToken);
//    purchaseDetails.amount = (purchaseDetails.priceAmountMicros ? purchaseDetails.priceAmountMicros / 1000000 : 0);
//    purchaseDetails.currency = (purchaseDetails.priceCurrencyCode || 'USD');

//     switch (notificationType) {
//       case 1: // SUBSCRIPTION_RECOVERED
//         await handleSubscriptionRecovered(purchaseDetails);
//         break;

//       case 2: // SUBSCRIPTION_RENEWED
//         await handleSubscriptionRenewed(purchaseDetails);
//         break;

//       case 3: // SUBSCRIPTION_CANCELED
//         await handleSubscriptionCanceled(purchaseDetails);
//         break;

//       case 4: // SUBSCRIPTION_PURCHASED
//         await handleSubscriptionPurchased(purchaseDetails);
//         break;

//       case 5: // SUBSCRIPTION_ON_HOLD
//         await handleSubscriptionOnHold(purchaseDetails);
//         break;

//       case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
//         await handleSubscriptionGracePeriod(purchaseDetails);
//         break;

//       case 7: // SUBSCRIPTION_RESTARTED
//         await handleSubscriptionRestarted(purchaseDetails);
//         break;

//       case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
//         await handlePriceChangeConfirmed(purchaseDetails);
//         break;

//       case 9: // SUBSCRIPTION_DEFERRED
//         await handleSubscriptionDeferred(purchaseDetails);
//         break;

//       case 10: // SUBSCRIPTION_PAUSED
//         await handleSubscriptionPaused(purchaseDetails);
//         break;

//       case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
//         await handlePauseScheduleChanged(purchaseDetails);
//         break;

//       case 12: // SUBSCRIPTION_REVOKED
//         await handleSubscriptionRevoked(purchaseDetails);
//         break;

//       case 13: // SUBSCRIPTION_EXPIRED
//         await handleSubscriptionExpired(purchaseDetails);
//         break;

//       default:
//         console.log('Unhandled notificationType:', notificationType);
//     }

//     // Auto-acknowledge if not already acknowledged
//     if (!purchaseDetails.isAcknowledged) {
//       await acknowledgeSubscription(subscriptionId, purchaseToken);
//     }
//   } catch (error) {
//     console.error('Error handling Google notification:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle new subscription purchase
//  */
// async function handleSubscriptionPurchased(purchaseDetails) {
//   try {
//     const {
//       productId,
//       purchaseToken,
//       orderId,
//       purchaseDate,
//       expiresDate,
//       priceCurrencyCode,
//       priceAmountMicros,
//       countryCode,
//       autoRenewStatus,
//       currency,
//       amount
//     } = purchaseDetails;
//     const baseOrderId = getBaseOrderId(orderId);

//     let sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: baseOrderId,
//       purchaseFrom: 'Google',
//     });

//     console.log('Found existing Google subscription:', sub);

//     const now = new Date();
//     const expireDateObj = new Date(expiresDate);
//     const purchaseDateObj = new Date(purchaseDate);
//     const trxUniqueId = generateTransactionId();

//     if (!sub) {
//       // CREATE new subscription
//       const newSub = {
//         userId: null, // Set by your app logic
//         productId,
//         originalTransactionId: baseOrderId,
//         latestTransactionId: purchaseToken,
//         purchaseDate: purchaseDateObj,
//         expireDate: expireDateObj,
//         environment: NODE_ENV || 'production',
//         purchaseFrom: 'Google',
//         status: expireDateObj > now,
//         autoRenew: autoRenewStatus,
//         billingRetry: false,
//         inGracePeriod: false,
//         priceCurrencyCode,
//         priceAmountMicros,
//         countryCode,
//         amount,
//         currency,
//         purchaseToken
//       };

//       console.log('Creating new Google subscription:', newSub);
//       const created = await userSubscriptionRepo.create(newSub);

//       // Add transaction history
//       await transactionRepo.create({
//         transactionUniqueId: trxUniqueId,
//         userSubscriptionId: created._id,
//         userId: created.userId,
//         productId,
//         transactionId: purchaseToken,
//         originalTransactionId: baseOrderId,
//         purchaseDate: purchaseDateObj,
//         expireDate: expireDateObj,
//         environment: NODE_ENV || 'production',
//         transactionReason: !sub ?  'PURCHASE' : 'RENEWAL',
//         purchaseFrom: 'Google',
//         status: newSub?.status,
//         amount: newSub?.amount,
//         currency: newSub?.currency,
//       });

//       return created;
//     }

//     // UPDATE existing subscription
//     sub.latestTransactionId = purchaseToken;
//     sub.purchaseDate = purchaseDateObj;
//     sub.expireDate = expireDateObj;
//     sub.status = expireDateObj > now;
//     sub.autoRenew = autoRenewStatus;

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     // Add transaction history
//     await transactionRepo.create({
//        transactionUniqueId: trxUniqueId,
//       userSubscriptionId: sub._id,
//       userId: sub.userId,
//       productId,
//       transactionId: purchaseToken,
//       originalTransactionId: baseOrderId,
//       purchaseDate: purchaseDateObj,
//       expireDate: expireDateObj,
//       environment: NODE_ENV || 'production',
//       transactionReason: 'PURCHASE',
//       purchaseFrom: 'Google',
//       status: sub?.status,
//       amount: sub?.amount,
//       currency: sub?.currency,
//     });

//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription purchased:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription renewal
//  */
// async function handleSubscriptionRenewed(purchaseDetails) {
//   try {
//     const { productId, purchaseToken, orderId, purchaseDate, expiresDate } = purchaseDetails;
//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     const trxUniqueId = generateTransactionId();

//     if (!sub) {
//       console.warn('Renew: subscription not found, creating new');
//       return await handleSubscriptionPurchased(purchaseDetails);
//     }

//     const now = new Date();
//     const expireDateObj = new Date(expiresDate);
//     const purchaseDateObj = new Date(purchaseDate);

//     sub.latestTransactionId = purchaseToken;
//     sub.expireDate = expireDateObj;
//     sub.status = expireDateObj > now;
//     sub.autoRenew = true;
//     sub.billingRetry = false;
//     sub.inGracePeriod = false;

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     // Add transaction history
//     await transactionRepo.create({
//       transactionUniqueId: trxUniqueId,
//       userSubscriptionId: sub._id,
//       userId: sub.userId,
//       productId,
//       transactionId: purchaseToken,
//       originalTransactionId: orderId,
//       purchaseDate: purchaseDateObj,
//       expireDate: expireDateObj,
//       environment: NODE_ENV || 'production',
//       transactionReason: 'RENEWAL',
//       purchaseFrom: 'Google',
//       status: sub?.status,
//       amount: sub?.amount,
//       currency: sub?.currency,
//     });

//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription renewed:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription cancellation
//  */
// async function handleSubscriptionCanceled(purchaseDetails) {
//   try {
//     const { orderId, expiresDate } = purchaseDetails;

//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     if (!sub) {
//       console.warn('Cancel: subscription not found');
//       return;
//     }

//     const now = new Date();
//     const expireDateObj = new Date(expiresDate);

//     sub.autoRenew = false;
//     sub.status = expireDateObj > now; // Still active until expiration

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription canceled:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription expiration
//  */
// async function handleSubscriptionExpired(purchaseDetails) {
//   try {
//     const { orderId, expiresDate } = purchaseDetails;

//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     if (!sub) {
//       console.warn('Expired: subscription not found');
//       return;
//     }

//     const expireDateObj = new Date(expiresDate);

//     sub.expireDate = expireDateObj;
//     sub.status = false;
//     sub.billingRetry = false;
//     sub.inGracePeriod = false;
//     sub.autoRenew = false;
    
//     await userSubscriptionRepo.update({ _id: sub._id }, sub);
//     const hasOtherActiveSub = await userSubscriptionRepo.findOne({
//       userId: sub.userId,
//       status: true,
//       _id: { $ne: sub._id }, 
//     })

//     if (!hasOtherActiveSub) {
//       await userRepo.update(
//         { _id: sub.userId },
//         { 
//           isSubcription: false,
//           subscriptionEndDate: expireDateObj,
//         },
//       );
//       console.log(`User ${sub.userId} subscription expired - no active subs remaining`);
//     } else {
//       console.log(`User ${sub.userId} still has active subscription`);
//     }
    
//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription expired:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription in grace period
//  */
// async function handleSubscriptionGracePeriod(purchaseDetails) {
//   try {
//     const { orderId, expiresDate } = purchaseDetails;

//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     if (!sub) {
//       console.warn('Grace period: subscription not found');
//       return;
//     }

//     sub.inGracePeriod = true;
//     sub.billingRetry = true;
//     sub.status = true;

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     return sub;
//   } catch (error) {
//     console.error('Error handling grace period:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription on hold
//  */
// async function handleSubscriptionOnHold(purchaseDetails) {
//   try {
//     const { orderId } = purchaseDetails;

//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     if (!sub) {
//       console.warn('On hold: subscription not found');
//       return;
//     }

//     sub.status = false;
//     sub.billingRetry = true;

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription on hold:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription recovered
//  */
// async function handleSubscriptionRecovered(purchaseDetails) {
//   try {
//     const { orderId, expiresDate } = purchaseDetails;

//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     if (!sub) {
//       console.warn('Recovered: subscription not found');
//       return;
//     }

//     const expireDateObj = new Date(expiresDate);

//     sub.billingRetry = false;
//     sub.inGracePeriod = false;
//     sub.status = expireDateObj > new Date();

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription recovered:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription restarted
//  */
// async function handleSubscriptionRestarted(purchaseDetails) {
//   return handleSubscriptionRenewed(purchaseDetails);
// }

// /**
//  * Handle subscription paused
//  */
// async function handleSubscriptionPaused(purchaseDetails) {
//   try {
//     const { orderId } = purchaseDetails;

//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     if (!sub) {
//       console.warn('Paused: subscription not found');
//       return;
//     }

//     sub.status = false;

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription paused:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription revoked (refunded)
//  */
// async function handleSubscriptionRevoked(purchaseDetails) {
//   try {
//     const { orderId } = purchaseDetails;

//     const sub = await userSubscriptionRepo.findOne({
//       originalTransactionId: orderId,
//       purchaseFrom: 'Google',
//     });

//     if (!sub) {
//       console.warn('Revoked: subscription not found');
//       return;
//     }

//     sub.status = false;
//     sub.autoRenew = false;

//     await userSubscriptionRepo.update({ _id: sub._id }, sub);

//     return sub;
//   } catch (error) {
//     console.error('Error handling subscription revoked:', error.message);
//     throw error;
//   }
// }

// /**
//  * Handle subscription deferred
//  */
// async function handleSubscriptionDeferred(purchaseDetails) {
//   console.log('Subscription deferred - no action needed');
// }

// /**
//  * Handle pause schedule changed
//  */
// async function handlePauseScheduleChanged(purchaseDetails) {
//   console.log('Pause schedule changed - no action needed');
// }

// /**
//  * Handle price change confirmed
//  */
// async function handlePriceChangeConfirmed(purchaseDetails) {
//   console.log('Price change confirmed - no action needed');
// }

// module.exports = {
//   verifyAndroid,
//   acknowledgeSubscription,
//   refundSubscription,
//   handleGoogleNotification,
//   fetchAndroidSubscriptions
// };

//###################################################### V2 CODE ###########################################//

const { google } = require('googleapis');
const transactionRepo = require('../repositories/transactionRepo');
const userSubscriptionRepo = require('../repositories/userSubscriptionRepo');
const { generateTransactionId } = require("../helpers/transactionIdGenerate");
const userRepo = require("../repositories/userRepo");
const countriesRepo = require("../repositories/countriesRepo");

const {
  GOOGLE_APPLICATION_CREDENTIALS,
  GOOGLE_PACKAGE_NAME,
  NODE_ENV,
} = process.env;

/**
 * Initialize Google Play Developer API client
 */
function getGooglePlayClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  return google.androidpublisher({
    version: 'v3',
    auth,
  });
}

/**
 * Fetch In-App Subscriptions for Android App
 * @returns {Array} List of subscription products
 */
async function fetchAndroidSubscriptions() {
  try {
    const androidPublisher = getGooglePlayClient();

    // ✅ NEW API - monetization.subscriptions.list
    const response = await androidPublisher.monetization.subscriptions.list({
      packageName: GOOGLE_PACKAGE_NAME,
    });

    const subscriptions = response.data.subscriptions || [];
    const formattedList = formatAndroidSubscriptionList(subscriptions);

    return formattedList;
  } catch (error) {
    console.error("Error fetching Android subscriptions:", error.message);
    throw error;
  }
}

/**
 * Format Android subscription list
 */
function formatAndroidSubscriptionList(subscriptions) {
  return subscriptions.map(sub => ({
    id: sub.productId,
    name: sub.listings?.['en-US']?.title || sub.productId,
    productId: sub.productId,
    state: sub.basePlans?.[0]?.state, // ACTIVE, INACTIVE, DRAFT
    basePlanId: sub.basePlans?.[0]?.basePlanId,
  }));
}

/**
 * Get base order ID (remove renewal suffix)
 */
function getBaseOrderId(orderId) {
  return orderId.split('..')[0];
}

/**
 * ✅ NEW: Verify Android subscription using Subscriptions V2 API
 * @param {string} purchaseToken - The purchase token from the client
 * @param {string} userId - User ID (optional)
 * @returns {Object} Parsed transaction details
 */
async function verifyAndroid(purchaseToken, userId = null) {
  try {
    const androidPublisher = getGooglePlayClient();
    
    // ✅ NEW API: purchases.subscriptionsv2.get
    const response = await androidPublisher.purchases.subscriptionsv2.get({
      packageName: GOOGLE_PACKAGE_NAME,
      token: purchaseToken,
    });

    const subscription = response.data;
    if (!subscription) {
      throw new Error('Failed to fetch subscription data');
    }

    // Parse subscription data
    const lineItem = subscription.lineItems?.[0];
    const productId = lineItem?.productId;
    const basePlanId = lineItem?.basePlanId;
    const offerId = lineItem?.offerId;
   
    // Get timestamps
    const startTime = new Date(subscription.startTime).getTime();
    const expiryTime = lineItem?.expiryTime 
      ? new Date(lineItem.expiryTime).getTime() 
      : null;
    const now = Date.now();

    // Get order ID
    const orderId = subscription.latestOrderId;
    const baseOrderId = getBaseOrderId(orderId);

    // Parse subscription state
    const subscriptionState = subscription.subscriptionState;
    const isActive = subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';
    const isPending = subscriptionState === 'SUBSCRIPTION_STATE_PENDING';
    const isPaused = subscriptionState === 'SUBSCRIPTION_STATE_PAUSED';
    const isInGracePeriod = subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
    const isOnHold = subscriptionState === 'SUBSCRIPTION_STATE_ON_HOLD';
    const isCanceled = subscriptionState === 'SUBSCRIPTION_STATE_CANCELED';
    const isExpired = subscriptionState === 'SUBSCRIPTION_STATE_EXPIRED';

    // Auto-renewing status
    const autoRenewing = !!lineItem?.autoRenewingPlan;

    // Acknowledgement state
    const acknowledgementState = subscription.acknowledgementState;
    const isAcknowledged = acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';

    // Price information
    const priceInfo = lineItem?.autoRenewingPlan?.recurringPrice || 
                      lineItem?.prepaidPlan?.pricingPhases?.[0];
    const priceCurrencyCode = priceInfo?.currencyCode || 'USD';
    const priceAmountMicros = priceInfo?.units || '0';
    const amount = parseInt(priceAmountMicros) /// 1000000;

    // Region information
    const regionCode = subscription.regionCode || 'US';

    // Auto-acknowledge if needed
    if (isActive && !isAcknowledged) {
      //await acknowledgeSubscription(purchaseToken);
      await acknowledgeSubscription(productId, purchaseToken);
    }

    const countryData = (await countriesRepo.findAll({ 
            currencyCode: priceCurrencyCode, 
            isActived: 1 
          }))
            

    return {
      userId,
      productId,
      basePlanId,
      offerId,
      purchaseToken,
      orderId,
      baseOrderId,
      purchaseDate: startTime,
      expiresDate: expiryTime,
      now,
      priceCurrencyCode,
      priceAmountMicros,
      amount,
      currency: priceCurrencyCode,
      countryCode: regionCode,
      currencySymbol: countryData.currencyCode || '',
      // Subscription states
      subscriptionState,
      isActive,
      isPending,
      isPaused,
      isInGracePeriod,
      isOnHold,
      isCanceled,
      isExpired,
      
      // Renewal & billing
      autoRenewStatus: autoRenewing,
      billingRetry: isOnHold || isInGracePeriod,
      inGracePeriod: isInGracePeriod,
      
      // Acknowledgement
      isAcknowledged,
      acknowledgementState,
      
      // Derived status
      isValidForAccess: isActive || isInGracePeriod || (isCanceled && expiryTime > now),
      
      // Raw data
      rawPurchase: subscription,
      environment: NODE_ENV || 'production',
    };
  } catch (error) {
    console.error('Error verifying Android subscription:', error.message);
    throw new Error(`Failed to verify purchase ${purchaseToken}: ${error.message}`);
  }
}

/**
 * ✅ NEW: Acknowledge a subscription purchase (V1 API)
 * @param {string} purchaseToken - The purchase token
 */
 async function acknowledgeSubscription(productId, purchaseToken) {
  try {
    const androidPublisher = getGooglePlayClient();

    await androidPublisher.purchases.subscriptions.acknowledge({
      packageName: GOOGLE_PACKAGE_NAME,
      subscriptionId: productId,
      token: purchaseToken,
    });

    console.log('Subscription acknowledged:', purchaseToken);
  } catch (error) {
    console.error('Error acknowledging subscription:', error.message);
    throw error;
  }
}

/**
 * ✅ NEW: Revoke a subscription (V2 API)
 * @param {string} purchaseToken - The purchase token
 * @param {string} revocationContext - Optional revocation reason
 */
async function refundSubscription(purchaseToken, revocationContext = null) {
  try {
    const androidPublisher = getGooglePlayClient();

    // ✅ NEW API: purchases.subscriptionsv2.revoke
    const params = {
      packageName: GOOGLE_PACKAGE_NAME,
      token: purchaseToken,
    };

    if (revocationContext) {
      params.body = { revocationContext };
    }

    await androidPublisher.purchases.subscriptionsv2.revoke(params);

    console.log('Subscription revoked (V2):', purchaseToken);
  } catch (error) {
    console.error('Error revoking subscription:', error.message);
    throw error;
  }
}

/**
 * Handle Google Play Real-time Developer Notifications (RTDN)
 * @param {Object} message - Pub/Sub message from Google
 */
async function handleGoogleNotification(message) {
  try {
    const { subscriptionNotification, testNotification } = message;

    // Handle test notifications
    if (testNotification) {
      console.log('Google TEST notification received');
      return;
    }

    if (!subscriptionNotification) {
      console.log('No subscriptionNotification found');
      return;
    }

    const {
      version,
      notificationType,
      purchaseToken,
      subscriptionId,
    } = subscriptionNotification;

    console.log('Notification Type:', notificationType);
    console.log('Product ID:', subscriptionId);
    console.log('Purchase Token:', purchaseToken);

    // ✅ Fetch full purchase details using V2 API (no productId needed)
    const purchaseDetails = await verifyAndroid(purchaseToken);
    console.log(purchaseDetails,'purchaseDetails-------1006')
    // Ensure amount and currency are set
    purchaseDetails.amount = purchaseDetails.amount || 0;
    purchaseDetails.currency = purchaseDetails.currency || 'USD';

    // Handle different notification types
    switch (notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
        await handleSubscriptionRecovered(purchaseDetails);
        break;

      case 2: // SUBSCRIPTION_RENEWED
        await handleSubscriptionRenewed(purchaseDetails);
        break;

      case 3: // SUBSCRIPTION_CANCELED
        await handleSubscriptionCanceled(purchaseDetails);
        break;

      case 4: // SUBSCRIPTION_PURCHASED
        await handleSubscriptionPurchased(purchaseDetails);
        break;

      case 5: // SUBSCRIPTION_ON_HOLD
        await handleSubscriptionOnHold(purchaseDetails);
        break;

      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        await handleSubscriptionGracePeriod(purchaseDetails);
        break;

      case 7: // SUBSCRIPTION_RESTARTED
        await handleSubscriptionRestarted(purchaseDetails);
        break;

      case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
        await handlePriceChangeConfirmed(purchaseDetails);
        break;

      case 9: // SUBSCRIPTION_DEFERRED
        await handleSubscriptionDeferred(purchaseDetails);
        break;

      case 10: // SUBSCRIPTION_PAUSED
        await handleSubscriptionPaused(purchaseDetails);
        break;

      case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
        await handlePauseScheduleChanged(purchaseDetails);
        break;

      case 12: // SUBSCRIPTION_REVOKED
        await handleSubscriptionRevoked(purchaseDetails);
        break;

      case 13: // SUBSCRIPTION_EXPIRED
        await handleSubscriptionExpired(purchaseDetails);
        break;

      default:
        console.log('Unhandled notificationType:', notificationType);
    }

  } catch (error) {
    console.error('Error handling Google notification:', error.message);
    throw error;
  }
}

/**
 * Handle new subscription purchase
 */
async function handleSubscriptionPurchased(purchaseDetails) {
  try {
    const {
      productId,
      purchaseToken,
      baseOrderId,
      purchaseDate,
      expiresDate,
      priceCurrencyCode,
      priceAmountMicros,
      countryCode,
      autoRenewStatus,
      currency,
      amount,
      userId,
      currencySymbol
    } = purchaseDetails;

    let sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    console.log('Found existing Google subscription:', sub);

    const now = new Date();
    const expireDateObj = new Date(expiresDate);
    const purchaseDateObj = new Date(purchaseDate);
    const trxUniqueId = generateTransactionId();

    if (!sub) {
      // CREATE new subscription
      const newSub = {
        userId: userId || null,
        productId,
        originalTransactionId: baseOrderId,
        latestTransactionId: purchaseToken,
        purchaseDate: purchaseDateObj,
        expireDate: expireDateObj,
        environment: NODE_ENV || 'production',
        purchaseFrom: 'Google',
        status: expireDateObj > now,
        autoRenew: autoRenewStatus,
        billingRetry: false,
        inGracePeriod: false,
        priceCurrencyCode,
        priceAmountMicros,
        countryCode,
        amount,
        currency,
        purchaseToken,
        currencySymbol
      };

      console.log('Creating new Google subscription:', newSub);
      const created = await userSubscriptionRepo.create(newSub);

      // Update user table
      if (created.userId) {
        await userRepo.update(
          { _id: created.userId },
          { isSubcription: true }
        );
      }

      // Add transaction history
      await transactionRepo.create({
        transactionUniqueId: trxUniqueId,
        userSubscriptionId: created._id,
        userId: created.userId,
        productId,
        transactionId: purchaseToken,
        originalTransactionId: baseOrderId,
        purchaseDate: purchaseDateObj,
        expireDate: expireDateObj,
        environment: NODE_ENV || 'production',
        transactionReason: 'PURCHASE',
        purchaseFrom: 'Google',
        status: newSub?.status,
        amount: newSub?.amount,
        currency: newSub?.currency,
        currencySymbol: currencySymbol
      });

      return created;
    }

    // UPDATE existing subscription
    sub.latestTransactionId = purchaseToken;
    sub.purchaseDate = purchaseDateObj;
    sub.expireDate = expireDateObj;
    sub.status = expireDateObj > now;
    sub.autoRenew = autoRenewStatus;
    sub.amount = amount;
    sub.currency = currency;
    sub.currencySymbol = currencySymbol
    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    // Update user table
    if (sub.userId) {
      await userRepo.update(
        { _id: sub.userId },
        { isSubcription: true }
      );
    }

    // Add transaction history
    await transactionRepo.create({
      transactionUniqueId: trxUniqueId,
      userSubscriptionId: sub._id,
      userId: sub.userId,
      productId,
      transactionId: purchaseToken,
      originalTransactionId: baseOrderId,
      purchaseDate: purchaseDateObj,
      expireDate: expireDateObj,
      environment: NODE_ENV || 'production',
      transactionReason: 'PURCHASE',
      purchaseFrom: 'Google',
      status: sub?.status,
      amount: sub?.amount,
      currency: sub?.currency,
      currencySymbol
    });

    return sub;
  } catch (error) {
    console.error('Error handling subscription purchased:', error.message);
    throw error;
  }
}

/**
 * Handle subscription renewal
 */
async function handleSubscriptionRenewed(purchaseDetails) {
  try {
    const { productId, purchaseToken, baseOrderId, purchaseDate, expiresDate , amount, currency, currencySymbol} = purchaseDetails;
    
    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    const trxUniqueId = generateTransactionId();

    if (!sub) {
      console.warn('Renew: subscription not found, creating new');
      return await handleSubscriptionPurchased(purchaseDetails);
    }

    const now = new Date();
    const expireDateObj = new Date(expiresDate);
    const purchaseDateObj = new Date(purchaseDate);

    sub.latestTransactionId = purchaseToken;
    sub.expireDate = expireDateObj;
    sub.status = expireDateObj > now;
    sub.autoRenew = true;
    sub.billingRetry = false;
    sub.inGracePeriod = false;
    sub.currencySymbol = currencySymbol;
    sub.amount = amount;
    sub.currency = currency;
    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    // Update user table
    if (sub.userId) {
      await userRepo.update(
        { _id: sub.userId },
        { isSubcription: true }
      );
    }

    // Add transaction history
    await transactionRepo.create({
      transactionUniqueId: trxUniqueId,
      userSubscriptionId: sub._id,
      userId: sub.userId,
      productId,
      transactionId: purchaseToken,
      originalTransactionId: baseOrderId,
      purchaseDate: purchaseDateObj,
      expireDate: expireDateObj,
      environment: NODE_ENV || 'production',
      transactionReason: 'RENEWAL',
      purchaseFrom: 'Google',
      status: sub?.status,
      amount: amount,
      currency: currency,
      currencySymbol
    });

    return sub;
  } catch (error) {
    console.error('Error handling subscription renewed:', error.message);
    throw error;
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(purchaseDetails) {
  try {
    const { baseOrderId, expiresDate } = purchaseDetails;

    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    if (!sub) {
      console.warn('Cancel: subscription not found');
      return;
    }

    const now = new Date();
    const expireDateObj = new Date(expiresDate);

    sub.autoRenew = false;
    sub.status = expireDateObj > now; // Still active until expiration

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error('Error handling subscription canceled:', error.message);
    throw error;
  }
}

/**
 * Handle subscription expiration
 */
async function handleSubscriptionExpired(purchaseDetails) {
  try {
    const { baseOrderId, expiresDate } = purchaseDetails;

    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    if (!sub) {
      console.warn('Expired: subscription not found');
      return;
    }

    const expireDateObj = new Date(expiresDate);

    sub.expireDate = expireDateObj;
    sub.status = false;
    sub.billingRetry = false;
    sub.inGracePeriod = false;
    sub.autoRenew = false;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    // Check if user has other active subscriptions
    const hasOtherActiveSub = await userSubscriptionRepo.findOne({
      userId: sub.userId,
      status: true,
      _id: { $ne: sub._id },
    });

    // Update user table only if no other active subscription
    if (!hasOtherActiveSub && sub.userId) {
      await userRepo.update(
        { _id: sub.userId },
        {
          isSubcription: false,
          subscriptionEndDate: expireDateObj,
        }
      );
      console.log(`User ${sub.userId} subscription expired - no active subs remaining`);
    } else {
      console.log(`User ${sub.userId} still has active subscription`);
    }

    return sub;
  } catch (error) {
    console.error('Error handling subscription expired:', error.message);
    throw error;
  }
}

/**
 * Handle subscription in grace period
 */
async function handleSubscriptionGracePeriod(purchaseDetails) {
  try {
    const { baseOrderId, expiresDate } = purchaseDetails;

    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    if (!sub) {
      console.warn('Grace period: subscription not found');
      return;
    }

    sub.inGracePeriod = true;
    sub.billingRetry = true;
    sub.status = true; // Keep active during grace period

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error('Error handling grace period:', error.message);
    throw error;
  }
}

/**
 * Handle subscription on hold
 */
async function handleSubscriptionOnHold(purchaseDetails) {
  try {
    const { baseOrderId } = purchaseDetails;

    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    if (!sub) {
      console.warn('On hold: subscription not found');
      return;
    }

    sub.status = false;
    sub.billingRetry = true;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error('Error handling subscription on hold:', error.message);
    throw error;
  }
}

/**
 * Handle subscription recovered
 */
async function handleSubscriptionRecovered(purchaseDetails) {
  try {
    const { baseOrderId, expiresDate } = purchaseDetails;

    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    if (!sub) {
      console.warn('Recovered: subscription not found');
      return;
    }

    const expireDateObj = new Date(expiresDate);

    sub.billingRetry = false;
    sub.inGracePeriod = false;
    sub.status = expireDateObj > new Date();

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    // Update user table
    if (sub.userId && sub.status) {
      await userRepo.update(
        { _id: sub.userId },
        { isSubcription: true }
      );
    }

    return sub;
  } catch (error) {
    console.error('Error handling subscription recovered:', error.message);
    throw error;
  }
}

/**
 * Handle subscription restarted
 */
async function handleSubscriptionRestarted(purchaseDetails) {
  return handleSubscriptionRenewed(purchaseDetails);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(purchaseDetails) {
  try {
    const { baseOrderId } = purchaseDetails;

    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    if (!sub) {
      console.warn('Paused: subscription not found');
      return;
    }

    sub.status = false;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error('Error handling subscription paused:', error.message);
    throw error;
  }
}

/**
 * Handle subscription revoked (refunded)
 */
async function handleSubscriptionRevoked(purchaseDetails) {
  try {
    const { baseOrderId } = purchaseDetails;

    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId: baseOrderId,
      purchaseFrom: 'Google',
    });

    if (!sub) {
      console.warn('Revoked: subscription not found');
      return;
    }

    sub.status = false;
    sub.autoRenew = false;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    // Update user table
    const hasOtherActiveSub = await userSubscriptionRepo.findOne({
      userId: sub.userId,
      status: true,
      _id: { $ne: sub._id },
    });

    if (!hasOtherActiveSub && sub.userId) {
      await userRepo.update(
        { _id: sub.userId },
        { isSubcription: false }
      );
    }

    return sub;
  } catch (error) {
    console.error('Error handling subscription revoked:', error.message);
    throw error;
  }
}

/**
 * Handle subscription deferred
 */
async function handleSubscriptionDeferred(purchaseDetails) {
  console.log('Subscription deferred - no action needed');
}

/**
 * Handle pause schedule changed
 */
async function handlePauseScheduleChanged(purchaseDetails) {
  console.log('Pause schedule changed - no action needed');
}

/**
 * Handle price change confirmed
 */
async function handlePriceChangeConfirmed(purchaseDetails) {
  console.log('Price change confirmed - no action needed');
}

module.exports = {
  verifyAndroid,
  acknowledgeSubscription,
  refundSubscription,
  handleGoogleNotification,
  fetchAndroidSubscriptions,
};