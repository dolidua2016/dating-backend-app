const {verifyIOS } = require('./appleService')
const {verifyAndroid} = require('./androidService');

const transactionRepo = require("../repositories/transactionRepo");
const userSubscriptionRepo = require("../repositories/userSubscriptionRepo");
const {generateTransactionId} = require("../helpers/transactionIdGenerate");



/**
 * Validate incoming request
 */
function validateRequest({ transactionId, type, purchaseToken, productId }) {
  if (!transactionId && type === 'apple') return "transactionId missing";
  if (!type) return "type (apple/android) missing";
  if (type !== 'apple' && type !== 'android') return "Invalid type. Use 'apple' or 'android'";
  
  if (type === 'android') {
    if (!purchaseToken) return "purchaseToken missing for Android";
    if (!productId) return "productId missing for Android";
  }
  
  return null;
}

/**
 * Verify purchase based on platform
 */
async function verifyPurchase(type, { transactionId, purchaseToken, productId, userId }) {
  if (type === 'apple') {
    const result =  await verifyIOS(transactionId);
    return result ? { ...result, isValid: true } : { isValid: false };
  } else {
    const result =  await verifyAndroid(purchaseToken, userId); //productId, 
    console.log(result,'result      common ------ 35 -----------')
    return result ? { ...result, isValid: result.isValid !== false } : { isValid: false };
  }
}

/**
 * Normalize transaction data from different platforms
 */
function normalizeTransactionData(verificationResult, userId, type, additionalData) {
  const isApple = type === 'apple';
  
  const purchaseDate = isApple 
    ? (verificationResult.purchaseDate ? new Date(verificationResult.purchaseDate) : null)
    : (verificationResult.purchaseDate ? new Date(parseInt(verificationResult.purchaseDate)) : null);
    
  const expiresDate = isApple
    ? (verificationResult.expiresDate ? new Date(verificationResult.expiresDate) : null)
    : (verificationResult.expiresDate ? new Date(parseInt(verificationResult.expiresDate)) : null);

  const amount = isApple
    ? verificationResult.price ? verificationResult.price / 1000 : 0
    :  verificationResult.priceAmountMicros ; //(verificationResult.priceAmountMicros ? verificationResult.priceAmountMicros / 1000000 : 0);

  const currency = isApple
    ? verificationResult.currency
    : (verificationResult.priceCurrencyCode || 'USD');

  const basePayload = {
    userId,
    productId: isApple ? verificationResult.productId : additionalData.productId,
    transactionId: isApple ? verificationResult.transactionId : (verificationResult.orderId || additionalData.transactionId),
    amount,
    currency,
    purchaseDate,
    expireDate: expiresDate,
    environment: verificationResult.environment || 'production',
    purchaseFrom: isApple ? 'Apple' : 'Google',
    status: verificationResult.isActive
  };

  if (isApple) {
    return {
      ...basePayload,
      originalTransactionId: verificationResult.originalTransactionId,
      appTransactionId: verificationResult.appTransactionId,
      transactionReason: verificationResult?.transactionReason,
      billingRetry: verificationResult.billingRetry,
      inGracePeriod: verificationResult.inGracePeriod
    };
  } else {
    return {
      ...basePayload,
      purchaseToken: additionalData.purchaseToken,
      autoRenew: verificationResult.autoRenewing || false,
      acknowledgementState: verificationResult.acknowledgementState
    };
  }
}

/**
 * Process transaction - create or update
 */
async function processTransaction(normalizedData, userId) {
  const isApple = normalizedData.purchaseFrom === 'Apple';
  
  // Build query for finding existing transaction
  const existingQuery = isApple
    ? { transactionId: normalizedData.transactionId }
    : { 
        $or: [
          { originalTransactionId: normalizedData.transactionId },
          { purchaseToken: normalizedData.purchaseToken }
        ]
      };

  let existingTransaction = await transactionRepo.findOne(existingQuery);
  if (existingTransaction) {
    // Update existing transaction
    return await updateExistingTransaction(existingTransaction, normalizedData, userId, isApple);
  } else {
    // Create new transaction
    return await createNewTransaction(normalizedData, userId, isApple);
  }
}

/**
 * Update existing transaction and subscription
 */
async function updateExistingTransaction(existingTransaction, normalizedData, userId, isApple) {
  // Update transaction fields
  Object.assign(existingTransaction, {
    amount: normalizedData.amount,
    currency: normalizedData.currency,
    expireDate: normalizedData.expireDate,
    purchaseDate: normalizedData.purchaseDate,
    environment: normalizedData.environment,
    productId: normalizedData.productId,
    userId: userId
  });

  if (!isApple) {
    existingTransaction.autoRenew = normalizedData.autoRenewing;
  }

  await transactionRepo.update({ _id: existingTransaction._id }, existingTransaction);

  // Find or create user subscription
  const subscriptionQuery = buildSubscriptionQuery(normalizedData, userId, isApple);
  console.log(subscriptionQuery,'subscriptionQuery=======-- 145 common')
  let userSubscription = await userSubscriptionRepo.findOne(subscriptionQuery);
  console.log(userSubscription,'userSubscription ======== 147 common')
  if (!userSubscription) {
    userSubscription = await createSubscription(normalizedData, userId, isApple);
  } else {
    await updateSubscription(userSubscription, normalizedData, isApple, userId);
  }

  return {
    isNew: false,
    data: {
      transaction: existingTransaction,
      subscription: userSubscription,
      verifyData: normalizedData
    }
  };
}

