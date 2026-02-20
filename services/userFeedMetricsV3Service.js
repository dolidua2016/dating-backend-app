const userFeedMetricsRepo = require('../repositories/userFeedMetricsRepo');
const userLikeRepo = require('../repositories/userLikeRepo');
const userPassesRepo = require('../repositories/userPassesRepo');
const globalFeedStatsRepo = require('../repositories/globalFeedStatsRepo');
const mongoose = require('mongoose');
const cron = require('node-cron');
const ALGO_VERSION = 'v3.0-dynamic';
const UserFeedMetrics = require('../models/userFeedMetrics');
const User = require('../models/user');

// ===============================
// DYNAMIC GLOBAL STATS CACHE
// ===============================
let GLOBAL_FEED_STATS = {
  male: {
    avgPendingLikes: 40,
    p25LikesReceived: 10,
    p50LikesReceived: 30,
    p75LikesReceived: 70,
    avgResponseRate: 0.15,
    avgEngagement: 1.2,
    activeUserRatio: 0.6
  },
  female: {
    avgPendingLikes: 15,
    p25LikesReceived: 5,
    p50LikesReceived: 12,
    p75LikesReceived: 25,
    avgResponseRate: 0.20,
    avgEngagement: 1.3,
    activeUserRatio: 0.65
  },
  overall: {
    totalUsers: 1000,
    activeUsers: 600,
    avgSessionLength: 15, // minutes
    peakHours: [18, 19, 20, 21], // 6pm-9pm
    lastUpdated: new Date()
  }
};

// ===============================
// INIT GLOBAL FEED STATS
// ===============================
async function initGlobalFeedStats() {
  try {
    const statsList = await globalFeedStatsRepo.findAll({
      key: 'GLOBAL_FEED_STATS'
    });

    statsList.forEach(s => {
      if (s.gender && GLOBAL_FEED_STATS[s.gender]) {
        GLOBAL_FEED_STATS[s.gender] = { ...s };
      } else if (s.gender === 'overall') {
        GLOBAL_FEED_STATS.overall = { ...s };
      }
    });

    console.log('✅ Global Feed Stats Loaded', GLOBAL_FEED_STATS);
  } catch (error) {
    console.error('❌ Error loading global stats:', error);
  }
}


const getGlobalFeedStats = (gender = 'male') => {
  const normalized = gender?.toLowerCase();
  return GLOBAL_FEED_STATS[normalized] || GLOBAL_FEED_STATS.male;
};

// ===============================
// DYNAMIC UTILS
// ===============================
const DAY = 86400000;
const HOUR = 3600000;
const clamp = (v, min = 0, max = Infinity) => Math.min(Math.max(min, v), max);
const daysBetween = (a, b) => Math.floor((a - b) / DAY);
const hoursBetween = (a, b) => Math.floor((a - b) / HOUR);

// Adaptive time decay based on user activity patterns
const adaptiveTimeDecay = (days, userActivityLevel = 0.5) => {
  const baseDecay = Math.exp(-days / 30);
  const activityBonus = userActivityLevel * 0.3;
  return clamp(baseDecay + activityBonus, 0, 1);
};

// Calculate time of day boost (more active during peak hours)
const getTimeOfDayBoost = (stats) => {
  const hour = new Date().getHours();
  const peakHours = stats.peakHours || [18, 19, 20, 21];
  
  if (peakHours.includes(hour)) return 1.3;
  if (hour >= 12 && hour <= 14) return 1.1; // Lunch time
  if (hour >= 6 && hour <= 9) return 1.05; // Morning
  if (hour >= 22 || hour <= 5) return 0.8; // Late night/early morning
  return 1.0;
};

// ===============================
// DYNAMIC BOOST & PENALTY HANDLERS
// ===============================

/**
 * Dynamic freshness boost - adapts based on overall new user success
 */
const handleDynamicFreshnessBoost = (days, stats) => {
  const baseBoost = {
    3: 2.5,
    7: 2.0,
    14: 1.5,
    30: 1.2
  };
  
  // Adjust based on how new users are performing overall
  const successRate = stats.avgResponseRate || 0.15;
  const multiplier = 1 + (successRate - 0.15) * 2; // If new users succeed more, boost them more
  
  if (days <= 3) return baseBoost[3] * multiplier;
  if (days <= 7) return baseBoost[7] * multiplier;
  if (days <= 14) return baseBoost[14] * multiplier;
  if (days <= 30) return baseBoost[30] * multiplier;
  return 1.0;
};

