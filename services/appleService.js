const axios = require("axios");
const generateJwt = require("../helpers/appleJwtGenerator");
const transactionRepo = require("../repositories/transactionRepo");
const userSubscriptionRepo = require("../repositories/userSubscriptionRepo");
const jwt = require("jsonwebtoken");
const userRepo = require("../repositories/userRepo");

const {
  KEY_ID,
  ISSUER_ID,
  AUTHKEY_PATH,
  NODE_ENV,
  APPLE_SUBSCRIPTION_GROUP_ID,
} = process.env;

const baseUrl =
  NODE_ENV === "sandbox"
    ? "https://api.storekit-sandbox.itunes.apple.com"
    : "https://api.storekit.itunes.apple.com";

/**
 * Verify an iOS in-app purchase transaction
 * @param {string} transactionId - The transaction ID to verify
 * @returns {Object} Parsed transaction details
 */
async function verifyIOS(transactionId) {
  try {
    const token = generateJwt(KEY_ID, ISSUER_ID, AUTHKEY_PATH);
    const url = `${baseUrl}/inApps/v1/transactions/${transactionId}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const { signedTransactionInfo, signedRenewalInfo } = response.data;

    // Decode signed transaction
    const trx = jwt.decode(signedTransactionInfo);
    if (!trx) {
      throw new Error("Failed to decode transaction info");
    }

    // Decode renewal info (may be null depending on purchase)
    const renewal = signedRenewalInfo ? jwt.decode(signedRenewalInfo) : null;

    const now = Date.now();
    const expiresDate = Number(trx.expiresDate);
    const purchaseDate = Number(trx.purchaseDate);

    return {
      productId: trx.productId,
      transactionId: trx.transactionId,
      originalTransactionId: trx.originalTransactionId,
      appTransactionId: trx.appTransactionId,
      purchaseDate,
      expiresDate,
      now,
      price: trx.price,
      currency: trx.currency,
      transactionReason: trx.transactionReason,
      environment: trx.environment,
      isActive: expiresDate > now,
      autoRenewStatus: renewal?.autoRenewStatus ?? null,
      billingRetry: renewal?.isInBillingRetryPeriod ?? false,
      inGracePeriod: renewal?.gracePeriodExpiresDate
        ? Number(renewal.gracePeriodExpiresDate) > now
        : false,
      renewalInfo: renewal,
      rawTransaction: trx,
    };
  } catch (error) {
    console.error("Error verifying iOS transaction:", error.message);
    throw new Error(`Failed to verify transaction ${transactionId}: ${error.message}`);
  }
}

/**
 * Fetch In-App Purchases for App
 * @returns {Array} List of subscription products
 */
async function fetchInAppSubscription() {
  try {
    if (!APPLE_SUBSCRIPTION_GROUP_ID) {
      throw new Error("APPLE_SUBSCRIPTION_GROUP_ID environment variable is required");
    }

    const token = generateJwt(KEY_ID, ISSUER_ID, AUTHKEY_PATH);
    const url = `https://api.appstoreconnect.apple.com/v1/subscriptionGroups/${APPLE_SUBSCRIPTION_GROUP_ID}/subscriptions`;

    console.log(url, "url");

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response.data;
    const subscriptionList = formatSubscriptionList(data);

    return subscriptionList;
  } catch (error) {
    console.error("Error fetching IAP list:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Format Apple subscription list data
 * @param {Object} data - Raw data from Apple API
 * @returns {Array} Formatted subscription list
 */
function formatSubscriptionList(data) {
  return data.data
    .filter((item) => item.attributes?.state === "READY_TO_SUBMIT")
    .map((item) => ({
      id: item.id,
      name: item.attributes.name,
      productId: item.attributes.productId,
      state: item.attributes?.state, // 
    }));
}

/**
 * Handle Apple App Store Server Notifications
 * @param {string} notificationType - Type of notification
 * @param {string} subtype - Notification subtype
 * @param {Object} data - Notification data
 */
async function handleAppleNotification(notificationType, subtype, data) {
  try {
    if (notificationType === "TEST") {
      console.log("Apple TEST notification received");
      return;
    }

    if (!data?.signedTransactionInfo) {
      console.log("No signedTransactionInfo");
      return;
    }

    const transactionInfo = decodeJWSPayload(data.signedTransactionInfo);
    const renewalInfo = data.signedRenewalInfo
      ? decodeJWSPayload(data.signedRenewalInfo)
      : null;

    console.log(notificationType, "notificationType-------------->");
    console.log("transactionInfo ---->", transactionInfo);
    console.log("renewalInfo ---->", renewalInfo);

    const {
      productId,
      transactionId,
      originalTransactionId,
      purchaseDate,
      expiresDate,
      transactionReason,
      environment,
    } = transactionInfo;

    switch (notificationType) {
      case "INITIAL_BUY":
        await createOrUpdateSubscriptionFromApple({
          productId,
          transactionId,
          originalTransactionId,
          purchaseDate,
          expiresDate,
          environment,
          transactionReason,
        });
        break;

      case "DID_RENEW":
        await markSubscriptionRenewed({
          productId,
          transactionId,
          originalTransactionId,
          purchaseDate: purchaseDate || Date.now(),
          expiresDate,
          environment,
          transactionReason: "RENEWAL",
        });
        break;

      case "DID_FAIL_TO_RENEW":
        await markBillingRetry({
          originalTransactionId,
          expiresDate,
          renewalInfo,
        });
        break;

      case "GRACE_PERIOD":
        await markGracePeriod({
          originalTransactionId,
          renewalInfo,
        });
        break;

      case "DID_RECOVER":
        await clearBillingRetry({
          originalTransactionId,
          expiresDate,
        });
        break;

      case "GRACE_PERIOD_EXPIRED":
      case "EXPIRED":
        await markSubscriptionExpired({
          originalTransactionId,
          expiresDate,
        });
        break;

      case "DID_CHANGE_RENEWAL_STATUS":
        await processRenewalStatusChange({
          originalTransactionId,
          renewalInfo,
        });
        break;

      default:
        console.log("Unhandled notificationType:", notificationType);
    }
  } catch (error) {
    console.error("Error handling Apple notification:", error.message);
    throw error;
  }
}

/**
 * Decode JWS payload from Apple
 * @param {string} jws - JWS token
 * @returns {Object} Decoded payload
 */
function decodeJWSPayload(jws) {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWS");

  const payloadJson = Buffer.from(parts[1], "base64").toString("utf8");
  return JSON.parse(payloadJson);
}

/**
 * Create or update subscription from Apple transaction
 */
async function createOrUpdateSubscriptionFromApple({
  userId,
  productId,
  transactionId,
  originalTransactionId,
  purchaseDate,
  expiresDate,
  environment,
  transactionReason,
}) {
  try {
    let sub = await userSubscriptionRepo.findOne({
      originalTransactionId,
      purchaseFrom: "Apple",
    });

    console.log("Found existing Apple subscription: 733", sub);

    const now = new Date();
    const expireDateObj = new Date(Number(expiresDate));
    const purchaseDateObj = new Date(Number(purchaseDate));

    if (!sub) {
      // CREATE new subscription
      const newSub = {
        userId: userId || null,
        productId,
        originalTransactionId,
        latestTransactionId: transactionId,
        purchaseDate: purchaseDateObj,
        expireDate: expireDateObj,
        environment,
        purchaseFrom: "Apple",
        status: expireDateObj > now,
        autoRenew: true,
        billingRetry: false,
        inGracePeriod: false,
      };

      console.log("Creating new Apple subscription:", newSub);
      const created = await userSubscriptionRepo.create(newSub);

      // Add transaction history
      await transactionRepo.create({
        userSubscriptionId: created._id,
        userId: created.userId,
        productId,
        transactionId,
        originalTransactionId,
        purchaseDate: purchaseDateObj,
        expireDate: expireDateObj,
        environment,
        transactionReason,
        purchaseFrom: "Apple",
        status: newSub?.status
      });

      return created;
    }

    // UPDATE existing subscription
    sub.latestTransactionId = transactionId;
    sub.purchaseDate = purchaseDateObj;
    sub.expireDate = expireDateObj;
    sub.environment = environment;
    sub.status = expireDateObj > now;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    // Add transaction history
    await transactionRepo.create({
      userSubscriptionId: sub._id,
      userId: sub.userId,
      productId,
      transactionId,
      originalTransactionId,
      purchaseDate: purchaseDateObj,
      expireDate: expireDateObj,
      environment,
      transactionReason,
      purchaseFrom: "Apple",
      status: sub.status
    });

    return sub;
  } catch (error) {
    console.error("Error creating/updating Apple subscription:", error.message);
    throw error;
  }
}

/**
 * Mark subscription as renewed
 */
async function markSubscriptionRenewed({
  userId,
  productId,
  transactionId,
  originalTransactionId,
  purchaseDate,
  expiresDate,
  environment,
  transactionReason,
}) {
  try {
    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId,
      purchaseFrom: "Apple",
    });

    console.log(sub, "sub renewed===========");

    if (!sub) {
      console.warn("Renew: subscription not found, creating new");
      return await createOrUpdateSubscriptionFromApple({
        productId,
        transactionId,
        originalTransactionId,
        purchaseDate,
        expiresDate,
        environment,
        transactionReason: "RENEWAL",
      });
    }

    const now = new Date();
    const expireDateObj = new Date(Number(expiresDate));
    const purchaseDateObj = new Date(Number(purchaseDate));

    // Update subscription
    sub.latestTransactionId = transactionId;
    sub.expireDate = expireDateObj;
    sub.status = expireDateObj > now;
    sub.autoRenew = true;
    sub.billingRetry = false;
    sub.inGracePeriod = false;
    sub.gracePeriodExpiresDate = null;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    // Add transaction history
    await transactionRepo.create({
      userSubscriptionId: sub._id,
      userId: sub.userId,
      productId: sub.productId,
      transactionId,
      originalTransactionId,
      purchaseDate: purchaseDateObj,
      expireDate: expireDateObj,
      environment,
      transactionReason: "RENEWAL",
      purchaseFrom: "Apple",
      status: sub.status
    });

    return sub;
  } catch (error) {
    console.error("Error marking subscription renewed:", error.message);
    throw error;
  }
}

/**
 * Mark subscription as expired
 */
async function markSubscriptionExpired({ originalTransactionId, expiresDate }) {
  try {
    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId,
      purchaseFrom: "Apple",
    });

    if (!sub) {
      console.warn("Expired: subscription not found");
      return;
    }

    const expireDateObj = expiresDate ? new Date(Number(expiresDate)) : new Date();

    sub.expireDate = expireDateObj;
    sub.status = false;
    sub.billingRetry = false;
    sub.inGracePeriod = false;
    sub.gracePeriodExpiresDate = null;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);
    const hasOtherActiveSub = await userSubscriptionRepo.findOne({
      userId: sub.userId,
      status: true,
      _id: { $ne: sub._id },
    })

    if (!hasOtherActiveSub) {
      await userRepo.update(
        { _id: sub.userId },
        {
          isSubcription: false,
          subscriptionEndDate: expireDateObj,
        },
      );
      console.log(`User ${sub.userId} subscription expired - no active subs remaining`);
    } else {
      console.log(`User ${sub.userId} still has active subscription`);
    }
    return sub;
  } catch (error) {
    console.error("Error marking subscription expired:", error.message);
    throw error;
  }
}

