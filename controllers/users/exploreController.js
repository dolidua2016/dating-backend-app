/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 24th Dec, 2024`
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const userRepo = require("../../repositories/userRepo");
const userPassesRepo = require("../../repositories/userPassesRepo");
const userFavoritesRepo = require("../../repositories/userFavoritesRepo");
const userLikeRepo = require("../../repositories/userLikeRepo");
const userBlockRepo = require("../../repositories/userBlockRepo");
const conversationRepo = require("../../repositories/conversationRepo");
const inboxRepo = require('../../repositories/inboxRepo');

//################################ Response Message ###########################//
const responseMessages = require("../../responseMessages");
const mongoose = require("mongoose");

/*
|------------------------------------------------ 
| API name          :  fetchExplorePageData
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Liked Me, I Liked And Passed User List
| Request URL       :  BASE_URL/api/fetch-likes-data
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Get Explore page
 * @param {Request} req
 * @param {Response} res
 * @author Doli Dua
 * @since 1.0.0
 * @since 1.0.0
 */
module.exports.fetchExplorePageData = (req, res) => {
  (async () => {
    let purpose = "Fetch Liked Me, I Liked And Passed User List";
    try {
      let userId = req.headers.userId;
      let query = req.query;
      // Construct the Data from request query and requirements for filter and others
      let data = {};
      let page = req.query.page ? parseInt(req.query.page) : 1;
      data.limit = 12; //* SET limit amount
      data.offset = (page - 1) * data.limit; //* Get the SKIP amount
      data.deactivateAccount = {deactivateAccount: {$ne: 1}} // TODO

      let UserDetails = [];
      let totalCount = 0;
      // Check the existence of the user
      let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
      if (!findUser) {
        return res.send({
          status: 409,
          msg: responseMessages.invalidUser,
          data: {},
          purpose: purpose
        })
      }

      // If Query is blank or likedMe is want to filter, then only executes
      if (query.type == "" || query.type == "likedMe") {
        // Set user details with liked me users
        UserDetails = await userLikeRepo.findLikeMeUser(
            {
              toUserId: mongoose.Types.ObjectId.createFromHexString(userId),
              isDeleted: 0,
              isActived: 1,
            },
            data
        );
        // Get the total count of the Liked Me Users
        totalCount = await userLikeRepo.findLikeMeTotalUser({
          toUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          isDeleted: 0,
          isActived: 1,
        }, data);

        // Mark all unread like notifications as read once the user visits the Likes/Explore page,
        // ensuring the notification badge/count does not persist after the data has been viewed.
        await userLikeRepo.updateMany({toUserId: userId, isDeleted: 0, isActived: 1, isRead: 0}, {isRead: 1});

        // Construct the DB query
        let where = {
          $or: [
            {firstUserId: mongoose.Types.ObjectId.createFromHexString(userId)},
            {secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)}],
          isActived: 1,
          isDeleted: 0,
          isBlocked: false
        };
        // Fetch all the inbox id's
        let inboxId = (await inboxRepo.findAll(where)).map(m => mongoose.Types.ObjectId.createFromHexString(m._id))

        // Get all unread messages
        let unreadMessages = await conversationRepo.count({
          inboxId: {$in: inboxId},
          receiverId: userId,
          isDeleted: 0,
          isRead: 0,
          isBlockMessaged: 0
        });

        eventEmiter.emit('likedMeCounts', userId, 0, unreadMessages);

      } else if (query.type == "iLiked") {
        UserDetails = await userLikeRepo.findAllUser(
            {
              fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
              isDeleted: 0,
              isActived: 1,
            },
            data
        );
        totalCount = await userLikeRepo.findTotalUser({
          fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          isDeleted: 0,
          isActived: 1,
        }, data);
      } else if (query.type == "passed") {
        UserDetails = await userPassesRepo.findAllPassUser(
            {
              fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
              isDeleted: 0,
              isActived: 1,

            },
            data
        );
        totalCount = await userPassesRepo.findTotalUser({
          fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          isDeleted: 0,
          isActived: 1,

        }, data);
      }

      // Construct the Result for perfect response JSON obj
      const Result = await Promise.all(
          UserDetails.map(async (element) => ({
            _id: element.userDetails._id,
            name: element.userDetails.firstName + ' ' + element.userDetails.lastName,
            profileImage: element?.userDetails?.profileImage ? process.env.HOST_URL + element.userDetails.profileImage : '',
            address: element.userDetails.address,
            dob: element.userDetails.dob,
            createdAt: element.createdAt,
            verifyBadge: element.userDetails?.verifyBadge ?? 0,
            privacyLocked: (element?.userDetails?.privacyLocked === 0 || !!(await inboxRepo.findOne({
              $or: [{
                firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),
                secondUserId: mongoose.Types.ObjectId.createFromHexString(element.userDetails._id)
              }, {
                firstUserId: mongoose.Types.ObjectId.createFromHexString(element.userDetails._id),
                secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)
              }], isActived: 1, isDeleted: 0
            }))) ? 0 : 1,
            deactivateAccountAt: element?.userDetails?.deactivateAccountAt || null,
          }))
      );

      // Sort the result in descending order
      Result.sort((a, b) => b.createdAt - a.createdAt);

      return res.send({
        status: 200,
        msg: responseMessages.allowNotification,
        data: {userList: Result, totalCount: totalCount.length || 0},
        userDetails: {
          _id: findUser._id,
          name: findUser.firstName + ' ' + findUser.lastName,
          email: findUser?.email,
          gender: findUser.gender,
          lookingFor: findUser.lookingFor,
          deactivateAccountAt: findUser?.deactivateAccountAt || null,
          deactivateAccount: findUser?.deactivateAccount || 0,
          isSubcription: findUser?.isSubcription || false,
        },
        purpose: purpose,
      });
    } catch (err) {
      console.log("Fetch Liked Me, I Liked And Passed User List Error : ", err);
      return res.send({
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
| API name          :  fetchFavoriteUserList
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Favorite User List
| Request URL       :  BASE_URL/api/fetch-favorite-user-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Previously its Fetch the favourite Users list
 * @param {Request} req
 * @param {Response} res
 * @deprecated
 */
module.exports.fetchFavoriteUserList = (req, res) => {
  (async () => {
    let purpose = "Fetch Favorite User List";
    try {
      let userId = req.headers.userId;
      let data = {};
      let page = req.query.page ? parseInt(req.query.page) : 1;
      data.limit = 12;
      data.offset = (page - 1) * data.limit;
      let UserDetails = [];
      let totalCount = 0;

      UserDetails = await userFavoritesRepo.findAllFavoriteUser(
        {
          fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          isDeleted: 0,
          isActived: 1,
        },
        data
      );
      totalCount = await userFavoritesRepo.findTotalUser({
        fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
        isDeleted: 0,
        isActived: 1,
      });

      const Result = await Promise.all(
        UserDetails.map(async (element) => ({
          _id: element.userDetails._id,
          name: element.userDetails.firstName + ' ' + element.userDetails.lastName,
          profileImage: element?.userDetails?.profileImage ? process.env.HOST_URL + element.userDetails.profileImage : '',
          address: element.userDetails.city,
          createdAt: element.createdAt,
          verifyBadge: element.userDetails?.verifyBadge ?? 0,
          
        }))
      );

      return res.send({
        status: 200,
        msg: responseMessages.allowNotification,
        data: { userList: Result, totalCount: totalCount.length,  },
        purpose: purpose,
      });
    } catch (err) {
      console.log("Fetch Favorite User List Error : ", err);
      return res.send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose,
      });
    }
  })();
};

/**
 * @description helper to construct profile image
 * @param user
 * @return {string}
 */
function getProfileImageUrl(user) {
  if (user.profileImage && user?.isDeleted !== 1 && user?.deactivateAccount !== 1 && user?.isActived !== 0) {
    return process.env.HOST_URL + user.profileImage;
  }
  // if (user.profileImage && user?.deactivateAccount === 1) { \\
  return process.env.HOST_URL + '/uploads/photos/default-user.png';
  // }
  // return process.env.HOST_URL + '/uploads/photos/photos-1752480265291.png';
}

/*
|------------------------------------------------ 
| API name          :  fetchBlockUserList
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Block User List
| Request URL       :  BASE_URL/api/block-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Fetch the Blocklist of the user
 * @param {Request} req
 * @param {Response} res
 * @author Doli Dua
 * @since 1.0.0
 * @version 1.0.0
 */
module.exports.fetchBlockUserList = (req, res) => {
  (async () => {
    let purpose = "Fetch Block User List";
    try {
      let userId = req.headers.userId;
      let data = {};
      let page = req.query.page ? parseInt(req.query.page) : 1;
      data.limit = 12; // Set the limit to 12
      data.offset = (page - 1) * data.limit; // Set the page offset or skip value
      let UserDetails = [];
      let totalCount = 0;
      // Find all the blocked user details
      UserDetails = await userBlockRepo.findAllBlockUser(
        {
          fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          isDeleted: 0,
          isActived: 1,
        },
        data
      );
      
      // Get total count of Blocked users
      totalCount = await userBlockRepo.findTotalUser({
        fromUserId: mongoose.Types.ObjectId.createFromHexString(userId),
        isDeleted: 0,
        isActived: 1,
      });

      const Result = await Promise.all(
        UserDetails.map(async (element) => ({
          _id: element.userDetails._id,
          name: element.userDetails.firstName + ' ' + element.userDetails.lastName,
          profileImage: element?.userDetails ? getProfileImageUrl(element?.userDetails) : '', // element?.userDetails?.profileImage ? process.env.HOST_URL + element.userDetails.profileImage : '',
          address: element.userDetails.city,
          createdAt: element.createdAt,
          verifyBadge: element.userDetails?.verifyBadge ?? 0,
        }))
      );

      return res.send({
        status: 200,
        msg: responseMessages.allowNotification,
        data: { userList: Result, totalCount: totalCount.length },
        purpose: purpose,
      });
    } catch (err) {
      console.log("Fetch Block User List Error : ", err);
      return res.send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose,
      });
    }
  })();
};

