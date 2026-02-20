/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 5th MAR, 2025
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const userRepo = require("../../repositories/userRepo");
const wrapItUpRepo = require("../../repositories/wrapItUpRepo");
const userWrapItUpRepo = require("../../repositories/userWrapItUpRepo");
const userBlockRepo = require("../../repositories/userBlockRepo");
const userPassesRepo = require("../../repositories/userPassesRepo");
const userPersonalityTraitRepo = require("../../repositories/userPersonalityTraitRepo");
const userInterestRepo = require("../../repositories/userInterestRepo");
const userFavoritesRepo = require("../../repositories/userFavoritesRepo");
const userLikeRepo = require("../../repositories/userLikeRepo");
const userReportRepo = require("../../repositories/userReportRepo");
const countriesRepo = require("../../repositories/countriesRepo");
const userPictureRepo = require("../../repositories/userPictureRepo");
const notificationRepo = require("../../repositories/notificationRepo");

//################################ Response Message ###########################//
const responseMessages = require("../../responseMessages");
const commonFunctions = require("../../helpers/commonFunctions");
const { handleMetrics} = require('../../services/UserFeedMetricsV2Service');
//############################## Service #####################################//
const {
    buildInterestDetails,
    buildPersonality,
    buildQuestionAnswer,
    calculateAge,
    findAgeRange,
    buildQuery,
    checkAndMarkSave,
    checkPersonalitySave,
    cleanUserObject,
    getDateRange,
    buildExcludeIds,
    applyPreferenceMappings,
    transformUserList,
    getPriorityAgeRange,
    homeBuildQuery,
    fetchAllUserRelations,
    transformUserListOptimized,
    prepareLookupMaps,
    transformSingleUserSync
} = require("../../services/homeService");

const {
    buildBasicDetails,
    buildWrapDetails,
    buildGallery,
    checkScanStatus,
    updateUserProfileVisibleStatus,
} = require("../../services/userProfileService");
const {ensureStateExists} = require('../../services/authService')

const { homeFilterData, homeFilterQuery, homeCountryFilterData, filterStatus} = require("../../services/homeFilterService")
//################################# Npm Package #################################//
require("dotenv").config();
const mongoose = require("mongoose");
const moment = require("moment");



function buildLocation(long, lat) {
   if (!long || !lat) return {};
         return {
               type: 'Point',
               coordinates: [parseFloat(long), parseFloat(lat)],
              };
}

function response(userList, totalCount, isChatContinue ,scanData,isBlocked, isActived, deactivateAccount, deactivateAccountAt, privacyLocked, totalNotifications, ageRange, limitExceeded, isAddressAdd, filter){
  return {
        status: 200,
        msg: "Home Page Data",
        data: {
          userList: userList,
          totalCount: totalCount,
          isChatContinue: isChatContinue,
          scanData: scanData,
          isBlocked: isBlocked,
          isActived: isActived,
          deactivateAccount: deactivateAccount,
          deactivateAccountAt: deactivateAccountAt,
          privacyLocked: privacyLocked,
          totalNotifications: totalNotifications,
          ageRange: ageRange,
          limitExceeded: limitExceeded,
          isAddressAdd: isAddressAdd,
          isFilter: filter,
          limit: 3
        },
        purpose: 'Home Page Data'
      }
}


const handleLimit = (isPremium, gender) =>{
  const golbalLimit = {
        premiumMenLimit : 10,
        premiumWomenLimit: 20,
        freeMenLimit : 5,
        freeWomenLimit: 10,
      }
    if(isPremium){
      return gender === 'Male' ? golbalLimit.premiumMenLimit : golbalLimit.premiumWomenLimit
    }else {
      return gender === 'Male' ? golbalLimit.freeMenLimit : golbalLimit.freeWomenLimit
    }
}


const handleUserLocation = async (queryParam, findUser) => {
  //  const countryDetails = (await countriesRepo.findAll({ 
  //       countryName: { '$regex': queryParam.country }, 
  //       isActived: 1 
  //     }))
  //       .map(m => {
  //         if ((m.countryName).toLowerCase() === (queryParam.country).toLowerCase()) {
  //           return { ...m };
  //         }
  //         return null;
  //       })
  //       .filter(Boolean);
  const countryDetails = await countriesRepo.findAll({
    countryName: new RegExp(`^${queryParam.country}$`, 'i'),
    isActived: 1
  });

      const countryId = countryDetails[0]?._id || '';
        console.log(countryId,'countryId ======== 131')
      const updateData = {
        countryId: countryDetails[0]?._id || '',
        city: queryParam.city,
        state: queryParam.state,
        address: queryParam.address,
        location: buildLocation(queryParam.long, queryParam.lat)
      };

      await userRepo.update({ _id: findUser?._id, isDeleted: 0 }, updateData);

      if (!countryDetails.length && queryParam.state) {
        await ensureStateExists(countryDetails[0]?._id, queryParam.state);
      }
     
      return countryId
}


