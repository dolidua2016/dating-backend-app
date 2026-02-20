const userRepo = require('../repositories/userRepo');
const userReportRepo = require('../repositories/userReportRepo');
const contactUsRepo = require('../repositories/contactUsRepo');
const inboxRepo = require('../repositories/inboxRepo');
const mongoose = require('mongoose');


async function userList(where) {
  const users = await userRepo.findAll(where);

  const userList = users.map((m) => {
    return {
      _id: m._id,
      firstName: m.firstName,
      lastName: m.lastName,
      name: m?.firstName + m?.lastName,
      email: m.email,
      phone: m?.phone,
      profileImage: m?.profileImage ? process.env.HOST_URL + m?.profileImage : '',
      lastLogin: m?.lastLogin,
      createdAt: m?.createdAt,
      isDeleted: m?.isDeleted,
      steps: m?.steps,
      ejamaatImage: m?.ejamaatImage ? process.env.HOST_URL + m?.ejamaatImage : '',
      ejamaatImageWithOutBase: m?.ejamaatImage ? m?.ejamaatImage : '',
      verifyBadge: m?.verifyBadge,
      ejamaatImageVerificationStatus: m?.ejamaatImageVerificationStatus,
    };
  });

  return userList;
}

async function userCount(where) {
  const count = await userRepo.count(where);
  return count;
}

async function userListWithPage(where, data) {
  const users = await userRepo.findAllWithPagination(where, data);

  const userList = users.map((m) => {
    return {
      _id: m._id,
      firstName: m.firstName,
      lastName: m.lastName,
      name: m?.firstName + m?.lastName,
      email: m.email,
      phone: m?.phone,
      profileImage: m?.profileImage ? process.env.HOST_URL + m?.profileImage : '',
      lastLogin: m?.lastLogin,
      createdAt: m?.createdAt,
      isDeleted: m?.isDeleted,
      steps: m?.steps,
      ejamaatImage: m?.ejamaatImage ? process.env.HOST_URL + m?.ejamaatImage : '',
      ejamaatImageWithOutBase: m?.ejamaatImage ? m?.ejamaatImage : '',
      verifyBadge: m?.verifyBadge,
      ejamaatImageVerificationStatus: m?.ejamaatImageVerificationStatus,
    };
  });

  return userList;
}

function resolveReportReason(reportUser) {
  if (reportUser.reportType === 'image') {
    return process.env.HOST_URL + reportUser.reason;
  }
  return 'N/A';
}

async function repeatedUserList(where, data) {
  const users = await userRepo.CountWithLoginActivity(where, data);

  //  const user List = users.map(m => {
  //     return {
  //         _id: m._id,
  //         firstName: m.firstName,
  //         lastName: m.lastName,
  //         name: m?.firstName + m?.lastName,
  //         email: m.email,
  //         phone: m?.phone,
  //         profileImage: m?.profileImage ? process.env.HOST_URL + m?.profileImage : '',
  //         lastLogin: m?.lastLogin,
  //         createdAt: m?.createdAt,
  //         isDeleted: m?.isDeleted,
  //         steps: m?.steps,
  //         ejamaatImage: m?.ejamaatImage ? process.env.HOST_URL + m?.ejamaatImage : '',
  //         ejamaatImageVerificationStatus: m?.ejamaatImageVerificationStatus
  //     }
  // })

  return users;
}

function getPercentageChange(yesterday, today) {
  // When yesterday = 0 → special case
  if (!yesterday || yesterday === 0) {
    if (today === 0) {
      return {
        type: 'neutral',
        percent: '0%',
        color: '#000000',
        display: '0%',
      };
    }

    return {
      type: 'up',
      percent: '100%',
      color: '#16A34A',
      display: '100% ↑',
    };
  }

  const diff = today - yesterday;
  let percent = Math.abs((diff / yesterday) * 100);

  // Cap percentage to maximum 100%
  percent = Math.min(percent, 100).toFixed(2);

  if (diff > 0) {
    return {
      type: 'up',
      percent: percent + '%',
      color: '#16A34A',
      display: Number(percent) + '% ↑',
    };
  } else if (diff < 0) {
    return {
      type: 'down',
      percent: percent + '%',
      color: '#DC2626',
      display: Number(percent) + '% ↓',
    };
  } else {
    return {
      type: 'neutral',
      percent: '0%',
      color: '#000000',
      display: '0%',
    };
  }
}