/**
 * Dynamic activity penalty - considers recent session patterns
 */
const handleDynamicActivityPenalty = (daysInactive, hoursSinceLastSession, stats) => {
  const activeUserRatio = stats.activeUserRatio || 0.6;
  
  // If user was recently active (within hours), minimal penalty
  if (hoursSinceLastSession <= 6) return 1.0;
  if (hoursSinceLastSession <= 24) return 0.98;
  
  // Day-based penalties, adjusted by overall platform activity
  const basePenalty = {
    1: 1.0,
    7: 0.95,
    14: 0.85,
    30: 0.7,
    60: 0.4
  };
  
  // If overall activity is low, be less harsh on inactive users
  const adjustment = activeUserRatio < 0.5 ? 1.2 : 1.0;
  
  if (daysInactive <= 1) return basePenalty[1];
  if (daysInactive <= 7) return basePenalty[7] * adjustment;
  if (daysInactive <= 14) return basePenalty[14] * adjustment;
  if (daysInactive <= 30) return basePenalty[30] * adjustment;
  if (daysInactive <= 60) return basePenalty[60] * adjustment;
  return 0.2 * adjustment;
};

/**
 * Dynamic exposure boost - adapts based on percentile position
 */
const handleDynamicExposureBoost = (likesReceived, stats) => {
  const p25 = stats.p25LikesReceived || 10;
  const p50 = stats.p50LikesReceived || 30;
  const p75 = stats.p75LikesReceived || 70;
  
  // Calculate percentile position
  if (likesReceived <= p25) {
    // Bottom 25% - need significant boost
    const ratio = likesReceived / (p25 || 1);
    return 2.5 - (ratio * 0.5); // 2.5 to 2.0
  }
  if (likesReceived <= p50) {
    // 25-50% - moderate boost
    return 1.8;
  }
  if (likesReceived <= p75) {
    // 50-75% - slight boost
    return 1.3;
  }
  // Top 25% - no boost needed
  return 1.0;
};

/**
 * Dynamic queue penalty - considers platform-wide queue health
 */
const handleDynamicQueuePenalty = (pending, daysInactive, userActivityLevel, stats) => {
  const avgPending = stats.avgPendingLikes || 20;
  const effective = pending * adaptiveTimeDecay(daysInactive, userActivityLevel);
  const ratio = effective / (avgPending || 1);
  
  // More aggressive penalties for queue hoggers
  if (ratio >= 5) return 0.2;
  if (ratio >= 4) return 0.3;
  if (ratio >= 3) return 0.5;
  if (ratio >= 2) return 0.7;
  if (ratio >= 1.5) return 0.85;
  
  // Small boost for very responsive users
  if (ratio <= 0.3) return 1.1;
  return 1.0;
};

/**
 * Dynamic engagement score - considers quality of engagement
 */
const handleDynamicEngagementScore = (likesGiven, passesGiven, likesReceived, stats) => {
  const totalActions = likesGiven + passesGiven;
  const avgEngagement = stats.avgEngagement || 1.2;
  
  // Selectivity ratio (likes vs total actions)
  const selectivity = totalActions > 0 ? likesGiven / totalActions : 0.5;
  
  // Base engagement
  const baseScore = 1 + 
    Math.min(0.4, likesGiven * 0.008) + 
    Math.min(0.2, passesGiven * 0.004);
  
  // Penalize users who like everyone (likely spam/bots)
  const selectivityPenalty = selectivity > 0.9 ? 0.7 : 1.0;
  
  // Penalize users who never like anyone
  const inactivityPenalty = selectivity < 0.05 ? 0.8 : 1.0;
  
  // Normalize against platform average
  const normalizedScore = baseScore / (avgEngagement || 1);
  
  return clamp(normalizedScore * selectivityPenalty * inactivityPenalty, 0.5, 2.0);
};

/**
 * Dynamic response likelihood - predicts probability of response
 */
const handleDynamicResponseRate = (received, given, passed, stats) => {
  if (received === 0) return stats.avgResponseRate || 0.15;
  
  const totalResponses = given + passed;
  const rate = totalResponses / received;
  
  // Smooth transition for new users
  if (received <= 5) {
    const confidence = received / 5;
    const avgRate = stats.avgResponseRate || 0.15;
    return (rate * confidence) + (avgRate * (1 - confidence));
  }
  
  // Clamp to realistic bounds
  return clamp(rate, 0, 1.0);
};

