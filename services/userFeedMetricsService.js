
const userFeedMetricsRepo = require('../repositories/userFeedMetricsRepo');
const userLikeRepo = require('../repositories/userLikeRepo');
const userPassesRepo = require('../repositories/userPassesRepo');
const mongoose =require('mongoose');
const cron = require("node-cron");

/**
 * Boost new users so they get visibility early
 * Newer account → higher boost
 */
const handleFreshnessBoost = (accountAgeDays) => {
  if (accountAgeDays <= 3) return 2.5;
  if (accountAgeDays <= 7) return 2.0;
  if (accountAgeDays <= 14) return 1.5;
  if (accountAgeDays <= 30) return 1.2;
  return 1.0;
};

/**
 * Penalize inactive users
 * More days since last visit → lower multiplier
 */
const handleActivityPenalty = (daysSinceLastVisit) => {
  if (daysSinceLastVisit <= 1) return 1.0;
  if (daysSinceLastVisit <= 7) return 0.95;
  if (daysSinceLastVisit <= 14) return 0.85;
  if (daysSinceLastVisit <= 30) return 0.7;
  if (daysSinceLastVisit <= 60) return 0.4;
  return 0.2;
};


/**
 * Boost users who haven't received many likes
 * Prevents new / ignored profiles from dying
 */
const handleUnderExposureBoost = (likesReceived) => {
  if (likesReceived === 0) return 2.5;
  if (likesReceived <= 10) return 2.0;
  if (likesReceived <= 30) return 1.5;
  return 1.0;
};


/**
 * Penalize users who have too many pending likes
 * Pending likes = received - (given + passed)
 * Prevents queue hogging
 */
const handleQueuePenalty = (likesReceived, likesGiven, passesGiven) => {
  const pendingLikes = Math.max(
    0,
    likesReceived - (likesGiven + passesGiven)
  );

  if (pendingLikes >= 200) return 0.3;
  if (pendingLikes >= 100) return 0.5;
  if (pendingLikes >= 50) return 0.75;
  return 1.0;
};

/**
 * Engagement score based on actions
 * More likes & passes → slightly higher score
 * Caps applied to prevent abuse
 */
const handleEngagementScore = (likesGiven, passesGiven) => {
  let score = 1.0;
  score += Math.min(0.3, likesGiven * 0.01);
  score += Math.min(0.2, passesGiven * 0.005);
  return score;
};


/**
 * Calculates response rate
 * Used to predict likelihood of user responding
 */
const handleResponseRate = (likesReceived, likesGiven, passesGiven) => {
  if (likesReceived > 10) {
    return (likesGiven + passesGiven) / likesReceived;
  }
  return 0.5;
};


/**
 * Boost based on response likelihood
 * Higher response → more feed priority
 */
const handleResponseLikeliHoodBoost = (responseRate) => {
   if (responseRate >= 0.15) return 1.8;
  if (responseRate >= 0.10) return 1.5;
  if (responseRate >= 0.05) return 1.2;
  if (responseRate >= 0.02) return 0.9;
  return 0.7;
}


/**
 * Final feed score calculation
 * Combines all boosts & penalties
 */
const handleFinalScore = (
  priorityGroup,
  freshnessBoost,
  underexposureBoost,
  queuePenalty,
  activityPenalty,
  engagementScore,
  reponseLikeliHoodBoost
) => {
  return (
    (100 - priorityGroup * 10) *
    freshnessBoost *
    underexposureBoost *
    queuePenalty *
    activityPenalty *
    engagementScore *
    reponseLikeliHoodBoost
  );
};

/**
 * Main metrics handler
 * Calculates, stores, and updates feed metrics per user
 */