const getCountData = async () => {
  // TODAY
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Previous Day
  const previousDay = new Date();
  previousDay.setDate(todayStart.getDate() - 1);
  previousDay.setHours(0, 0, 0, 0);

  // DAY 1 REPEATATION
  //   let activityStartDate = new Date();
  //   activityStartDate.setDate(activityStartDate.getDate() - 1);
  //   let activityEndDate = new Date();
  //   activityStartDate.setHours(0, 0, 0, 0);
  //   activityEndDate.setHours(23, 59, 59, 999);

  // Previous Day repeat
  //   let previousDayStartDate = new Date();
  //   previousDayStartDate.setDate(previousDayStartDate.getDate() - 2);
  //   previousDayStartDate.setHours(0, 0, 0, 0);
  //   let previousDayEndDate = new Date();
  //   previousDayEndDate.setDate(previousDayEndDate.getDate() - 1);
  //   previousDayEndDate.setHours(23, 59, 59, 999);

  const [
    totalUserData,
    // repeatedUserData,
    // previousRepeatUserData,
    todayFilter,
    previousFilter,
    todayActive,
    incompleteProfile,
    deletedUser,
    deletedUserByAdmin,
    nonActiveUsers,
    deactivatedUsers,
    blockDuringVerification,
    eJamaatRequest,
    eJamaatRequestCount,
  ] = await Promise.all([
    userCount({}),
    // repeatedUserList(
    //     { isDeleted: 0, steps: { $gte: 13 } },
    //     {
    //         startDateCount: 1,
    //         endDateCount: 1,
    //         repeatedCount: 1,
    //         activityStartDate: activityStartDate,
    //         activityEndDate: activityEndDate,
    //     }
    // ),
    // repeatedUserList(
    //     { isDeleted: 0, steps: { $gte: 13 } },
    //     {
    //         startDateCount: 1,
    //         endDateCount: 1,
    //         repeatedCount: 1,
    //         activityStartDate: previousDayStartDate,
    //         activityEndDate: previousDayEndDate,
    //     }
    // ),
    userCount({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    userCount({ createdAt: { $gte: previousDay, $lte: todayStart } }),
    userCount({ lastLogin: { $gte: todayStart, $lte: todayEnd } }),
    userCount({ steps: { $lt: 13 }, isDeleted: 0 }),
    userCount({ isDeleted: 1, deletedBy: { $ne: 'Admin' } }), // Count Deleted by user // TODO it is now not deleted by admin or missing will be treated as User
    userCount({ isDeleted: 1, deletedBy: 'Admin' }), // Count Deleted by admin
    userCount({ isDeleted: 0, isActived: 0 }), // Non-active users
    userCount({ deactivateAccount: 1 }), // Deactivated Account by User
    userCount({
      steps: { $gte: 13 },
      isDeleted: 0,
      goToHome: false,
      isVisible: false,
    }),
    userListWithPage(
      {
        ejamaatImage: { $ne: '' },
        ejamaatImageVerificationStatus: 'notStarted',
        steps: { $gte: 13 },
        isDeleted: 0,
      },
      { limit: 11, offset: 0, order: { _id: 1 } },
    ),
    userCount({
      ejamaatImage: { $ne: '' },
      ejamaatImageVerificationStatus: 'notStarted',
      steps: { $gte: 13 },
      isDeleted: 0,
    }),
  ]);

  const registerUserPercentage = getPercentageChange(previousFilter, todayFilter);
  // const repeatedUser Percentage = getPercentageChange(
  //     previousRepeatUserData?.length,
  //     repeatedUserData?.length
  // );

  return {
    totalUserCount: totalUserData,
    todayUserCount: todayFilter,
    eJamaatRequestedUser: eJamaatRequest,
    eJamaatRequestedUserCount: eJamaatRequestCount,
    todayActiveUserCount: todayActive,
    incompleteProfileCount: incompleteProfile,
    deletedUserCount: deletedUser,
    deletedUserByAdminCount: deletedUserByAdmin,
    nonActiveUsersCount: nonActiveUsers,
    deactivatedUsers,
    blockDuringVerificationCount: blockDuringVerification,
    // repeatedUserDataCount: repeatedUserData.length,
    // repeatedUserData: repeatedUserData,
    registerUserPercentage,
    // repeatedUserPercentage,
  };
};

const reportUser = async () => {
  const reportUserData = await userReportRepo.findAllWithUser(
    { isDeleted: 0 },
    { limit: 10, offset: 0, order: { _id: -1 } },
  );

  const dataList = reportUserData.map((reportUser) => ({
    _id: reportUser._id,
    userId: reportUser.userDetails._id,
    name: reportUser.userDetails.firstName + ' ' + reportUser.userDetails.lastName,
    email: reportUser.userDetails.email,
    date: reportUser.createdAt,
    reason: resolveReportReason(reportUser),
    reportType: reportUser?.reportType?.charAt(0)?.toUpperCase() + reportUser?.reportType?.slice(1),
    message: reportUser.userReason !== '' ? reportUser.userReason : reportUser?.reportDetails[0]?.message,
    reportedBy: reportUser?.fromUserDetails?.firstName + ' ' + reportUser?.fromUserDetails?.lastName,
    verifyBadge: reportUser?.userDetails?.verifyBadge,
  }));

  return dataList;
};

const inboxHelpData = async (userId) => {
  const inboxData = await contactUsRepo.findAllWithUserDetails(
    {
      isActived: 1,
      isDeleted: 0,
      readUnread: 0,
    },
    {
      limit: 2,
      offset: 0,
      order: { _id: -1 },
    },
  );

const inboxList = await Promise.all(
  inboxData.map(async (m) => ({
    _id: m._id,
    userId: m.userId,
    name: m.name,
    email: m.email,
    phone: m.phone,
    message: m.message,
    readUnread: m.readUnread,
    profileImage: m.userDetails?.profileImage
      ? `${process.env.HOST_URL}${m.userDetails.profileImage}`
      : "",
    createdAt: m.createdAt,

    inboxData: await inboxRepo.findOne({
      $or: [
        {
          firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          secondUserId: mongoose.Types.ObjectId.createFromHexString(m.userId),
        },
        {
          firstUserId: mongoose.Types.ObjectId.createFromHexString(m.userId),
          secondUserId: mongoose.Types.ObjectId.createFromHexString(userId),
        },
      ],
      isActived: 1,
      isDeleted: 0,
    }),
  }))
);

return inboxList;


  return inboxList;
};

module.exports = {
  getCountData,
  reportUser,
  inboxHelpData,
};