/**
 * Process renewal status change (auto-renew on/off)
 */
async function processRenewalStatusChange({ originalTransactionId, renewalInfo }) {
  try {
    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId,
      purchaseFrom: "Apple",
    });

    if (!sub) {
      console.warn("Renewal status change: subscription not found");
      return;
    }

    if (renewalInfo.autoRenewStatus === 0) {
      sub.autoRenew = false;
    } else if (renewalInfo.autoRenewStatus === 1) {
      sub.autoRenew = true;
    }

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error("Error processing renewal status change:", error.message);
    throw error;
  }
}

/**
 * Mark subscription in billing retry state
 */
async function markBillingRetry({ originalTransactionId, expiresDate, renewalInfo }) {
  try {
    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId,
      purchaseFrom: "Apple",
    });

    if (!sub) {
      console.warn("Billing retry: subscription not found");
      return;
    }

    const now = new Date();
    const expireDateObj = new Date(Number(expiresDate));

    sub.billingRetry = true;
    sub.inGracePeriod = renewalInfo?.gracePeriodExpiresDate
      ? new Date(Number(renewalInfo.gracePeriodExpiresDate)) > now
      : false;
    sub.status = expireDateObj > now;

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error("Error marking billing retry:", error.message);
    throw error;
  }
}