/**
 * Dynamic response boost - rewards responsive users more
 */
const handleDynamicResponseBoost = (rate, stats) => {
  const avgRate = stats.avgResponseRate || 0.15;
  const relativeRate = rate / (avgRate || 0.15);
  
  // Scale boosts based on how much better than average
  if (relativeRate >= 2.0) return 2.0; // Extremely responsive
  if (relativeRate >= 1.5) return 1.7;
  if (relativeRate >= 1.2) return 1.4;
  if (relativeRate >= 1.0) return 1.2;
  if (relativeRate >= 0.8) return 1.0;
  if (relativeRate >= 0.5) return 0.85;
  return 0.7; // Very unresponsive
};

/**
 * Consistency bonus - rewards users who maintain regular activity
 */
const handleConsistencyBonus = (user, metrics) => {
  // If user has been active recently and regularly
  const daysSinceCreated = daysBetween(new Date(), new Date(user.createdAt));
  const totalActions = (metrics.likesGiven || 0) + (metrics.passesGiven || 0);
  
  if (daysSinceCreated === 0) return 1.0;
  
  const actionsPerDay = totalActions / daysSinceCreated;
  
  // Reward consistent daily engagement
  if (actionsPerDay >= 10) return 1.3; // Very active
  if (actionsPerDay >= 5) return 1.2; // Active
  if (actionsPerDay >= 2) return 1.1; // Moderate
  if (actionsPerDay >= 1) return 1.05; // Light
  return 1.0; // Minimal
};

/**
 * Dynamic final score calculation with normalization
 */
const handleDynamicFinalScore = (
  priority,
  freshness,
  exposure,
  queue,
  activity,
  engagement,
  response,
  consistency,
  timeOfDay
) => {
  // Priority base score (0-100)
  const priorityScore = clamp(100 - (priority * 10), 0, 100);
  
  // Combine all factors multiplicatively
  const rawScore = priorityScore *
    freshness *
    exposure *
    queue *
    activity *
    engagement *
    response *
    consistency *
    timeOfDay;
  
  // Normalize to reasonable range and add some randomness for variety
  const randomFactor = 0.95 + (Math.random() * 0.1); // 0.95-1.05
  return Math.max(0, rawScore * randomFactor);
};

// ===============================
// MAIN DYNAMIC METRICS CALCULATOR
// ===============================
const calculateDynamicMetrics = (user, metrics) => {
  const now = new Date();
  const stats = getGlobalFeedStats(user.gender);
  const overallStats = GLOBAL_FEED_STATS.overall;

  const accountAgeDays = daysBetween(now, new Date(user.createdAt));
  const lastLoginDate = new Date(user.lastLogin || user.createdAt);
  const daysInactive = daysBetween(now, lastLoginDate);
  const hoursSinceLastSession = hoursBetween(now, lastLoginDate);

  const likesReceived = clamp(metrics.likesReceived || 0);
  const likesGiven = clamp(metrics.likesGiven || 0);
  const passesGiven = clamp(metrics.passesGiven || 0);

  const pendingLikes = clamp(likesReceived - (likesGiven + passesGiven));
  
  // Calculate user activity level (0-1 scale)
  const totalActions = likesGiven + passesGiven;
  const userActivityLevel = accountAgeDays > 0 
    ? clamp(totalActions / (accountAgeDays * 10), 0, 1)
    : 0.5;

  // Apply dynamic calculations
  const freshnessBoost = handleDynamicFreshnessBoost(accountAgeDays, stats);
  const activityPenalty = handleDynamicActivityPenalty(daysInactive, hoursSinceLastSession, stats);
  const underExposureBoost = handleDynamicExposureBoost(likesReceived, stats);
  const queuePenalty = handleDynamicQueuePenalty(pendingLikes, daysInactive, userActivityLevel, stats);
  const engagementScore = handleDynamicEngagementScore(likesGiven, passesGiven, likesReceived, stats);
  const responseRate = handleDynamicResponseRate(likesReceived, likesGiven, passesGiven, stats);
  const responseBoost = handleDynamicResponseBoost(responseRate, stats);
  const consistencyBonus = handleConsistencyBonus(user, metrics);
  const timeOfDayBoost = getTimeOfDayBoost(overallStats);

  const finalScore = handleDynamicFinalScore(
    user.priorityGroup || 1,
    freshnessBoost,
    underExposureBoost,
    queuePenalty,
    activityPenalty,
    engagementScore,
    responseBoost,
    consistencyBonus,
    timeOfDayBoost
  );

  return {
    // Core metrics
    likesReceived,
    likesGiven,
    passesGiven,
    pendingLikes,
    
    // Time metrics
    accountAgeDays,
    daysSinceLastVisit: daysInactive,
    hoursSinceLastSession,
    
    // Boost factors
    freshnessBoost,
    activityPenalty,
    underExposureBoost,
    queuePenalty,
    engagementScore,
    consistencyBonus,
    timeOfDayBoost,
    
    // Response metrics
    responseRate,
    responseLikelihoodBoost: responseBoost,
    userActivityLevel,
    
    // Final
    finalScore,
    algorithmVersion: ALGO_VERSION,
    lastCalculated: now,
    
    // Metadata
    accountCreatedAt: user.createdAt,
    lastLogin: user.lastLogin || user.createdAt,
    gender: user?.gender?.toLowerCase() || 'male'
  };
};

