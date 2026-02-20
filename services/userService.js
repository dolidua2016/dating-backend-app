const mongoose = require("mongoose");
const { Types } = mongoose;
const userBlockRepo = require('../repositories/userBlockRepo');
const userRepo = require('../repositories/userRepo');
const adminRepo = require('../repositories/adminRepo');
const userReportRepo = require('../repositories/userReportRepo');
const userPictureReport = require('../repositories/userImageReportRepo');

function convertHeight(decimalHeight) {
  const feet = Math.floor(decimalHeight);
  const inches = Math.round((decimalHeight - feet) * 12);
  return `${feet}'${inches}"`;
}

async function blockuser(where, type) {
  const blockUserList = [];
  let count = 0
  if (type == 'iBlock') {
    const blockUsers = await userBlockRepo.findAllBlockUserWithoutPagination(where);
    count = blockUsers.length
    if (blockUsers.length > 0) {
      for (let blockUser of blockUsers.slice(0, 10)) {
        blockUserList.push({
          name: blockUser.userDetails.name,
          phone: blockUser.userDetails.phone,
        })
      }
    }
  } else {
    const blockUsers = await userBlockRepo.findAllBlockMeUserWithoutPagination(where);
    count = blockUsers.length
    if (blockUsers.length > 0) {
      for (let blockUser of blockUsers.slice(0, 10)) {
        blockUserList.push({
          name: blockUser.userDetails.name,
          phone: blockUser.userDetails.phone,
        })
      }
    }
  }

  return { blockUserList, count };

}


//build filters based on query params
function buildUserFilters(query) {
  const where = { isDeleted: 0}; //steps: { $gte: 11 } 
  const search = query?.search.trim();
  const [first, last] = search.split(" ");
  if (query.search) {
    where.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      {
        $and: [
          { firstName: { $regex: first, $options: "i" } },
          { lastName: { $regex: last || "", $options: "i" } }
        ]
      }
    ];


  }

  if (query.filter === "subscribe") {
    where.isSubcription = true;
  }
  else if (query.filter === "nonsubscribe") {
    where.isSubcription = false;
  }
  else if(query.filter === "requested")
  {
    where.ejamaatImage = {$ne: ''};
    where.ejamaatImageVerificationStatus = 'notStarted'
  }
  else if(query.filter === "blocked"){
    where.isBlocked = 1;
  }
  else if(query.filter === "newUser"){
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    where.createdAt = {$gte: todayStart}

  }
  else if(query.filter ===  'activeToday'){
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
     where.lastLogin = {$gte: todayStart}
  }
  else if(query.filter ===  'incompleteProfile'){
      where.steps = {$lt: 13}
  }
  else if(query.filter ===  'deleteUserByApp'){
      where.isDeleted = 1;
      where.deletedBy = {$ne: 'Admin'}
  }
  else if(query.filter ===  'deleteUserByAdmin'){
      where.isDeleted = 1;
      where.deletedBy = 'Admin'
  }
  else if(query.filter ===  'disableUser'){
      where.isActived = 0;
  }
  else if(query.filter ===  'deactivatedUser'){
      where.deactivateAccount = 1;
  }
  else if(query.filter ===  'blockedDuringVerification'){
      where.goToHome = false;
      where.isVisible = false;
      where.steps = 13;
  }
  return where;
}

// pagination data
function buildPagination(query) {
  const page = query.page ? parseInt(query.page) : 1;
  const limit = 20;

  return {
    limit,
    offset: limit * (page - 1),
    order: { _id: -1 },
    page
  };
}

