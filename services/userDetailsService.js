
// ################################ Repositories ################################ //
const userRepo                 = require('../repositories/userRepo');
const userBlockRepo            = require('../repositories/userBlockRepo');
const userPassesRepo           = require('../repositories/userPassesRepo');
const userPersonalityTraitRepo = require('../repositories/userPersonalityTraitRepo');
const userInterestRepo         = require('../repositories/userInterestRepo');
const userLikeRepo             = require("../repositories/userLikeRepo");
const inboxRepo                = require('../repositories/inboxRepo')



//############################## Service #####################################//
const {
  buildQuery,
  getDateRange,
  buildExcludeIds,
  buildIncludeIds,
  applyPreferenceMappings,
  transformUserList,
  getPriorityAgeRange
 } = require('../services/homeService')


const mongoose = require('mongoose');
const moment = require('moment')

const userMatchDetails = async (userId, page, findUser, totalCountInAPage, matchedType) => {

        if(findUser.steps < 13){
          return {userList: [], totalUsers: 0};
        }
        // 24h data 
       const [startOfDay, endOfDay] = [moment().startOf('day').toDate(), moment().endOf('day').toDate()];
  

   
        // --- Fetch related user data in parallel ---
            const [
              userInterests,
              userPersonality,
              blockedUsers,
              likedUsers,
              passedUsers,
              todayLikes,
              todayPasses,
              previousPassData
            ] = await Promise.all([
              userInterestRepo.findAll({ userId, isDeleted: 0 }),
              userPersonalityTraitRepo.findAll({ userId, isDeleted: 0 }),
              userBlockRepo.findAllBlock({ fromUserId: userId, isDeleted: 0 }),
              userLikeRepo.findAll({ fromUserId: userId, isDeleted: 0 }),
              userPassesRepo.findAll({ fromUserId: userId, isDeleted: 0 }),
              userLikeRepo.findAll({ fromUserId: userId,createdAt: { $gte: startOfDay, $lte: endOfDay }, pageFrom: 'home' }),
              userPassesRepo.findAll({ fromUserId: userId,  createdAt: { $gte: startOfDay, $lte: endOfDay }, pageFrom: 'home' }),
              userPassesRepo.findAll({ fromUserId: userId,  createdAt: { $lt: startOfDay}, isDeleted: 0 }),
             
            ]);
        
            // --- Limit calculation ---
            const limit = matchedType === 'Present' ? totalCountInAPage - (todayLikes.length + todayPasses.length) : totalCountInAPage;
            
            // --- Prepare data ---
            const baseData = {
              userId: mongoose.Types.ObjectId.createFromHexString(userId),
              limit,
              offset: (page - 1) * limit,
              location: { lat: findUser?.location?.coordinates[1] ||  0, long: findUser?.location?.coordinates[0] || 0},
              countryId: findUser.countryId
            };
        
            const { minDate, maxDate, age } = getDateRange(findUser);
            const agePriorityData = getPriorityAgeRange(findUser.gender, age, findUser.dateOfBirth, findUser?.maritalStatus);
            const excludeIds = buildExcludeIds(blockedUsers, likedUsers, passedUsers, userId);
           
            const IDs = { $nin: excludeIds } //(matchedType === 'Past') ? { $in: includeIds } : 
            const query = buildQuery(findUser, minDate, maxDate, IDs, agePriorityData);
           
            // --- Apply preference mappings ---
            applyPreferenceMappings(findUser, baseData);

            // Fetch users who have liked the current user
            if(baseData.limit > 0){
              const includeUser = await userLikeRepo.findLikeUser({ toUserId: mongoose.Types.ObjectId.createFromHexString(userId), isDeleted: 0 },baseData)
             const includeIds = includeUser.map(m => mongoose.Types.ObjectId.createFromHexString(m.userId));
             baseData.includeIds = includeIds ;
            }
             

            // --- Fetch users ---
            const [users] = await Promise.all([
              limit > 0 ? userRepo.findAllUser(query, baseData, agePriorityData) : { data: [] , totalUsers: totalCountInAPage},
              
            ]);
            
            
            // --- Fetch fallback users if needed ---
            if (users.data.length < totalCountInAPage && matchedType === 'Present') {
              const remaining = totalCountInAPage - users.length;
              const oldIds =  buildIncludeIds(todayLikes, todayPasses, []);
              const retryQuery = buildQuery(findUser, minDate, maxDate, { $in: oldIds }, agePriorityData);
              baseData.includeIds = []
              const moreUsers = await userRepo.findAllUser(retryQuery, { ...baseData, limit: remaining, offset: 0 }, agePriorityData);
             if (Array.isArray(moreUsers?.data)) {
                users.data.push(...moreUsers.data);
              }

            }
            
          
            // --- Transform user list ---
            const userList = await transformUserList(users.data, findUser, userId, userInterests, userPersonality);
            
            

            return {userList, totalUsers: users.totalUsers};

}

