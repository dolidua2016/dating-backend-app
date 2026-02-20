/*!
 * userController.js
 * Containing all the controller actions related to `User`
 * Author: Sukla Manna
 * Date: 17th July, 2025
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const userRepo = require('../../repositories/userRepo');
const userBlockRepo = require('../../repositories/userBlockRepo');
const userReportRepo = require('../../repositories/userReportRepo');
const adminRepo = require('../../repositories/adminRepo');
const userPictureRepo = require('../../repositories/userPictureRepo');
const imageReportRepo = require('../../repositories/imageReportRepo');
const userPictureReportsRepo = require('../../repositories/userImageReportRepo');
const countriesRepo = require('../../repositories/countriesRepo');
const userLoginActivityRepo = require('../../repositories/userLoginActivityRepo');
const inboxRepo = require('../../repositories/inboxRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');

//########################## Common Function #################################//
const { heightToInches } = require('../../helpers/commonFunctions');

//############################### Service ##################################//
const {
  buildUserFilters,
  buildPagination,
  formatUser,
  buildPaginations,
  findAdmin,
  notFound,
  buildReportList,
  buildBlockList,
  formatUserInfo,
  findUser,
  buildAdminReportList,
  buildPaginationsUserDetails,
} = require('../../services/userService');
const {
  buildWrapDetails,
  buildBasicDetails,
  buildProfileQuestions,
  buildInterests,
  buildPersonalityTraits,
  buildGallery,
  buildAppOpenHistory,
  buildAppOpenHistoryWithDateRange,
} = require('../../services/userProfileService');

const { userMatchDetails, userMatchPastDetails, userInboxData } = require('../../services/userDetailsService');
//################################ Packages ###########################//
const mongoose = require('mongoose');

function convertHeight(decimalHeight) {
  const feet = Math.floor(decimalHeight);
  const inches = Math.round((decimalHeight - feet) * 12);
  return `${feet}'${inches}"`;
}

/*
|------------------------------------------------ 
| API name          :  userList
| Response          :  Respective response message in JSON format
| Logic             :  User List
| Request URL       :  BASE_URL/admin/user-list
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.userList = async (req, res) => {
  const purpose = 'User List';

  try {
    const { query, headers } = req;
    const where = buildUserFilters(query);
    const pagination = buildPagination(query);
    let data = {};

    const adminDetails = await adminRepo.findOne({
      _id: headers.userId,
      isActived: 1,
      isDeleted: 0,
    });

    if (!adminDetails) {
      return res.status(404).send({
        status: 404,
        msg: responseMessages.adminDetailsNotFound,
        data: {},
        purpose,
      });
    }

    // 3) Check retention filter
    const isRetentionFilter =
      query.filter === 'day1Repeat' || query.filter === 'day7Repeat' || query.filter === 'day30Repeat';

    // Check reportedFilter
    const reportedFilter = query.filter === 'reportedUsers';

    if (isRetentionFilter) {
      data = {
        startDateCount: query.filter === 'day1Repeat' ? 1 : query.filter === 'day7Repeat' ? 2 : 8,
        endDateCount: query.filter === 'day1Repeat' ? 1 : query.filter === 'day7Repeat' ? 7 : 30,
        repeatedCount: 1,
      };

      data.activityStartDate = new Date();
      data.activityEndDate = new Date();

      if (query.filter === 'day1Repeat') {
        data.activityStartDate.setDate(data.activityStartDate.getDate() - 1);
      } else if (query.filter === 'day7Repeat') {
        data.activityStartDate.setDate(data.activityStartDate.getDate() - 7);
        data.activityEndDate.setDate(data.activityEndDate.getDate() - 2);
      } else {
        data.activityStartDate.setDate(data.activityStartDate.getDate() - 30);
        data.activityEndDate.setDate(data.activityStartDate.getDate() - 8);
      }

      data.activityStartDate.setHours(0, 0, 0, 0);
      data.activityEndDate.setHours(23, 59, 59, 999);
    }

    // 4) Call Repo layer

    let usersPromise = [];
    let countPromise = 0;

    if (!isRetentionFilter && !reportedFilter) {
      usersPromise = userRepo.findAllWithPagination(where, pagination);
      countPromise = userRepo.count(where);
    } else if (isRetentionFilter) {
      usersPromise = userRepo.findAllWithLoginActivity(where, { ...pagination, ...data });
      countPromise = userRepo.CountWithLoginActivity(where, { ...pagination, ...data });
    } else if (reportedFilter) {
      usersPromise = userRepo.findAllWithReportedUsers(where, pagination);
      countPromise = userRepo.countWithReportedUsers(where);
    }

    const [users, totalCount] = await Promise.all([usersPromise, countPromise]);

    const count = Array.isArray(totalCount) ? totalCount.length : totalCount;

    const userFormattedList = await Promise.all(users.map((user) => formatUser(user)));

    return res.status(200).send({
      status: 200,
      msg: responseMessages.userList,
      data: {
        totalPages: Math.ceil(count / pagination.limit),
        totalCount: count,
        userFormattedList,
      },
      purpose,
    });
  } catch (err) {
    console.error('User List Error : ', err);
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
| API name          :  userEnableDisable
| Response          :  Respective response message in JSON format
| Logic             :  User Enable/Disable
| Request URL       :  BASE_URL/admin/user-enable-disable
| Request method    :  PUT
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.userEnableDisable = (req, res) => {
  (async () => {
    let purpose = 'User Enable Disable';
    try {
      const body = req.body;
      let message;
      let userId = req.headers.userId;

      const adminDetails = await adminRepo.findOne({ _id: userId, isActived: 1, isDeleted: 0 });
      if (!adminDetails) {
        return res.status(404).send({
          status: 404,
          msg: responseMessages.adminDetailsNotFound,
          data: {},
          purpose: purpose,
        });
      }

      const findOneUser = await userRepo.findOne({ _id: body.id, isDeleted: 0 });
      if (!findOneUser) {
        return res.status(404).send({
          status: 404,
          msg: responseMessages.userNotFound,
          data: {},
          purpose: purpose,
        });
      }

      if (findOneUser.isActived === 1) {
        await userRepo.update({ _id: findOneUser._id }, { isActived: 0 });
        message = responseMessages.userDisable;

        //eventEmiter.emit('userDeleteOrDisable', findOneUser._id)
        eventEmiter.emit('blockedUser', findOneUser?._id, findOneUser?.reportCount, 0, findOneUser?.isBlocked);
      }

      if (findOneUser.isActived === 0) {
        let updateData = {
          isActived: 1,
        };
        if (findOneUser.isBlocked === 1) {
          updateData.isBlocked = 0;
          updateData.reportCount = 0;
          await userReportRepo.update(
            {
              toUserId: findOneUser._id,
              isReported: 0,
              isDeleted: 0,
            },
            { isReported: 1 },
          );
        }

        await userRepo.update({ _id: findOneUser._id }, updateData);
        eventEmiter.emit('blockedUser', findOneUser?._id, findOneUser?.reportCount, 1, findOneUser?.isBlocked);

        message = responseMessages.userEnable;
      }

      return res.status(200).send({
        status: 200,
        msg: message,
        data: {},
        purpose: purpose,
      });
    } catch (err) {
      console.log('User Enable Disable Error : ', err);
      return res.status(500).send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose,
      });
    }
  })();
};

/*
|------------------------------------------------ 
| API name          :  userDelete
| Response          :  Respective response message in JSON format
| Logic             :  User Delete
| Request URL       :  BASE_URL/admin/user-delete
| Request method    :  PUT
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.userDelete = (req, res) => {
  (async () => {
    let purpose = 'User Delete';
    try {
      const body = req.body;
      let userId = req.headers.userId;

      const adminDetails = await adminRepo.findOne({ _id: userId, isActived: 1, isDeleted: 0 });
      if (!adminDetails) {
        return res.status(404).send({
          status: 404,
          msg: responseMessages.adminDetailsNotFound,
          data: {},
          purpose: purpose,
        });
      }

      const findOneUser = await userRepo.findOne({ _id: body.id, isDeleted: 0 });
      if (!findOneUser) {
        return res.status(404).send({
          status: 404,
          msg: responseMessages.userNotFound,
          data: {},
          purpose: purpose,
        });
      }

      await userRepo.update({ _id: findOneUser._id }, { isDeleted: 1, deletedBy: 'Admin' ,  deletedAt: new Date()});
      eventEmiter.emit('userDeleteOrDisable', body.id);
      return res.status(200).send({
        status: 200,
        msg: responseMessages.userDelete,
        data: {},
        purpose: purpose,
      });
    } catch (err) {
      console.log('User Delete Error : ', err);
      return res.status(500).send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose,
      });
    }
  })();
};


/*
|------------------------------------------------ 
| API name          :  userDetails
| Response          :  Respective response message in JSON format
| Logic             :  User Details
| Request URL       :  BASE_URL/admin/user-details
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.userDetails = (req, res) => {
  (async () => {
    const purpose = 'User Details';
    try {
      const query = req.query;
      const page = query.page ? Number.parseInt(query.page) : 1;
      const pagination = buildPaginationsUserDetails(page, query);
      const userId = req.headers.userId;

      // validate admin
      const adminDetails = await findAdmin(userId);
      if (!adminDetails) return notFound(res, responseMessages.adminDetailsNotFound, purpose);

      // validate user
      const user = await findUser(query.id,false);
      if (!user) return notFound(res, responseMessages.userNotFound, purpose);

      const userInfo = formatUserInfo(user);
      const gallary = await userPictureRepo.findAllWithImage({
        userId: mongoose.Types.ObjectId.createFromHexString(user._id),
        isDeleted: 0,
      });
      userInfo.gallary = gallary.map((pic) => {
        return { ...pic, type: 'picture' };
      });

      if (user.profileImage) {
        userInfo.gallary.unshift({
          image: user.profileImage ? `${process.env.HOST_URL}${user.profileImage}` : '',
          type: 'profile',
          imageVerificationStatus: user.imageVerificationStatus,
        });
      }

      const userDetails = await userRepo.profileDetails({
        _id: mongoose.Types.ObjectId.createFromHexString(query.id),
      });

      let countries = '';
      
      if(userDetails[0]?.countryId){
        countries = await countriesRepo.findOne({ _id: userDetails[0]?.countryId });
      }
         

      const userLoginList = await userLoginActivityRepo.findOne({
        userId: mongoose.Types.ObjectId.createFromHexString(userDetails[0]._id),
      });

      const element = userDetails[0];
      const wrapDetails = buildWrapDetails(element);
      const details = {
        basicDetails: buildBasicDetails(element, countries, wrapDetails, 'myprofile'),
        aboutDetails: element.about,
        profileTextQuestions: buildProfileQuestions(element),
        interestDetails: buildInterests(element),
        personalityTraitsDetails: buildPersonalityTraits(element),
        gallery: userInfo.gallary,
        appOpenHistory: buildAppOpenHistory(userLoginList?.appOpenHistory),
      };

      const imageReports = await imageReportRepo.findAll({});

      const userLimit = user.gender === 'Male' ? 5 : 10;

      //Fetch discover profile visible
      const userMatchData = await userMatchDetails(query.id, page, user, userLimit, 'Present');
      userMatchData.userList.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      //Fetch Match profile
      const inboxData = await userInboxData(query.id);
       // find the Inbox
        const findIndex = await inboxRepo.findOne({
              $or: [
                {
                  firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),
                  secondUserId: mongoose.Types.ObjectId.createFromHexString(query.id),
                },
                {
                  firstUserId: mongoose.Types.ObjectId.createFromHexString(query.id),
                  secondUserId: mongoose.Types.ObjectId.createFromHexString(userId),
                },
              ],
              isActived: 1,
              isDeleted: 0,
         });
      // main listData
      let listData = {};
      if (!query.type || query.type === 'block') {
        listData = await buildBlockList(user._id, query.id, pagination);
      } else if (query.type === 'report') {
        listData = await buildReportList(user._id, query.id, pagination);
      } else {
        console.log('else part ');
        listData = await buildAdminReportList(user._id, query.id, pagination);
      }

      return res.status(200).send({
        status: 200,
        msg: responseMessages.userDetails,
        data: userInfo,
        listData,
        imageReports,
        details,
        userMatchData: userMatchData.userList,
        inboxData: inboxData,
        findIndex: findIndex,
        totalPage: Math.ceil(userMatchData.totalUsers / userLimit),
        purpose,
      });
    } catch (err) {
      console.error('User Details Error : ', err);
      return res.status(500).send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose,
      });
    }
  })();
};

/*|------------------------------------------------ 
| API name          :  userImageReport
| Response          :  Respective response message in JSON format
| Logic             :  User Image Report
| Request URL       :  BASE_URL/admin/user-image-report
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.userImageReport = async (req, res) => {
  let purpose = 'User Image Report';
  try {
    const body = req.body;
    let userId = req.headers.userId;
    const image = body.image.split(process.env.HOST_URL)[1];

    const adminDetails = await adminRepo.findOne({ _id: userId, isActived: 1, isDeleted: 0 });

    if (!adminDetails) {
      return res.send({
        status: 404,
        msg: responseMessages.adminDetailsNotFound,
        data: {},
        purpose: purpose,
      });
    }
    const findOneUser = await userRepo.findOne({ _id: body.userId, isDeleted: 0 });
    if (!findOneUser) {
      return res.send({
        status: 404,
        msg: responseMessages.userNotFound,
        data: {},
        purpose: purpose,
      });
    }

    if (body.type === 'picture') {
      const findOneImage = await userPictureRepo.findOne({
        _id: body.userPictureId,
        userId: body.userId,
        isDeleted: 0,
      });
      console.log();
      if (!findOneImage) {
        return res.send({
          status: 404,
          msg: responseMessages.userImageNotFound,
          data: {},
          purpose: purpose,
        });
      }
    }

    if (body.type === 'profile' || body.type === 'selfie' || body.type === 'ejamaat') {
      const updateData = {};
      const findOneImageReport = await userPictureReportsRepo.findOne({
        userId: body.userId,
        type: body.type,
        image: image,
        isDeleted: 0,
      });
      if (findOneImageReport) {
        return res.send({
          status: 400,
          msg: responseMessages.alreadyReportedProfileImage,
          data: {},
          purpose: purpose,
        });
      }
      if (body.type === 'profile') updateData.imageVerificationStatus = 'error';
      else if (body.type === 'selfie') updateData.selfieImageVerificationStatus = 'error';
      else {
        updateData.ejamaatImageVerificationStatus = 'error';
        updateData.verifyBadge = 1;
      }
      console.log(updateData, 'updateData');
      await userRepo.update({ _id: body.userId }, updateData);
    } else if (body.type === 'picture') {
      const findOneImageReport = await userPictureReportsRepo.findOne({
        userId: body.userId,
        type: 'picture',
        userPictureId: body.userPictureId,
        isDeleted: 0,
      });
      if (findOneImageReport) {
        return res.send({
          status: 400,
          msg: responseMessages.alreadyReportedImage,
          data: {},
          purpose: purpose,
        });
      }

      await userPictureRepo.update(
        {
          userId: body.userId,
          _id: body.userPictureId,
        },
        { imageVerificationStatus: 'error' },
      );
    }

    let createData = {
      userId: body.userId,
      image: image,
      reportedId: body.reportedId,
      reason: body.reason,
      type: body.type,
    };

    if (body?.userPictureId) createData.userPictureId = body?.userPictureId;

    await userPictureReportsRepo.create(createData);

    return res.send({
      status: 200,
      msg: responseMessages.userImageReportSubmitted,
      data: {},
      purpose: purpose,
    });
  } catch (err) {
    console.log('User Image Report Error : ', err);
    return res.send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose: purpose,
    });
  }
};

/*|------------------------------------------------ 
| API name          :  userEjamaatImageAccept
| Response          :  Respective response message in JSON format
| Logic             :  User Image Accept
| Request URL       :  BASE_URL/admin/user-image-report
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.userEjamaatImageAccept = async (req, res) => {
  let purpose = 'User Image Accept';
  try {
    let userId = req.headers.userId;
    let body = req.body;
    const adminDetails = await adminRepo.findOne({ _id: userId, isActived: 1, isDeleted: 0 });

    if (!adminDetails) {
      return res.send({
        status: 404,
        msg: responseMessages.adminDetailsNotFound,
        data: {},
        purpose: purpose,
      });
    }
    const findOneUser = await userRepo.findOne({ _id: body.userId, isDeleted: 0 });
    if (!findOneUser) {
      return res.send({
        status: 404,
        msg: responseMessages.userNotFound,
        data: {},
        purpose: purpose,
      });
    }

    const findOneImageReport = await userPictureReportsRepo.findOne({
      userId: body.userId,
      type: 'ejamaat',
      isDeleted: 0,
    });
    if (findOneImageReport) {
      await userPictureReportsRepo.update({ userId: body.userId, type: 'ejamaat', isDeleted: 0 }, { isDeleted: 1 });
    }

    let updateData = {
      ejamaatImageVerificationStatus: 'completed',
      verifyBadge: 2,
    };

    await userRepo.update({ _id: body.userId }, updateData);

    return res.send({
      status: 200,
      msg: responseMessages.ejamaatImageAproved,
      data: {},
      purpose: purpose,
    });
  } catch (err) {
    console.log('User Image Accept Error : ', err);
    return res.send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose: purpose,
    });
  }
};

/*
|------------------------------------------------ 
| API name          :  userMatchDetails
| Response          :  Respective response message in JSON format
| Logic             :  User Match Details
| Request URL       :  BASE_URL/admin/user-match-details
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.userMatchDetails = (req, res) => {
  (async () => {
    const purpose = 'User Match Details';
    try {
      const query = req.query;
      const page = query.page ? parseInt(query.page) : 1;
      const pagination = buildPaginationsUserDetails(page, query);
      const userId = req.headers.userId;

      // validate admin
      const adminDetails = await findAdmin(userId);
      if (!adminDetails) return notFound(res, responseMessages.adminDetailsNotFound, purpose);

      // validate user
      const user = await userRepo.findOne({_id: query.id});
      
      if (!user) return notFound(res, responseMessages.userNotFound, purpose);

      const userLimit = user.gender === 'Male' ? 5 : 10;
      
      //Fetch match profile
      let userMatchData = [];

      if (query.matchType === 'Past') {
        userMatchData = await userMatchPastDetails(query.id, page, user, userLimit, query.matchType);
      } else {
        userMatchData = await userMatchDetails(query.id, page, user, userLimit, query.matchType);
      }

      return res.status(200).send({
        status: 200,
        msg: responseMessages.userDetails,
        userMatchData: userMatchData.userList,
        totalCount: userMatchData.totalUsers,
        totalPage: Math.ceil(userMatchData.totalUsers / userLimit),
        purpose,
      });
    } catch (err) {
      console.error('User Details Error : ', err);
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
| API name          :  userLastLogin
| Response          :  Respective response message in JSON format
| Logic             :  User Lats Login
| Request URL       :  BASE_URL/admin/fetch-user-last-login
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.userLastLogin = (req, res) => {
  (async () => {
    const purpose = 'User Last Login';
    try {
      const query = req.query;
      const page = query.page ? parseInt(query.page) : 1;
      const pagination = buildPaginationsUserDetails(page, query);
      const userId = req.headers.userId;

      // validate admin
      const adminDetails = await findAdmin(userId);
      if (!adminDetails) return notFound(res, responseMessages.adminDetailsNotFound, purpose);

      // validate user
      const user = await findUser(query.id);
      if (!user) return notFound(res, responseMessages.userNotFound, purpose);

      const userLoginList = await userLoginActivityRepo.findOne({
        userId: mongoose.Types.ObjectId.createFromHexString(user._id),
      });

      const details = {
        appOpenHistory: buildAppOpenHistoryWithDateRange(userLoginList?.appOpenHistory, query.startDate, query.endDate),
      };

      return res.status(200).send({
        status: 200,
        msg: responseMessages.userDetails,
        data: details,
        purpose,
      });
    } catch (err) {
      console.error('User Last Login Error : ', err);
      return res.status(500).send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose,
      });
    }
  })();
};
