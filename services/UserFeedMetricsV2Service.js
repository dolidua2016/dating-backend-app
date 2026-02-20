const userFeedMetricsRepo = require('../repositories/userFeedMetricsRepo');
const userLikeRepo = require('../repositories/userLikeRepo');
const userPassesRepo = require('../repositories/userPassesRepo');
const mongoose = require('mongoose');
const cron = require('node-cron');
const globaFeedStatsRepo = require('../repositories/globaFeedStatsRepo')
const ALGO_VERSION = 'v2.1';
const UserFeedMetrics = require('../models/userFeedMetrics');

// ===============================
// GLOBAL FEED STATS CACHE (IN-MEMORY)
// ===============================
let GLOBAL_FEED_STATS = {
  male: {
    avgPendingLikes: 40,
    p25LikesReceived: 10,
    p50LikesReceived: 30,
    p75LikesReceived: 70
  },
  female: {
    avgPendingLikes: 15,
    p25LikesReceived: 5,
    p50LikesReceived: 12,
    p75LikesReceived: 25
  }
};



// ===============================
// INIT GLOBAL FEED STATS
// ===============================
async function initGlobalFeedStats() {
  const statsList = await globaFeedStatsRepo.findAll({
    key: 'GLOBAL_FEED_STATS'
  });

  statsList.forEach(s => {
    GLOBAL_FEED_STATS[s.gender] = {
      avgPendingLikes: s.avgPendingLikes,
      p25LikesReceived: s.p25LikesReceived,
      p50LikesReceived: s.p50LikesReceived,
      p75LikesReceived: s.p75LikesReceived
    };
  });

  console.log('✅ Global Feed Stats Loaded', GLOBAL_FEED_STATS);
}

const getGlobalFeedStats = (gender = 'male') =>
  GLOBAL_FEED_STATS[gender] || GLOBAL_FEED_STATS.male;


// ===============================
// UTILS
// ===============================
const DAY = 86400000; //Number of milliseconds in one day (24 * 60 * 60 * 1000)
const clamp = (v) => Math.max(0, v); //  Prevents negative values in counters like likesGiven, passesGiven, pendingLikes

// Calculates the full number of days between two Date objects
// Example: daysBetween(now, lastLogin) → how many days user has been inactive
const daysBetween = (a, b) => Math.floor((a - b) / DAY);


// Applies exponential decay to reduce the impact of old/inactive data
// More inactive days → smaller decay value
// Used to discount old pending likes so inactive users don’t get unfair penalties
// Example: 
//  0 days  → 1.0   (no decay)
//  30 days → ~0.37
//  60 days → ~0.14
const timeDecay = (days) => Math.exp(-days / 30);

// ===============================
// BOOST & PENALTY HANDLERS
// ===============================

/**
 * Boost new users so they get visibility early
 * Newer account → higher boost
 */
const handleFreshnessBoost = (days) => {
  if (days <= 3) return 2.5;
  if (days <= 7) return 2.0;
  if (days <= 14) return 1.5;
  if (days <= 30) return 1.2;
  return 1.0;
};

/**
 * Penalize inactive users
 * More days since last visit → lower multiplier
 */
const handleActivityPenalty = (days) => {
  if (days <= 1) return 1.0;
  if (days <= 7) return 0.95;
  if (days <= 14) return 0.85;
  if (days <= 30) return 0.7;
  if (days <= 60) return 0.4;
  return 0.2;
};


/**
 * Boost users who haven't received many likes
 * Prevents new / ignored profiles from dying
 */
const handleUnderExposureBoost = (likes, stats) => {
  if (likes <= stats.p25LikesReceived) return 2.0;
  if (likes <= stats.p50LikesReceived) return 1.5;
  if (likes <= stats.p75LikesReceived) return 1.2;
  return 1.0;
};

/**
 * Penalize users who have too many pending likes
 * Pending likes = received - (given + passed)
 * Prevents queue hogging
 */
const handleQueuePenalty = (pending, daysInactive, stats) => {
  const effective = pending * timeDecay(daysInactive);
  const ratio = effective / stats.avgPendingLikes;

  if (ratio >= 4) return 0.3;
  if (ratio >= 2.5) return 0.5;
  if (ratio >= 1.5) return 0.75;
  return 1.0;
};


/**
 * Engagement score based on actions
 * More likes & passes → slightly higher score
 * Caps applied to prevent abuse
 */