/*
|------------------------------------------------ 
| API name          :  homePageData
| Response          :  Respective response message in JSON format
| Logic             :  Fetch home page data
| Request URL       :  BASE_URL/api/home-page
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.homePageData = async (req, res) => {
  const purpose = "Home Page Data";
  const startTime = Date.now();
   const timings = {};
  try {
    const userId = req.headers.userId;
    let queryParam = req?.query;
    queryParam.itsVerified = queryParam?.itsVerified === 'true' ? true : false;
    const searchAgeRange = req?.query?.ageRange || '';
    const heightRange    = req?.query?.heightRange || '';
    let countryId = '';
    // Fetch user and pictures in parallel
    const [findUser, userPictures, notificationTotalCount, startOfDay, endOfDay] = await Promise.all([
      userRepo.findOne({ _id: userId, isDeleted: 0 }),
      userPictureRepo.findAll({ userId, isDeleted: 0 }),
      notificationRepo.count({  toUserId: userId,  isDeleted: 0, readUnread: 0 }),
      moment().startOf("day").toDate(),
      moment().endOf("day").toDate(),
    ]);

    if (!findUser) {
      return res.send({
        status: 404,
        msg: "User not found",
        data: {},
        purpose,
      });
    }

    // User limit
    const userLimit = handleLimit(findUser.isSubcription, findUser.gender);
    
    const homeFilterQueryData = await homeFilterQuery(queryParam, userId, findUser.isSubcription, searchAgeRange, heightRange)
    const filter = await filterStatus(userId);

    // Check if address is missing
    if (((!findUser.countryId || findUser.countryId === "") || (!findUser.location || Object.keys(findUser.location).length === 0)) && (!queryParam?.country && !queryParam?.lat && !queryParam?.long)) {
      const responseData = response([], 0, false, {}, findUser?.isBlocked, findUser?.isActived, findUser?.deactivateAccount,findUser?.deactivateAccountAt || null , findUser?.privacyLocked || 0,  notificationTotalCount || 0, {}, false , false, filter)
      return res.send( responseData )
    }

    // Update location if provided
    if (queryParam.country) {
      countryId = await handleUserLocation(queryParam, findUser)
    }

    const page = parseInt(req.query.page || 1);

     let stepStart = Date.now();
     
    // Fetch all user-related data in parallel
    const [
      userInterests,
      userPersonality,
      allUserRelations,
      scanData,
      // visibilityStatusCheck
    ] = await Promise.all([
      userInterestRepo.findAll({ userId, isDeleted: 0 }),
      userPersonalityTraitRepo.findAll({ userId, isDeleted: 0 }),
      fetchAllUserRelations(userId, startOfDay, endOfDay, userLimit),
      checkScanStatus(findUser, userPictures),
      //updateUserProfileVisibleStatus(findUser, userPictures)
    ]);


     timings.fetchUser = Date.now() - stepStart;

    const { blockedUsers, likedUsers, passedUsers, todayLikes, todayPasses, includeUser } = allUserRelations;

    const { minDate, maxDate, age } = getDateRange(findUser);
    const agePriorityData = getPriorityAgeRange(
      findUser.gender,
      age,
      findUser.dateOfBirth,
      findUser?.maritalStatus,
      homeFilterQueryData.searchAgeRange
    );

    // Check if account is deactivated
    if (findUser?.deactivateAccount === 1) {
      const responseData = response([], 0, false, scanData, findUser?.isBlocked, findUser?.isActived, findUser?.deactivateAccount,findUser?.deactivateAccountAt || null , findUser?.privacyLocked || 0,  notificationTotalCount || 0, agePriorityData.ageRange, false , true, filter)
      return res.send( responseData )
    }

  
     const userDataLimit = userLimit - (todayLikes.length + todayPasses.length)
     let limitExceededCount = userDataLimit;
         // Calculate remaining limit
    let limit = 0
    if(userDataLimit > 3){
      limit = 3;
    }else{
      if(page === 1){limit = userDataLimit; }
      else {limit = userDataLimit - 1; limitExceededCount = userDataLimit - 1; }
    }

    console.log(limitExceededCount,'limitExceededCount=====')
    // let limit = userDataLimit > 3 ? 3 : (userDataLimit - 1) ;
    console.log(limit,'limit----------------251')
    if (limit <= 0 ) { //|| page > 1
       const responseData = response([], 0, false, scanData, findUser?.isBlocked, findUser?.isActived, findUser?.deactivateAccount,findUser?.deactivateAccountAt || null , findUser?.privacyLocked || 0,  notificationTotalCount || 0, agePriorityData.ageRange, true , true, filter)
       return res.send( responseData )
    }
     console.log(countryId,'countryId----------------------265')
    // Prepare base data for query
    const baseData = {
      userId: mongoose.Types.ObjectId.createFromHexString(userId),
      limit,
      offset: (page - 1) * limit,
      location: {
        lat: findUser?.location?.coordinates[1] || queryParam.long,
        long: findUser?.location?.coordinates[0] || queryParam.lat,
      },
      countryId: findUser?.countryId || countryId,
    };
    console.log(baseData,'baseData=============')
    // Add include IDs (users who liked current user)
    const includeIds = includeUser.map(m => mongoose.Types.ObjectId.createFromHexString(m.userId));
    baseData.includeIds = includeIds;

    // Build exclude IDs
    const excludeIds = buildExcludeIds(blockedUsers, likedUsers, passedUsers, userId);

    // Build query
    const query = homeBuildQuery(
      findUser,
      minDate,
      maxDate,
      { $nin: excludeIds },
      agePriorityData,
      homeFilterQueryData.filter
    );
    // Apply preference mappings
    applyPreferenceMappings(findUser, baseData);


    stepStart = Date.now();
    // Fetch users
    const users = await userRepo.findAllUniueUser(query, baseData, agePriorityData);
    timings.findAllUser = Date.now() - stepStart;

    stepStart = Date.now();
    const maps = await prepareLookupMaps(userId, users.data);
     timings.maps = Date.now() - stepStart;
    const UserData = []

    stepStart = Date.now();
    // Transform user list with optimized batch queries
    for (const user of users.data) {
     const transformed = await transformSingleUserSync(user, findUser, findUser?.countryId || countryId, userInterests, userPersonality, maps);
     UserData.push(transformed)
    }

    timings.transformed = Date.now() - stepStart;

    timings.total = Date.now() - startTime;
    console.table(timings)
    console.log('userDataLimit ===', userDataLimit)
   
    // Final response
    const responsData = response(UserData,  users.totalUsers, false, scanData, findUser?.isBlocked, findUser?.isActived, findUser?.deactivateAccount,findUser?.deactivateAccountAt || null , findUser?.privacyLocked || 0,  notificationTotalCount || 0, agePriorityData.ageRange, limitExceededCount === UserData.length ? true : false , true, filter)
    console.log(responsData,'responsData')
    return res.send( responsData )

    
  } catch (err) {
    console.error("Home Page Data Error: ", err);
    return res.send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};

/*
|------------------------------------------------ 
| API name          :  fetchHomePageFilter
| Response          :  Respective response message in JSON format
| Logic             :  Fetch home Page filter data
| Request URL       :  BASE_URL/api/home-page-filter
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchHomePageFilter = async(req,res) =>{
  const purpose = 'Fetch home page filter data';
  try{
    const userId = req.headers.userId;
    const { page } = req.query;

    const findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
    if (!findUser) {
      return res.send({
        status: 404,
        msg: "User not found",
        data: {},
        purpose,
      });
    }
      const filterData = await homeFilterData(findUser, page);

      return res.send({
        status: 200,
        msg: "User home filter data",
        data: filterData,
        purpose,
      });
  
  }catch(error){
     console.error("Home Page Filter Data Error: ", error);
        return res.send({
          status: 500,
          msg: responseMessages.serverError,
          data: {},
          purpose,
        });
  }
}


/*
|------------------------------------------------ 
| API name          :  fetchHomePageFilterCountryList
| Response          :  Respective response message in JSON format
| Logic             :  Fetch home Page filter country list
| Request URL       :  BASE_URL/api/home-page-filter
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchHomePageFilterCountryList = async(req,res) =>{
  const purpose = 'Fetch home page filter countrylist';
  try{
    const userId = req.headers.userId;
    const { page, search } = req.query;

    const findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
    if (!findUser) {
      return res.send({
        status: 404,
        msg: "User not found",
        data: {},
        purpose,
      }); 
    } 
   
      const filterData = await homeCountryFilterData(findUser, page, search);

      return res.send({
        status: 200,
        msg: "User home filter data",
        data: filterData,
        purpose,
      });
  
  }catch(error){
      console.error("Home Page Filter Country Data Error: ", error);
        return res.send({
          status: 500,
          msg: responseMessages.serverError,
          data: {},
          purpose,
        });
  }
}

module.exports.calculateMetrics = async(req,res) => {
    const purpose ='Calculate Metrics'
    try{

        let page = 1;
        const order = {_id: -1}
        const limit = 50;

        while(true){
           let offset = (page - 1) * limit

            const users = await userRepo.findAllWithPagination({isDeleted: 0, steps: {$gte: 11}}, {
                order, limit, offset
            });
            console.log(users.length,'users')
            if(users.length === 0) break;
            for(let user of users){
                 handleMetrics({userId: user._id,  createdAt: user.createdAt, lastLogin: user.lastLogin, gender: user.gender})
            }

            page++;
        }

        return res.send({
            status : 200,
            message: 'Success',
            data: {},
            purpose
        })
    }catch(error){
        console.log('Calculate Metrics error', error)
        return res.send({
            status: 500,
            message: responseMessages.serverError,
            data: {},
            purpose
        })
    }
}