/**
 * Create new transaction and subscription
 */
async function createNewTransaction(normalizedData, userId, isApple) {
  const trxUniqueId = generateTransactionId();
  
  // Create user subscription
  const createdUserSubscription = await createSubscription(normalizedData, userId, isApple);

  // Create transaction
  const transactionData = {
    userId,
    userSubscriptionId: createdUserSubscription._id,
    productId: normalizedData.productId,
    transactionId: normalizedData.transactionId,
    transactionUniqueId: trxUniqueId,
    amount: normalizedData.amount,
    currency: normalizedData.currency,
    purchaseDate: normalizedData.purchaseDate,
    expireDate: normalizedData.expireDate,
    environment: normalizedData.environment,
    purchaseFrom: normalizedData.purchaseFrom,
    status: normalizedData.status,
    currencySymbol: normalizedData.currencySymbol,
  };

  if (isApple) {
    Object.assign(transactionData, {
      originalTransactionId: normalizedData.originalTransactionId,
      appTransactionId: normalizedData.appTransactionId,
      transactionReason: normalizedData.transactionReason
    });
  } else {
    Object.assign(transactionData, {
      purchaseToken: normalizedData.purchaseToken,
      autoRenew: normalizedData.autoRenewing
    });
  }

  const createdTransaction = await transactionRepo.create(transactionData);

  // Deactivate other active subscriptions
  await userSubscriptionRepo.update(
    {
      userId,
      _id: { $ne: createdUserSubscription._id },
      isActive: true,
      productId: normalizedData.productId
    },
    { $set: { isActive: false } }
  );

  return {
    isNew: true,
    data: {
      transaction: createdTransaction,
      subscription: createdUserSubscription,
      verifyData: normalizedData
    }
  };
}

/**
 * Build subscription query based on platform
 */
function buildSubscriptionQuery(normalizedData, userId, isApple) {
  const baseQuery = {
    //userId,
    productId: normalizedData.productId,
    purchaseFrom: normalizedData.purchaseFrom
  };

  if (isApple) {
    return {
      $and: [
        { originalTransactionId: normalizedData.originalTransactionId },
        baseQuery
      ]
    };
  } else {
    return {
      $and: [
        { originalTransactionId: normalizedData.transactionId },
        { purchaseToken: normalizedData.purchaseToken },
        baseQuery
      ]
    };
  }
}

/**
 * Create new subscription
 */
async function createSubscription(normalizedData, userId, isApple) {
  console.log('common ------------------------- 255')
  const subscriptionData = {
    userId,
    productId: normalizedData.productId,
    originalTransactionId: normalizedData.transactionId,
    amount: normalizedData.amount,
    currency: normalizedData.currency,
    purchaseDate: normalizedData.purchaseDate,
    expireDate: normalizedData.expireDate,
    purchaseFrom: normalizedData.purchaseFrom,
    status: normalizedData.status,
    latestTransactionId: normalizedData.transactionId,
    
  };

  if (isApple) {
    Object.assign(subscriptionData, {
      originalTransactionId: normalizedData.originalTransactionId,
      appTransactionId: normalizedData.appTransactionId,
      transactionReason: normalizedData.transactionReason,
      billingRetry: normalizedData.billingRetry,
      inGracePeriod: normalizedData.inGracePeriod
    });
  } else {
    Object.assign(subscriptionData, {
      purchaseToken: normalizedData.purchaseToken,
      autoRenew: normalizedData.autoRenewing
    });
  }

  return await userSubscriptionRepo.create(subscriptionData);
}

/**
 * Update existing subscription
 */
async function updateSubscription(subscription, normalizedData, isApple, userId) {
  console.log(' common ------------------------------------------ 290')
  subscription.expireDate = normalizedData.expireDate;
  subscription.purchaseDate = normalizedData.purchaseDate;
  subscription.status = normalizedData.status;
  subscription.userId = userId;
  subscription.amount = normalizedData.amount;
  subscription.currency = normalizedData.currency;

  // if (!isApple) {
  //   subscription.autoRenewing = normalizedData.autoRenewing;
  // }

  if (isApple) {
    Object.assign(subscription, {
       autoRenew : normalizedData.autoRenewing
    });
  } else {
    Object.assign(subscription, {
      purchaseToken: normalizedData.purchaseToken,
      autoRenew: normalizedData.autoRenewing
    });
  }

  await userSubscriptionRepo.update({ _id: subscription._id }, subscription);
  return subscription;
}


module.exports = {
  validateRequest,
  verifyPurchase,
  normalizeTransactionData,
  processTransaction
}