// format single user with block info
async function formatUser(user) {
  const fromUserId = Types.ObjectId.createFromHexString(user._id);

  const usersIBlocked = await blockuser(
    { fromUserId, isDeleted: 0, isActived: 1 },
    "iBlock"
  );

  const usersBlockedMe = await blockuser(
    { toUserId: fromUserId, isDeleted: 0, isActived: 1 },
    "blockMe"
  );

  return {
    id: user._id,
    name: user.firstName + ' ' + user.lastName,
    phone: user.phone,
    email: user.email,
    isActived: user.isActived,
    isSubcription: user.isSubcription,
    blockedUserCount: usersIBlocked.count,
    blockedUsers: usersIBlocked.blockUserList,
    blockedByUserCount: usersBlockedMe.count,
    blockedByUsers: usersBlockedMe.blockUserList,
    isBlocked: user.isBlocked,
    verifyBadge: user.verifyBadge,
    requestBadge: (user?.ejamaatImage !== '' && user?.ejamaatImageVerificationStatus === 'notStarted') ? true : false,
    ejamaatImage: user?.ejamaatImage,
    ejamaatImageVerificationStatus: user?.ejamaatImageVerificationStatus,
    isDeleted: user?.isDeleted,
    lastLogin: user?.lastLogin,
    isVisible: user?.isVisible,
    visible: (user?.isVisible && user?.steps >= 13 && user?.isActived === 1 && user?.deactivateAccount === 0 ) ? "Yes" : "No",
    deleteReason: user?.deleteReason ? user.deleteReason : null,
    isDeactivateAccount: user?.deactivateAccount,
    steps: user?.steps,
    deactiveAccountAt: user?.deactiveAccountAt || null,
  };
}

function buildPaginations(page) {
  return {
    limit: 10,
    offset: 10 * (page - 1),
    order: { _id: -1 },
    where: {
      isDeleted: 0,

    },
  };
}

function buildPaginationsUserDetails(page, query) {
  let data = {
    limit: 10,
    offset: 10 * (page - 1),
    order: { _id: -1 },
    where: {
      isDeleted: 0,
    }
  };
  if (query.search) {
    const search = query?.search.trim();
    const [first, last] = search.split(" ");
    data.where.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      {
        $and: [
          { firstName: { $regex: first, $options: "i" } },
          { lastName: { $regex: last || "", $options: "i" } }
        ]
      }
    ];
  }

  return data;

}

async function findAdmin(userId) {
  return adminRepo.findOne({ _id: userId, isActived: 1, isDeleted: 0 });
}

/**
 * Finds a user by ID.
 *
 * By default, deleted users are included.
 * Set `includeDeleted` to false to exclude deleted users as well.
 *
 * @param {string} id - User ID
 * @param {boolean} [includeDeleted=true] - Whether to include deleted users
 * @returns {Promise<Object|null>}
 * @since v1.0.1
 * @version v1.0.2
 */
async function findUser(id, includeDeleted  = true) {
  return userRepo.findOne({_id: id, ...(includeDeleted  ? {isDeleted: 0} : {})});
}

function formatUserInfo(user) {
  return {
    id: user._id,
    profileImage: user.profileImage ? `${process.env.HOST_URL}${user.profileImage}` : "",
    name: user.firstName + ' ' + user.lastName,
    gender: user.gender,
    dob: user.dateOfBirth,
    phone: user.phone,
    email: user.email,
    address: user.address,
    height: convertHeight(user?.height),
    education: user.education,
    profession: user.profession,
    maritalStatus: user.maritalStatus,
    married: user.married,
    religious: user.religious,
    kids: user.kids,
    isActived: user.isActived,
    createdAt: user.createdAt,
    lastLogin: user?.lastLogin,
    selfieImage: user.selfieImage ? `${process.env.HOST_URL}${user.selfieImage}` : "",
    selfieImageVerificationStatus: user.selfieImageVerificationStatus,
    ejamaatImageVerificationStatus: user.ejamaatImageVerificationStatus,
    ejamaatImage: user.ejamaatImage ? `${process.env.HOST_URL}${user.ejamaatImage}` : "",
    verifyBadge: user?.verifyBadge ?? 0,
  };
}