/**
 * Clear billing retry state after successful recovery
 */
async function clearBillingRetry({ originalTransactionId, expiresDate }) {
  try {
    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId,
      purchaseFrom: "Apple",
    });

    if (!sub) {
      console.warn("Clear billing retry: subscription not found");
      return;
    }

    const expireDateObj = new Date(Number(expiresDate));

    sub.billingRetry = false;
    sub.inGracePeriod = false;
    sub.gracePeriodExpiresDate = null;
    sub.status = expireDateObj > new Date();

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error("Error clearing billing retry:", error.message);
    throw error;
  }
}

/**
 * Mark subscription in grace period
 */
async function markGracePeriod({ originalTransactionId, renewalInfo }) {
  try {
    const sub = await userSubscriptionRepo.findOne({
      originalTransactionId,
      purchaseFrom: "Apple",
    });

    if (!sub) {
      console.warn("Grace period: subscription not found");
      return;
    }

    sub.inGracePeriod = true;
    sub.billingRetry = true;
    sub.status = true;

    if (renewalInfo?.gracePeriodExpiresDate) {
      sub.gracePeriodExpiresDate = new Date(Number(renewalInfo.gracePeriodExpiresDate));
    }

    await userSubscriptionRepo.update({ _id: sub._id }, sub);

    return sub;
  } catch (error) {
    console.error("Error marking grace period:", error.message);
    throw error;
  }
}

module.exports = {
  verifyIOS,
  fetchInAppSubscription,
  handleAppleNotification,
};