const userMatchPastDetails = async (userId, page, findUser, totalCountInAPage, matchedType) => {
        
      if(findUser.steps < 13){
          return {userList: [], totalUsers: 0};
        }
        // 24h data 
       const [startOfDay, endOfDay] = [moment().startOf('day').toDate(), moment().endOf('day').toDate()];
  



        // --- Fetch related user data in parallel ---
            const [
              userInterests,
              userPersonality,
              likedUsers,
              passedUsers,
            ] = await Promise.all([
              userInterestRepo.findAll({ userId, isDeleted: 0 }),
              userPersonalityTraitRepo.findAll({ userId, isDeleted: 0 }),
              userLikeRepo.findAll({ fromUserId: userId, isDeleted: 0 , createdAt:  {$lte: startOfDay }}),
              userPassesRepo.findAll({ fromUserId: userId, isDeleted: 0 , createdAt:  {$lte: startOfDay }})
            ]);

            // 
           const finalUsers = [...new Set([...likedUsers, ...passedUsers])];



           
            finalUsers.sort((a,b) => a.createdAt - b.createdAt)
            // --- Limit calculation ---
            const limit =  totalCountInAPage;

            // --- Prepare data ---
            const baseData = {
              userId: mongoose.Types.ObjectId.createFromHexString(userId),
              limit,
              offset: (page - 1) * limit,
              location: { lat: findUser?.location?.coordinates[1] || 0, long: findUser?.location?.coordinates[0] || 0},
              countryId: findUser?.countryId
            };
        
            const { minDate, maxDate, age } = getDateRange(findUser);
            const agePriorityData = getPriorityAgeRange(findUser.gender, age, findUser.dateOfBirth, findUser?.maritalStatus);
            const includeIds = buildIncludeIds(finalUsers, [],[]);
            const IDs = { $in: includeIds } //(matchedType === 'Past') ? { $in: includeIds } : 
            const query = buildQuery(findUser, minDate, maxDate, IDs, agePriorityData);
            
           
            baseData.includeIds = []

            // --- Apply preference mappings ---
            applyPreferenceMappings(findUser, baseData);
        
            // --- Fetch users ---
            const [users] = await Promise.all([
              userRepo.findAllUser(query, baseData, agePriorityData),
              // userRepo.findTotalUser(query, baseData)
            ]);
        
            
            
            // --- Transform user list ---
            const userList = await transformUserList(users.data, findUser, userId, userInterests, userPersonality);
            
          
            return {userList, totalUsers: users.totalUsers};

}

const userInboxData = async (userId) => {
    let inboxData = await inboxRepo.findAllwithUserDetails({$or:[
      {firstUserId: mongoose.Types.ObjectId.createFromHexString(userId)}, 
      {secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)}],
      isActived: 1, isDeleted: 0, isBlocked: false, type: {$ne: 'admin'}}, userId);

      // TODAY RANGE
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

     // 7 DAYS RANGE
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(todayStart.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
     
   // 15 DAYS RANGE
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(todayStart.getDate() - 15);
  fifteenDaysAgo.setHours(0, 0, 0, 0);

  // 30 DAYS RANGE
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(todayStart.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

   // FILTERS
  const todayFilter = inboxData.filter(item => {
    const d = new Date(item.createdAt);
    return d >= todayStart && d <= todayEnd;
  });


  const last7DaysFilter = inboxData.filter(item => {
    const d = new Date(item.date);
    return d >= sevenDaysAgo && d <= todayEnd;
  });

  const last15DaysFilter = inboxData.filter(item => {
    const d = new Date(item.date);
    return d >= fifteenDaysAgo && d <= todayEnd;
  });

  const last30DaysFilter = inboxData.filter(item => {
    const d = new Date(item.date);
    return d >= thirtyDaysAgo && d <= todayEnd;
  });

    return {
       totalmatchCount: inboxData.length, 
       allMatchDta: inboxData, 
       totalTodayMatchCount: todayFilter.length,
       allTodayMatchData: todayFilter,
       total7DaysMatchCount: last7DaysFilter.length,
       all7DaysMatchCount: last7DaysFilter,
       total15DaysMatchCount: last7DaysFilter.length,
       all15DaysMatchCount: last15DaysFilter,
       total30DaysMatchCount: last15DaysFilter.length,
       all30DaysMatchCount: last30DaysFilter,

      }
}

module.exports = {
    userMatchDetails,
    userMatchPastDetails,
    userInboxData
}