const handleMetrics = async (user) => {
  const {
    userId,
    createdAt,
    lastLogin,
    priorityGroup = 1
  } = user;

  const now = new Date();

  // Account age in days
  const accountAgeDays = Math.floor(
    (now - new Date(createdAt)) / 86400000
  );

   // Days since last login
  const daysSinceLastVisit = Math.floor(
    (now - new Date(lastLogin || createdAt)) / 86400000
  );

  // Fetch cached metrics if available
  let metrics = await userFeedMetricsRepo.findOne({ userId });

  let likesReceived = metrics?.likesReceived ?? 0;
  let likesGiven = metrics?.likesGiven ?? 0;
  let passesGiven = metrics?.passesGiven ?? 0;

 /**
   * If metrics not found:
   * Fetch counts directly from DB (first-time calculation)
   */
  if (!metrics) {
    const objectId = new mongoose.Types.ObjectId(userId);

    likesReceived = await userLikeRepo.count({
      toUserId: objectId,
      isDeleted: 0
    });

    likesGiven = await userLikeRepo.count({
      fromUserId: objectId,
      isDeleted: 0
    });

    passesGiven = await userPassesRepo.count({
      fromUserId: objectId,
      isDeleted: 0
    });
  }

  // Pending likes calculation
  const pendingLikes = Math.max(
    0,
    likesReceived - (likesGiven + passesGiven)
  );

  // Individual metric calculations
  const freshnessBoost = handleFreshnessBoost(accountAgeDays);
  const activityPenalty = handleActivityPenalty(daysSinceLastVisit);
  const underexposureBoost = handleUnderExposureBoost(likesReceived);
  const queuePenalty = handleQueuePenalty(
    likesReceived,
    likesGiven,
    passesGiven
  );
  const engagementScore = handleEngagementScore(
    likesGiven,
    passesGiven
  );

  const responseRate = handleResponseRate(
    likesReceived,
    likesGiven,
    passesGiven
  );

  const responseLikelihoodBoost =
    handleResponseLikeliHoodBoost(responseRate);

  const finalScore = handleFinalScore(
    priorityGroup,
    freshnessBoost,
    underexposureBoost,
    queuePenalty,
    activityPenalty,
    engagementScore,
    responseLikelihoodBoost
  );

   // Final feed ranking score
  const payload = {
    userId,
    likesReceived,
    likesGiven,
    passesGiven,
    pendingLikes,
    accountAgeDays,
    daysSinceLastVisit,
    freshnessBoost,
    activityPenalty,
    underexposureBoost,
    queuePenalty,
    engagementScore,
    responseRate,
    responseLikelihoodBoost,
    finalScore,
    accountCreatedAt: createdAt,
    lastLogin: (lastLogin || createdAt)
  };

   // Insert or update metrics
  if (!metrics) {
    await userFeedMetricsRepo.create(payload);
  } else {
    await userFeedMetricsRepo.update(
      { userId },
      { $set: payload }
    );
  }
};

const handleLike = async (fromUserId, toUserId, isPass = false) => {
  const fromId = mongoose.Types.ObjectId.createFromHexString(fromUserId);
  const toId = mongoose.Types.ObjectId.createFromHexString(toUserId);

  // ======================
  // FROM USER
  // ======================
  const fromInc = isPass
    ? { likesGiven: 1, passesGiven: -1 }
    : { likesGiven: 1 };

  const fromMetrics = await userFeedMetricsRepo.findOneAndUpdate(
    { userId: fromId },
    {
      $inc: fromInc,
      //$max: { passesGiven: 0 } // never negative
    },
    { new: true, upsert: true }
  );

  // recalc FROM user
  const engagementScore = handleEngagementScore(
    fromMetrics.likesGiven,
    fromMetrics.passesGiven
  );

  const responseRate = handleResponseRate(
    fromMetrics.likesReceived,
    fromMetrics.likesGiven,
    fromMetrics.passesGiven
  );

  const responseLikelihoodBoost =
    handleResponseLikeliHoodBoost(responseRate);

  const fromFinalScore = handleFinalScore(
    fromMetrics.priorityGroup || 1,
    fromMetrics.freshnessBoost || 1,
    fromMetrics.underexposureBoost || 1,
    fromMetrics.queuePenalty || 1,
    fromMetrics.activityPenalty || 1,
    engagementScore,
    responseLikelihoodBoost
  );

  await userFeedMetricsRepo.update(
    { userId: fromId },
    {
      $set: {
        engagementScore,
        responseRate,
        responseLikelihoodBoost,
        finalScore: fromFinalScore
      }
    }
  );

  // ======================
  // TO USER
  // ======================
  const toInc = isPass ? { likesReceived: 1 } : { likesReceived: 1 };


 // ======================
  //TO USER
  // ======================

      
  const toMetrics = await userFeedMetricsRepo.findOneAndUpdate(
    { userId: toId },
    { $inc: toInc },
    { new: true, upsert: true }
  );

  const pendingLikes = Math.max(
    0,
    toMetrics.likesReceived -
      (toMetrics.likesGiven + toMetrics.passesGiven)
  );

  const underexposureBoost =
    handleUnderExposureBoost(toMetrics.likesReceived);

  const queuePenalty = handleQueuePenalty(
    toMetrics.likesReceived,
    toMetrics.likesGiven,
    toMetrics.passesGiven
  );

  const toResponseRate = handleResponseRate(
    toMetrics.likesReceived,
    toMetrics.likesGiven,
    toMetrics.passesGiven
  );

  const toResponseLikelihoodBoost =
    handleResponseLikeliHoodBoost(toResponseRate);

  const toFinalScore = handleFinalScore(
    toMetrics.priorityGroup || 1,
    toMetrics.freshnessBoost || 1,
    underexposureBoost,
    queuePenalty,
    toMetrics.activityPenalty || 1,
    toMetrics.engagementScore || 1,
    toResponseLikelihoodBoost
  );

  await userFeedMetricsRepo.update(
    { userId: toId },
    {
      $set: {
        pendingLikes,
        underexposureBoost,
        queuePenalty,
        responseRate: toResponseRate,
        responseLikelihoodBoost: toResponseLikelihoodBoost,
        finalScore: toFinalScore
      }
    }
  );
};