const handleEngagementScore = (likes, passes) => {
  return (
    1 +
    Math.min(0.3, likes * 0.01) +
    Math.min(0.2, passes * 0.005)
  );
};

/**
 * Calculates response rate
 * Used to predict likelihood of user responding
 */
const handleResponseRate = (received, given, passed) => {
  if (received > 10) return (given + passed) / received;
  return 0.5;
};


/**
 * Boost based on response likelihood
 * Higher response → more feed priority
 */
const handleResponseBoost = (rate) => {
  if (rate >= 0.15) return 1.8;
  if (rate >= 0.10) return 1.5;
  if (rate >= 0.05) return 1.2;
  if (rate >= 0.02) return 0.9;
  return 0.7;
};

/**
 * Final feed score calculation
 * Combines all boosts & penalties
 */

const handleFinalScore = (
  priority,
  freshness,
  exposure,
  queue,
  activity,
  engagement,
  response
) =>
  (100 - priority * 10) *
  freshness *
  exposure *
  queue *
  activity *
  engagement *
  response;

// const normalize = (value, max = 2.5) =>
//   Math.min(value / max, 1); // 0 – 1

// const priorityScore = (priority) =>
//   (100 - priority * 10) / 100; // 0 – 1

// const handleFinalScore = (
//   priority,
//   freshness,
//   exposure,
//   queue,
//   activity,
//   engagement,
//   response
// ) => {
//   const base = priorityScore(priority);

//   const finalScore =
//     base *
//     normalize(freshness) *
//     normalize(exposure) *
//     normalize(queue) *
//     normalize(activity) *
//     normalize(engagement) *
//     normalize(response);

//   return Math.round(finalScore * 100); // 0–100%
// };