// ===============================
// REAL-TIME METRICS UPDATE
// ===============================
const updateMetricsRealtime = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const metrics = await userFeedMetricsRepo.findOne({ 
      userId: mongoose.Types.ObjectId.createFromHexString(userId) 
    });

    const payload = calculateDynamicMetrics(user, metrics || {});
    
    await userFeedMetricsRepo.update(
      { userId: mongoose.Types.ObjectId.createFromHexString(userId) },
      { $set: payload },
      { upsert: true }
    );

    return payload;
  } catch (error) {
    console.error('Error updating metrics:', error);
    return null;
  }
};

// ===============================
// HANDLE FULL RECALCULATION
// ===============================
const handleMetrics = async (user) => {
  try {
    const userId = mongoose.Types.ObjectId.createFromHexString(
      user.userId || user._id?.toString()
    );

    let metrics = await userFeedMetricsRepo.findOne({ userId });
    
    if (!metrics) {
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

    const payload = calculateDynamicMetrics(user, metrics);
    payload.userId = userId;

    await userFeedMetricsRepo.update(
      { userId },
      { $set: payload },
      { upsert: true }
    );

    return payload;
  } catch (error) {
    console.error('Error in handleMetrics:', error);
    throw error;
  }
};

// ===============================
// REAL-TIME EVENT HANDLERS
// ===============================
const handleLike = async (fromUserId, toUserId) => {
  try {
    const fromId = mongoose.Types.ObjectId.createFromHexString(fromUserId);
    const toId = mongoose.Types.ObjectId.createFromHexString(toUserId);

    // Update counters
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

    // Recalculate scores in real-time (async, non-blocking)
    setImmediate(() => {
      updateMetricsRealtime(fromUserId);
      updateMetricsRealtime(toUserId);
    });

  } catch (error) {
    console.error('Error in handleLike:', error);
  }
};

const handlePass = async (fromUserId, toUserId = null) => {
  try {
    const fromId = mongoose.Types.ObjectId.createFromHexString(fromUserId);

    await userFeedMetricsRepo.update(
      { userId: fromId },
      { $inc: { passesGiven: 1 } },
      { upsert: true }
    );

    // Recalculate score in real-time
    setImmediate(() => updateMetricsRealtime(fromUserId));

  } catch (error) {
    console.error('Error in handlePass:', error);
  }
};

const handleLastLoginVisit = async (userId) => {
  try {
    const lastLogin = new Date();
    
    await userFeedMetricsRepo.update(
      { userId: mongoose.Types.ObjectId.createFromHexString(userId) },
      { $set: { lastLogin } },
      { upsert: true }
    );

    // Recalculate with updated login time
    setImmediate(() => updateMetricsRealtime(userId));

  } catch (error) {
    console.error('Error in handleLastLoginVisit:', error);
  }
};

// ===============================
// CALCULATE PLATFORM-WIDE STATS
// ===============================
async function calculateDynamicFeedStats(gender) {
  try {
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
      { $match: { 'user.gender': gender } },
      {
        $addFields: {
          likesReceived: { $ifNull: ['$likesReceived', 0] },
          likesGiven: { $ifNull: ['$likesGiven', 0] },
          passesGiven: { $ifNull: ['$passesGiven', 0] },
          pendingLikes: { $ifNull: ['$pendingLikes', 0] }
        }
      },
      {
        $group: {
          _id: null,
          avgPendingLikes: { $avg: '$pendingLikes' },
          avgResponseRate: { 
            $avg: {
              $cond: [
                { $gt: ['$likesReceived', 0] },
                { $divide: [
                  { $add: ['$likesGiven', '$passesGiven'] },
                  '$likesReceived'
                ]},
                0
              ]
            }
          },
          avgEngagement: {
            $avg: { $add: [
              { $multiply: ['$likesGiven', 0.01] },
              { $multiply: ['$passesGiven', 0.005] }
            ]}
          },
          likesReceivedArray: { $push: '$likesReceived' },
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [
                { $gte: ['$daysSinceLastVisit', 0] },
                { $cond: [{ $lte: ['$daysSinceLastVisit', 7] }, 1, 0] },
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          avgPendingLikes: { $round: ['$avgPendingLikes', 2] },
          avgResponseRate: { $round: ['$avgResponseRate', 3] },
          avgEngagement: { $round: ['$avgEngagement', 2] },
          activeUserRatio: { 
            $round: [{ $divide: ['$activeUsers', '$totalUsers'] }, 2]
          },
          sortedLikes: {
            $sortArray: { input: '$likesReceivedArray', sortBy: 1 }
          }
        }
      },
      {
        $project: {
          avgPendingLikes: 1,
          avgResponseRate: 1,
          avgEngagement: 1,
          activeUserRatio: 1,
          p25LikesReceived: {
            $arrayElemAt: ['$sortedLikes', { 
              $floor: { $multiply: [{ $size: '$sortedLikes' }, 0.25] } 
            }]
          },
          p50LikesReceived: {
            $arrayElemAt: ['$sortedLikes', { 
              $floor: { $multiply: [{ $size: '$sortedLikes' }, 0.5] } 
            }]
          },
          p75LikesReceived: {
            $arrayElemAt: ['$sortedLikes', { 
              $floor: { $multiply: [{ $size: '$sortedLikes' }, 0.75] } 
            }]
          }
        }
      }
    ]);

    return result[0] || GLOBAL_FEED_STATS[gender];
  } catch (error) {
    console.error('Error calculating feed stats:', error);
    return GLOBAL_FEED_STATS[gender];
  }
}