async function buildBlockList(userObjectId, queryId, pagination) {
  const filter = {
    $or: [{ fromUserId: mongoose.Types.ObjectId.createFromHexString(userObjectId) }, { toUserId: mongoose.Types.ObjectId.createFromHexString(userObjectId) }],
    isDeleted: 0,
    isActived: 1,
  };

  const blockUsers = await userBlockRepo.findAllBlockUserForUserDetailsWithMyAndMe(filter, pagination);
  const totalCount = await userBlockRepo.count(filter);

  const dataList = blockUsers.map((blockUser) => ({
    blockedByMe: blockUser.blockByMe._id === queryId ? "You" : blockUser.blockByMe.firstName + ' ' + blockUser.blockByMe.lastName,
    blockedMe: blockUser.blockedMe._id === queryId ? "You" : blockUser.blockedMe.firstName + ' ' + blockUser.blockedMe.lastName,
    phone: blockUser.blockedMe._id === queryId ? blockUser.blockByMe.phone : blockUser.blockedMe.phone,
    date: blockUser.createdAt,
    reason: "",
  }));

  return buildListData(dataList, totalCount, pagination.limit);
}

async function buildReportList(userObjectId, queryId, pagination) {
  const filter = {
    $or: [{ fromUserId: mongoose.Types.ObjectId.createFromHexString(userObjectId) }, { toUserId: mongoose.Types.ObjectId.createFromHexString(userObjectId) }],
    isDeleted: 0,
    isActived: 1,
  };

  const userReports = await userReportRepo.findAllWithUserReportedByMeAndWhomIReported(filter, pagination);
  const totalCount = await userReportRepo.count(filter);

  const dataList = userReports.map((reportUser) => ({
    reportedTo: reportUser.reportedTo._id === queryId ? "You" : reportUser.reportedTo.firstName + ' ' + reportUser.reportedTo.lastName,
    reportedBy: reportUser.reportedBy._id === queryId ? "You" : reportUser.reportedBy.firstName + ' ' + reportUser.reportedBy.lastName,
    phone: reportUser.reportedTo._id === queryId ? reportUser.reportedBy.phone : reportUser.reportedTo.phone,
    date: reportUser.createdAt,
    reason: resolveReportReason(reportUser),
    reportType: (reportUser?.reportType)?.charAt(0)?.toUpperCase() + (reportUser?.reportType)?.slice(1),
    message: (reportUser.userReason !== '') ? reportUser.userReason : reportUser?.reportDetails[0]?.message,
  }));
  return buildListData(dataList, totalCount, pagination.limit);
}

async function buildAdminReportList(userObjectId, queryId, pagination) {
  const filter = {
    $or: [{ userId: mongoose.Types.ObjectId.createFromHexString(userObjectId) }],
    isActived: 1,
  };

  const userReports = await userPictureReport.findAllWithUserReportedByMeAndWhomIReported(filter, pagination);
  const totalCount = await userPictureReport.count(filter);

  const dataList = userReports.map((reportUser) => ({
    reportedTo: reportUser.reportedTo.firstName + ' ' + reportUser.reportedTo.lastName,
    reportedBy: 'Admin',
    phone: reportUser.reportedTo.phone,
    date: reportUser.createdAt,
    reason: process.env.HOST_URL + reportUser.image,
    reportType: (reportUser?.type)?.charAt(0)?.toUpperCase() + (reportUser?.type)?.slice(1),
    message: (reportUser.reason !== '') ? reportUser.reason : reportUser?.reportDetails[0]?.message,
  }));
  return buildListData(dataList, totalCount, pagination.limit);
}

function resolveReportReason(reportUser) {
  if (reportUser.reportType === "image") {
    return process.env.HOST_URL + reportUser.reason;
  }
  // if (reportUser?.reason) {
  //   return reportUser.reason;
  // }
  return 'N/A';
}

function buildListData(dataList, totalCount, limit) {
  return {
    totalCount,
    dataList,
    totalPages: Math.ceil(totalCount / limit),
  };
}

function notFound(res, msg, purpose) {
  return res.status(404).send({
    status: 404,
    msg,
    data: {},
    purpose,
  });
}

module.exports = {
  buildUserFilters,
  buildPagination,
  formatUser,
  buildPaginations,
  findAdmin,
  findUser,
  formatUserInfo,
  buildBlockList,
  buildReportList,
  notFound,
  buildAdminReportList,
  buildPaginationsUserDetails
}