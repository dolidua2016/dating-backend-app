/*!
 * statisticsController.js
 * Containing all the controller actions related to `Statistics`
 * Author: Sukla Manna
 * Date: 18th July, 2025`
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const userRepo = require('../../repositories/userRepo');
const userSubscriptionDetailsRepo = require('../../repositories/userSubscriptionDetailRepo');
const adminRepo = require('../../repositories/adminRepo');
const transactionRepo = require('../../repositories/transactionRepo');
const inboxRepo = require('../../repositories/inboxRepo');
const conversationRepo = require('../../repositories/conversationRepo')
const userLoginActivityRepo = require('../../repositories/userLoginActivityRepo');
//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');

//############################## Service ############################################ //
const {
  registrationStatisticCountryWise,
  stepCompleteStatistic,
  buildQuery,
  newAccDelAccountRatioStats,
  buildRepeatedUserQuery,
  monthDayWiseAccDelStats
} = require('../../services/registrationStatisticService');

//################################ Packages ###########################//
const moment = require('moment');
const mongoose = require('mongoose');
const DateTimeHelper = require("../../helpers/DateTimeHelper");
const {logger} = require("../../config/loggerConfig");

// Function For Fetch Dashboard Date Wise Data
const getDashboardStatsByType = async (startDate, endDate) => {
  const newUsers = await userRepo.findAll({
    steps: { $gte: 11 },
    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
    isDeleted: 0,
  });

  return {
    month: startDate.format('MMM YYYY'),
    totalUser: newUsers.length,
  };
};

/*
|------------------------------------------------ 
| API name          :  statistics
| Response          :  Respective response message in JSON format
| Logic             :  Statistics
| Request URL       :  BASE_URL/admin/statistics
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.statistics = (req, res) => {
  (async () => {
    let purpose = 'Statistics';
    try {
      const query = req.query;
      const year = query.year ? parseInt(query.year) : moment.utc().year();

      const yearlyData = [];
      let totalUserAnalytics = 0;
      let formattedTransactionHistory = [];
      let where = { steps: { $gte: 11 }, isDeleted: 0 };
      let subscriptionWhere = {};
      let transactionWhere = { isDeleted: 0 };
      let userId = req.headers.userId;
      const data = {};
      const page = query.page ? parseInt(query.page) : 1;
      data.limit = 10;
      data.offset = data.limit ? data.limit * (page - 1) : null;
      data.order = { _id: -1 };

      const adminDetails = await adminRepo.findOne({ _id: userId, isActived: 1, isDeleted: 0 });
      if (!adminDetails) {
        return res.status(404).send({
          status: 404,
          msg: responseMessages.adminDetailsNotFound,
          data: {},
          purpose: purpose,
        });
      }

      for (let month = 0; month < 12; month++) {
        const startDate = moment.utc({ year, month, day: 1 }).startOf('day');
        const endDate = moment.utc(startDate).endOf('month');

        const stats = await getDashboardStatsByType(startDate, endDate);
        totalUserAnalytics += stats.totalUser;

        yearlyData.push(stats);
      }

      let start, end;

      if (query.startDate && query.endDate) {
        // Both dates provided
        start = moment.utc(query.startDate).startOf('day').toDate();
        end = moment.utc(query.endDate).endOf('day').toDate();
      } else if (query.startDate) {
        // Only startDate provided
        start = moment.utc(query.startDate).startOf('day').toDate();
        end = moment.utc(query.startDate).endOf('day').toDate();
      } else {
        // No dates provided → default to today
        start = moment.utc().startOf('day').toDate();
        end = moment.utc().endOf('day').toDate();
      }

      where.createdAt = { $gte: start, $lte: end };
      subscriptionWhere.createdAt = { $gte: start, $lte: end };
      transactionWhere.createdAt = { $gte: start, $lte: end };

      const totalUserCount = (await userRepo.findAll(where)).length;
      const totalSubscriber = await userSubscriptionDetailsRepo.findAll(subscriptionWhere);
      const totalIncome =
        totalSubscriber.length > 0 ? totalSubscriber.reduce((sum, s) => sum + parseFloat(s.planPrice || 0), 0) : 0;

      const transactionLists = await transactionRepo.findAllWithUserDetails(transactionWhere, data);
      if (transactionLists.length > 0) {
        for (const transactionList of transactionLists) {
          formattedTransactionHistory.push({
            name: transactionList.userDetails.firstName + ' ' + transactionList.userDetails.lastName,
            transactionId: transactionList.transactionId,
            createdAt: transactionList.createdAt,
            status: transactionList.status,
            amount: transactionList.planPrice,
          });
        }
      }

      return res.status(200).send({
        status: 200,
        msg: responseMessages.statistics,
        data: {
          totalUserAnalytics: totalUserAnalytics,
          userAnalytics: yearlyData,
          totalUserCount: totalUserCount,
          totalSubscriber: totalSubscriber.length,
          totalIncome: totalIncome.toFixed(2),
          transactionHistory: formattedTransactionHistory,
        },
        purpose,
      });
    } catch (err) {
      console.log('Statistics Error : ', err);
      return res.status(500).send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose,
      });
    }
  })();
};

/*
|------------------------------------------------ 
| API name          :  statistics
| Response          :  Respective response message in JSON format
| Logic             :  Statistics
| Request URL       :  BASE_URL/admin/statistics
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.registrationStatistics = async (req, res) => {
  const purpose = 'Registration Statistics';
  try {
    const { year , month} = req.query;
    // Fetching Data From Service File
    const [allCountryWishData, stepWiseData, totalUsers, newAccDelAccountStats, monthDayWiseStats] = await Promise.all([
      registrationStatisticCountryWise(), // Country-wise registration statistics
      stepCompleteStatistic({}), // Step completion statistics
      userRepo.count({}),
      newAccDelAccountRatioStats(year || new Date().getFullYear()),
      monthDayWiseAccDelStats(new Date().getFullYear(),month)
    ]);

    return res.status(200).send({
      status: 200,
      msg: responseMessages.registrationStatistics,
      data: {
        allCountryWishData: allCountryWishData.countryWiseUserData,
        stepWiseData,
        totalUsers,
        countryList: allCountryWishData.countryList,
        newAccDelAccountStats,
        monthDayWiseStats
      },
      purpose,
    });
  } catch (err) {
    console.log('Registration Statistics Error : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};

/*
|------------------------------------------------ 
| API name          :  searchRegistrationStatistics
| Response          :  Respective response message in JSON format
| Logic             :  Search Registration Statistics
| Request URL       :  BASE_URL/admin/statistics
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.searchRegistrationStatistics = async (req, res) => {
  const purpose = 'Seacrh Registration Statistics';
  try {
    const query = req.query;
    let where = {};

    //Query Date Filter
    if (query.startDate && query.endDate) {
      where.createdAt = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    }
    if (query?.gender) {
      where.gender = query.gender;
    }

    if (query?.countryId) {
      where.countryId = query.countryId;
    }

    const [stepWiseData, totalUsers] = await Promise.all([
      stepCompleteStatistic(where), // Step completion statistics
      userRepo.count(where),
    ]);

    return res.status(200).send({
      status: 200,
      msg: responseMessages.registrationStatistics,
      data: {
        stepWiseData,
        totalUsers,
      },
      purpose,
    });
  } catch (err) {
    console.log('Registration Statistics Error : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};

/*
|------------------------------------------------ 
| API name          :  generalStatistics
| Response          :  Respective response message in JSON format
| Logic             :  General Statistics
| Request URL       :  BASE_URL/admin/statistics
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.generalStatistics = async (req, res) => {
  const purpose = 'General Statistics';
  try {
    const query = req.query;
    let where = {};
    let data = {};
    const page = query.page ? parseInt(query.page) : 1;
    data.limit = 10;
    data.offset = data.limit ? data.limit * (page - 1) : null;
    data.order = { last7Days: -1 };
    data.userFilter = {};
    
    const [repeatedUserStatistics, matchUserList , countryList] = await Promise.all([
      userLoginActivityRepo.findRepeatedUserGeneralStatistic(where,data),
      
      //userRepo.findDormantUserGeneralStatistic(),
      inboxRepo.findMatchUser(where, data),
      userRepo.countUserList({})
      
    ]);

    return res.status(200).send({
      status: 200,
      msg: responseMessages.registrationStatistics,
      data: {
        repeatedUserStatistics,
         matchUserList,
         countryList
      },
      purpose,
    });
  } catch (err) {
    console.log('General StatisticsError : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};

/*
|------------------------------------------------ 
| API name          :  registrationUserFilterList
| Response          :  Respective response message in JSON format
| Logic             :  Registration User Filter List
| Request URL       :  BASE_URL/admin/registration-user-filter-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.registrationUserFilterList = async (req, res) => {
  const purpose = 'Registration User Filter List';
  try {
    const query = req.query;
    let where = buildQuery(query);
    let data = {};
    const page = query.page ? parseInt(query.page) : 1;
    data.limit = 10;
    data.offset = data.limit ? data.limit * (page - 1) : null;
    data.order = { _id: -1 };

    const userList = await userRepo.findUserList(where, data);
    const totalCount = await userRepo.count(where);

    return res.status(200).send({
      status: 200,
      msg: responseMessages.registrationUserFilterList,
      data: {
        userList,
        totalCount,
        pageCount: Math.ceil(totalCount / data.limit),
      },
      purpose,
    });
  } catch (err) {
    console.log('Registration User Filter List Error : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};

/*
|------------------------------------------------ 
| API name          :  repeatedUserList
| Response          :  Respective response message in JSON format
| Logic             :  Repeated User List
| Request URL       :  BASE_URL/admin/repeated-user-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.repeatedUserList = async (req, res) => {
  const purpose = 'Repeated User List';
  try {
    const query = req.query;
    let queryData = buildRepeatedUserQuery(query);

    const repeatedUserStatistics =  await userLoginActivityRepo.findRepeatedUserGeneralStatistic(queryData.where,queryData.data);

    return res.status(200).send({
      status: 200,
      msg: responseMessages.repeatedUserList,
      data: repeatedUserStatistics,
      purpose,
    });
  } catch (err) {
    console.log('Repeated User List Error : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};


/*
|-----------------------------------------------------------------
| API name          :  repeatedUserTimeList
| Response          :  Respective response message in JSON format
| Logic             :  Repeated User Time List
| Request URL       :  BASE_URL/admin/matched-user-times
| Request method    :  GET
| Author            :  Doli Dua
|-----------------------------------------------------------------
*/
module.exports.repeatedUserTimeList = async (req, res) => {
  const purpose = 'Repeated User Time List';
  try {
    const query = req.query;
    const days = query.days ? parseInt(query.days) : 30;

    let where = {userId: mongoose.Types.ObjectId.createFromHexString(query.userId)};
    let data = {};
    data.days = DateTimeHelper.getStartDay(new Date(), days);

    const repeatedUserStatistics =  await userLoginActivityRepo.repeatedTimeList(where, data);
    return res.status(200).send({
      status: 200,
      msg: responseMessages.repeatedUserList,
      data: repeatedUserStatistics,
      purpose,
    });
  } catch (err) {
    console.log('Repeated User Time List Error : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};


/*
|------------------------------------------------ 
| API name          :  matchUserList
| Response          :  Respective response message in JSON format
| Logic             :  Match User List
| Request URL       :  BASE_URL/admin/match-user-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.matchUserList = async (req, res) => {
  const purpose = 'Match User List';
  try {
    const query = req.query;
    let where = {};
    let data = {};
    const page = query.page ? parseInt(query.page) : 1;
    data.limit = 10;
    data.offset = data.limit ? data.limit * (page - 1) : null;
    data.order = {last7Days: -1};
    if (query.sortField && query.sort) {
      data.order = {[query.sortField]: query.sort === 'ASC' ? 1 : -1};
    }
    if (query.countryId) {
      data.where = {...(data.where || {}), ["user.countryId"]: query.countryId}
    }
    if (query.gender) {
      data.where = {...(data.where || {}), ["user.gender"]: query.gender}
    }
    const matchUserList = await inboxRepo.findMatchUser(where, data)

    return res.status(200).send({
      status: 200,
      msg: responseMessages.matchUserList,
      data: matchUserList,
      purpose,
    });
  } catch (err) {
    console.log('Match User List Error : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};


/*
|------------------------------------------------ 
| API name          :  matchedUsers
| Response          :  Respective response message in JSON format
| Logic             :  Matched Users
| Request URL       :  BASE_URL/admin/matched-users
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.matchedUsers = async (req, res) => {
  const purpose = 'Matched Users';
  try {
    const query = req.query;
    const days = query.days ? parseInt(query.days) : 7;

    let where = {
       $or: [
        {firstUserId: mongoose.Types.ObjectId.createFromHexString(query.userId)},
        {secondUserId: mongoose.Types.ObjectId.createFromHexString(query.userId)}
      ],
    };

    let data = {};
    const page = query.page ? parseInt(query.page) : 1;
    data.limit = 10;
    data.offset = data.limit ? data.limit * (page - 1) : null;
    data.order = { _id: -1 };

    const time = DateTimeHelper.getStartDay(new Date(),days);
    
    where.createdAt = { $gte: time };
    data.where = {"user._id": {$ne: mongoose.Types.ObjectId.createFromHexString(query.userId)}}
    
    const repeatedUserStatistics =  await inboxRepo.matchUsers(where, data);

    return res.status(200).send({
      status: 200,
      msg: responseMessages.repeatedUserList,
      data: repeatedUserStatistics,
      purpose,
    });
  } catch (err) {
    console.log('Matched Users Error : ', err);
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
};

/**
 * Controller: Get the chat stats of users
 *
 * @param {Request} req
 * @param {Response} res
 * @return {Promise<void>}
 */
module.exports.chatStats = async (req,res)=>{
  const purpose = "Chat Statistics"
  try {
    const query = req.query
    const where = {isDeleted: 0, isBlockMessaged: 0}
    const data = {}

    const page = query.page ? Number(query.page) : 1
    data.limit = 10
    data.offset = data.limit ? data.limit * (page -1) : null
    
    if(query.countryId){
      data.countryId = query.countryId;
    }

    const [countryList, totalUsersCount, totalChatsCount, totalImagesCount, userList] = await Promise.all([
      userRepo.countUserList({}),
      userRepo.count({}),
      conversationRepo.count({contentType: 'text', isDeleted: 0, isBlockMessaged: 0}),
      conversationRepo.count({contentType: 'image', isDeleted: 0, isBlockMessaged: 0}),
      conversationRepo.findChatUser(where,data)
    ])

    const totalUser =  userList[0]?.totalCount[0]?.count || 0 ;

    return res.status(200).send({
      status: 200,
      msg: "Chat stats fetched successfully",
      data: {
        countryList,
        totalUsers: totalUser, //totalUsersCount,
        totalChatsCount,
        totalImagesCount,
        userList: userList[0]?.data || [],
        totalPage: Math.ceil(totalUser / data.limit)
      },
      purpose
    })
  }catch (error){
    logger.error(`Error in ChatStats line: ${error}`)
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
}

/**
 * Controller: Get the chat stats of users
 *
 * @param {Request} req
 * @param {Response} res
 * @return {Promise<void>}
 */
module.exports.chatUser = async (req,res)=>{
  const purpose = "Chat Users"
  try {
    const query = req.query
    const where = {}
    const data = {}

    const page = query.page ? Number(query.page) : 1
    data.limit = 10
    data.offset = data.limit ? data.limit * (page -1) : null


    const userList = await conversationRepo.findChatUser(where,data)
   

    const totalUser =  userList[0]?.totalCount[0]?.count || 0 ;

    return res.status(200).send({
      status: 200,
      msg: "Chat user fetched successfully",
      data: {
        totalUsers: totalUser, 
        userList: userList[0]?.data || [],
        totalPage: Math.ceil(totalUser / data.limit)
      },
      purpose
    })
  }catch (error){
    logger.error(`Error in Chat User: ${error}`)
    return res.status(500).send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose,
    });
  }
}