// ===============================
// CRON JOBS
// ===============================

// Hourly: Quick stats refresh
cron.schedule('0 * * * *', async () => {
  console.log('🔄 Hourly stats refresh');
  await initGlobalFeedStats();
});

// Every 6 hours: Full stats recalculation
cron.schedule('* */4 * * *', async () => {
  console.log('📊 Recalculating platform-wide statistics');
  
  for (const gender of ['male', 'female']) {
    const stats = await calculateDynamicFeedStats(gender);
    const { _id, ...cleanStats } = stats;
    
    await globalFeedStatsRepo.findOneAndUpdate(
      { key: 'GLOBAL_FEED_STATS', gender },
      { ...cleanStats, lastCalculatedAt: new Date() },
      { upsert: true }
    );
  }

  await initGlobalFeedStats();
  console.log('✅ Platform stats updated');
});

// Daily: Full user metrics recalculation
cron.schedule('30 2 * * *', async () => {
  console.log('🔁 Daily feed metrics recalculation started');

  let page = 1;
  const limit = 100;
  let totalProcessed = 0;

  while (true) {
    const users = await User.find({})
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!users.length) break;

    for (const user of users) {
      try {
        user.userId = user._id.toString();
        await handleMetrics(user);
        totalProcessed++;
      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error);
      }
    }

    console.log(`Processed ${totalProcessed} users...`);
    page++;
  }

  console.log(`✅ Daily recalculation finished. Total: ${totalProcessed} users`);
});

// ===============================
// EXPORTS
// ===============================
module.exports = {
  getGlobalFeedStats,
  initGlobalFeedStats,
  handleMetrics,
  handleLike,
  handlePass,
  handleLastLoginVisit,
  calculateDynamicMetrics,
  updateMetricsRealtime
};