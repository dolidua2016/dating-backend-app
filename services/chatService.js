const userReportRepo = require('../repositories/userReportRepo');
const conversationRepo = require('../repositories/conversationRepo');
const responseMessages = require('../responseMessages');

const moment = require('moment');

function getProfileImageUrl(user) {
  if (user.profileImage && user?.isDeleted !== 1 && user?.deactivateAccount !== 1 && user?.isActived !== 0) {
    return process.env.HOST_URL + user.profileImage;
  }
  // if (user.profileImage && user?.deactivateAccount === 1) {
  return process.env.HOST_URL + '/uploads/photos/default-user.png';
  // }
}
function invalidUserResponse(res, purpose) {
  return res.send({
    status: 409,
    msg: responseMessages.invalidUser,
    data: {},
    purpose,
  });
}

function subscriptionErrorResponse(res, purpose) {
  return res.send({
    status: 404,
    msg: responseMessages.subscriptionNotFound,
    data: {},
    purpose,
  });
}

function serverErrorResponse(res, purpose) {
  return res.send({
    status: 500,
    msg: responseMessages.serverError,
    data: {},
    purpose,
  });
}
// Build the user details as response ready
async function buildUserDetails(user, userId, inboxId, type = 'user') {
  return {
    _id: user._id,
    name: user.firstName + ' ' + user.lastName,
    profileImage: type === 'admin' ? user.profileImage : getProfileImageUrl(user),
    isOnline: user.isOnline,
    isReport: !!(await userReportRepo.findOne({
      toUserId: user._id,
      fromUserId: userId,
      inboxId,
      isDeleted: 0,
    })),
    reportMsg: 'You have already reported this.',
    isDeleted: user?.isDeleted,
    isActived: user?.isActived,
    deactivateAccount: user?.deactivateAccount || 0,
    deactivateAccountAt: user?.deactivateAccountAt || null,
  };
}

async function ensureInboxCheck(repo, inboxId, userId) {
  const check = await repo.findOne({
    inboxId,
    userId,
    isDeleted: 0,
    isActived: 1,
  });
  if (!check) {
    await repo.create({ inboxId, userId, isDeleted: 0, isActived: 1 });
  }
}

async function buildConversationData(conversations, userId, anotherUserId, inboxId, today) {
  const conversationData = [];

  const formatDate = (dateStr) => {
    const formatted = new Date(dateStr).toISOString().split('T')[0];
    return formatted === today ? 'Today' : moment(formatted).format('MM-DD-YYYY');
  };

  for (let i = 0; i < conversations.length; i++) {
    const current = conversations[i];
    let insertDate = false;
    let dateLabel;

    if (i === 0) {
      const lastMessage = current;
      const targetDate = new Date(lastMessage.createdAt).toISOString().split('T')[0];
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

      const findPreviousConversation = await conversationRepo.findOne({
        inboxId: current.inboxId,
        _id: { $lt: lastMessage._id },
        isDeleted: 0,
        isActived: 1,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      insertDate = !findPreviousConversation;
      dateLabel = formatDate(current.createdAt);
    } else {
      const prevDate = new Date(conversations[i - 1].createdAt).toISOString().split('T')[0];
      const currDate = new Date(current.createdAt).toISOString().split('T')[0];
      insertDate = prevDate !== currDate;
      dateLabel = formatDate(current.createdAt);
    }

    if (insertDate) {
      conversationData.push(buildDateEntry(dateLabel));
    }

    conversationData.push(await buildMessageEntry(current, userId, anotherUserId));
  }

  return conversationData;
}

function buildDateEntry(dateLabel) {
  return {
    type: 'date',
    _id: '',
    inboxId: '',
    senderId: '',
    content: dateLabel,
    contentType: 'text',
    isRead: 0,
    isActived: 1,
    isDeleted: 0,
    createdAt: '',
    updatedAt: '',
    isReport: false,
    __v: 0,
  };
}

async function buildMessageEntry(current, userId, anotherUserId) {
  return {
    type: 'message',
    _id: current._id,
    inboxId: current.inboxId,
    senderId: current.senderId,
    content: current.contentType === 'image' ? process.env.HOST_URL + current.content : current.content,
    contentType: current.contentType,
    isRead: current.isRead,
    isActived: current.isActived,
    isDeleted: current.isDeleted,
    createdAt: current.createdAt,
    updatedAt: current.updatedAt,
    isReport: !!(await userReportRepo.findOne({
      toUserId: anotherUserId,
      fromUserId: userId,
      isDeleted: 0,
      reportType: 'conversation',
      userConversationId: current._id,
    })),
    __v: 0,
  };
}

module.exports = {
  invalidUserResponse,
  subscriptionErrorResponse,
  serverErrorResponse,
  buildUserDetails,
  ensureInboxCheck,
  buildConversationData,
};