// ===============================
// MAIN METRICS CALCULATOR
// ===============================
const calculateMetrics = (user, metrics) => {
  const now = new Date();
  const stats = getGlobalFeedStats(user.gender);

  const accountAgeDays = daysBetween(now, new Date(user.createdAt));
  const daysInactive = daysBetween(
    now,
    new Date(user.lastLogin || user.createdAt)
  );

  const likesReceived = clamp(metrics.likesReceived || 0);
  const likesGiven = clamp(metrics.likesGiven || 0);
  const passesGiven = clamp(metrics.passesGiven || 0);

  const pendingLikes = clamp(
    likesReceived - (likesGiven + passesGiven)
  );

  const freshnessBoost = handleFreshnessBoost(accountAgeDays);
  const activityPenalty = handleActivityPenalty(daysInactive);
  const underExposureBoost = handleUnderExposureBoost(
    likesReceived,
    stats
  );

  const queuePenalty = handleQueuePenalty(
    pendingLikes,
    daysInactive,
    stats
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

  const responseBoost = handleResponseBoost(responseRate);

  const finalScore = handleFinalScore(
    user.priorityGroup || 1,
    freshnessBoost,
    underExposureBoost,
    queuePenalty,
    activityPenalty,
    engagementScore,
    responseBoost
  );

  return {
    likesReceived,
    likesGiven,
    passesGiven,
    pendingLikes,
    accountAgeDays,
    daysSinceLastVisit: daysInactive,
    freshnessBoost,
    activityPenalty,
    underExposureBoost,
    queuePenalty,
    engagementScore,
    responseRate,
    responseLikelihoodBoost: responseBoost,
    finalScore,
    algorithmVersion: ALGO_VERSION,
    accountCreatedAt: user.createdAt,
    lastLogin: user.lastLogin || user.createdAt,
    gender: user?.gender.toLowerCase()
  };
};


// ===============================
// INITIAL / FULL RECALC
// ===============================
const handleMetrics = async (user) => {
  const userId = new mongoose.Types.ObjectId(user.userId);

  let metrics = await userFeedMetricsRepo.findOne({ userId });
  const exsitMatrics = !metrics
  if (exsitMatrics) {
    metrics = {
      likesReceived: await userLikeRepo.count({
        toUserId: userId,
        isDeleted: 0
      }),
      likesGiven: await userLikeRepo.count({
        fromUserId: userId,
        isDeleted: 0
      }),
      passesGiven: await userPassesRepo.count({
        fromUserId: userId,
        isDeleted: 0
      })
    };
  }

  let payload = calculateMetrics(user, metrics);

  // Insert or update metrics
    if (exsitMatrics) {
      payload.userId = user.userId
      await userFeedMetricsRepo.create(payload);
    } else {
      await userFeedMetricsRepo.update(
        { userId },
        { $set: payload }
      );
    }
};

// ===============================
// LIKE EVENT
// ===============================
const handleLike = async (fromUserId, toUserId) => {
  const fromId = new mongoose.Types.ObjectId(fromUserId);
  const toId = new mongoose.Types.ObjectId(toUserId);

  await userFeedMetricsRepo.update(
    { userId: fromId },
    { $inc: { likesGiven: 1 } },
    { upsert: true }
  );

  await userFeedMetricsRepo.update(
    { userId: toId },
    { $inc: { likesReceived: 1 } },
    { upsert: true }
  );
};

// ===============================
// PASS EVENT
// ===============================
const handlePass = async (fromUserId) => {
  const fromId = new mongoose.Types.ObjectId(fromUserId);

  await userFeedMetricsRepo.update(
    { userId: fromId },
    { $inc: { passesGiven: 1 } },
    { upsert: true }
  );
};


const handleLastLoginVisit = async (lastLogin, userId) => {
   const users = await userFeedMetricsRepo.findOne({userId: mongoose.Types.ObjectId.createFromHexString(userId)});
    const now = new Date();

   const daysSinceLastVisit = Math.floor((now - new Date(lastLogin || users.accountCreatedAt)) / 86400000);

      const userUpdateData = await userFeedMetricsRepo.findOneAndUpdate(
        { _id: users._id },
        {
          $set: {
            lastLogin,
          }
        }
      );
      console.log(userUpdateData,'userUpdateData')
      if(userUpdateData){
          await handleMetrics(userUpdateData);
      }
      
}

// ===============================
// DAILY CRON (DECAY + REFRESH)
// ===============================
cron.schedule('30 0 * * *', async () => {
  console.log('🔁 Daily feed metrics recalculation started');

  let page = 1;
  const limit = 200;

  while (true) {
    const users = await userFeedMetricsRepo.findAllPagination(
      {},
      { limit, offset: (page - 1) * limit }
    );

    if (!users.length) break;

    for (const u of users) {
      await handleMetrics(u);
    }

    page++;
  }

  console.log('✅ Daily feed metrics recalculation finished');
});

//

cron.schedule('0 */6 * * *', async () => {
  for (const gender of ['male', 'female']) {
    const stats = await calculateFeedStats(gender);
   const { _id, ...cleanStats } = stats;
    await globaFeedStatsRepo.findOneAndUpdate(
      { key: 'GLOBAL_FEED_STATS', gender },
      {  ...cleanStats, lastCalculatedAt: new Date() },
      { upsert: true }
    );
  }

  await initGlobalFeedStats(); // refresh cache
});



async function calculateFeedStats(gender) {
  const result = await UserFeedMetrics.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    { $match: { 'gender': gender } },

    {
      $addFields: {
        likesReceived: { $ifNull: ['$likesReceived', 0] },
        pendingLikes: { $ifNull: ['$pendingLikes', 0] }
      }
    },

    {
      $group: {
        _id: null,
        avgPendingLikes: { $avg: '$pendingLikes' },
        likesReceivedArray: { $push: '$likesReceived' }
      }
    },

    {
      $project: {
        avgPendingLikes: { $round: ['$avgPendingLikes', 2] },
        sortedLikes: {
          $sortArray: { input: '$likesReceivedArray', sortBy: 1 }
        }
      }
    },

    {
      $project: {
        avgPendingLikes: 1,
        p25LikesReceived: {
          $arrayElemAt: ['$sortedLikes', { $floor: { $multiply: [{ $size: '$sortedLikes' }, 0.25] } }]
        },
        p50LikesReceived: {
          $arrayElemAt: ['$sortedLikes', { $floor: { $multiply: [{ $size: '$sortedLikes' }, 0.5] } }]
        },
        p75LikesReceived: {
          $arrayElemAt: ['$sortedLikes', { $floor: { $multiply: [{ $size: '$sortedLikes' }, 0.75] } }]
        }
      }
    }
  ]);
  console.log(result,'result')
  return result[0] || GLOBAL_FEED_STATS[gender];
}



// ===============================
module.exports = {
  getGlobalFeedStats,
  initGlobalFeedStats,
  handleMetrics,
  handleLike,
  handlePass,
  handleLastLoginVisit
};