const handlePass = async (fromUserId, toUserId, isLike = false) => {
  const fromId = mongoose.Types.ObjectId.createFromHexString(fromUserId);
  const toId = mongoose.Types.ObjectId.createFromHexString(toUserId);

  // ======================
  // FROM USER
  // ======================
  // FROM USER
  // ======================
  const fromInc = isLike
    ? { passesGiven: 1, likesGiven: -1 }
    : { passesGiven: 1 };

  let metrics = await userFeedMetricsRepo.findOneAndUpdate(
    { userId: fromId },
    {
      $inc: fromInc,
      // $max: { likesGiven: 0 } // never negative
    },
    { new: true, upsert: true }
  );
  


  const pendingLikes = Math.max(
    0,
    metrics.likesReceived -
      (metrics.likesGiven + metrics.passesGiven)
  );

  const queuePenalty = handleQueuePenalty(
    metrics.likesReceived,
    metrics.likesGiven,
    metrics.passesGiven
  );

  const engagementScore = handleEngagementScore(
    metrics.likesGiven,
    metrics.passesGiven
  );

  const responseRate = handleResponseRate(
    metrics.likesReceived,
    metrics.likesGiven,
    metrics.passesGiven
  );

  const responseLikelihoodBoost =
    handleResponseLikeliHoodBoost(responseRate);

  const finalScore = handleFinalScore(
    metrics.priorityGroup || 1,
    metrics.freshnessBoost || 1,
    metrics.underexposureBoost || 1,
    queuePenalty,
    metrics.activityPenalty || 1,
    engagementScore,
    responseLikelihoodBoost
  );

  await userFeedMetricsRepo.update(
    { userId: fromId },
    {
      $set: {
        pendingLikes,
        queuePenalty,
        engagementScore,
        responseRate,
        responseLikelihoodBoost,
        finalScore
      }
    }
  );

  // ======================
  // TO USER (LIKE → PASS case)
  // ======================
  if (isLike) {
    await userFeedMetricsRepo.findOneAndUpdate(
      { userId: toId },
      {
        $inc: { likesReceived: -1 },
      }
    );
  }
};


const handleLastLoginVisit = async (lastLogin, userId) => {
   const users = await userFeedMetricsRepo.findOne({userId: mongoose.Types.ObjectId.createFromHexString(userId)});
    if(!users) return
   const now = new Date();

   const daysSinceLastVisit = Math.floor((now - new Date(lastLogin || users.accountCreatedAt)) / 86400000);

   const activityPenalty = handleActivityPenalty(daysSinceLastVisit);

   const finalScore = handleFinalScore(
        users?.priorityGroup || 1,
        users?.freshnessBoost,
        users.underexposureBoost || 1,
        users.queuePenalty || 1,
        activityPenalty,
        users.engagementScore || 1,
        users.responseLikelihoodBoost || 0.7
      );

      await userFeedMetricsRepo.update(
        { _id: users._id },
        {
          $set: {
            lastLogin,
            daysSinceLastVisit,
            activityPenalty,
            finalScore
          }
        }
      );
}

cron.schedule("30 0 * * *", async () => {
  console.log(" Daily feed metrics cron started");
  let page = 1;
  const order = {_id: -1}
  const limit = 100;

  const now = new Date();
   while(true){
    let offset = (page - 1) * limit

    // fetch only active users
    const users = await userFeedMetricsRepo.findAllPagination({
      userId: { $exists: true }},{order, limit, offset});
    console.log(users.length,'users')

    if (!users.length) break;

    for (const m of users) {
      const accountAgeDays = Math.floor(
        (now - new Date(m.accountCreatedAt)) / 86400000
      );

      const daysSinceLastVisit = Math.floor(
        (now - new Date(m.lastLogin || m.accountCreatedAt)) / 86400000
      );

      const freshnessBoost = handleFreshnessBoost(accountAgeDays);
      const activityPenalty = handleActivityPenalty(daysSinceLastVisit);

      const finalScore = handleFinalScore(
        m.priorityGroup || 1,
        freshnessBoost,
        m.underexposureBoost || 1,
        m.queuePenalty || 1,
        activityPenalty,
        m.engagementScore || 1,
        m.responseLikelihoodBoost || 1
      );

      await userFeedMetricsRepo.update(
        { _id: m._id },
        {
          $set: {
            accountAgeDays,
            daysSinceLastVisit,
            freshnessBoost,
            activityPenalty,
            finalScore
          }
        }
      );
  }
  page++;

  }

  console.log("✅ Daily feed metrics cron finished");
});


module.exports = {
    handleMetrics,
    handleLike,
    handlePass,
    handleLastLoginVisit
}