const conversationRepo = require('../repositories/conversationRepo');
const { notifyMatch } = require('../helpers/commonFunctions');
const { emailTemplateFunction } = require('../helpers/emailTamplateFunction');
const notificationIconRepo = require('../repositories/notificationIconRepo');
const emitError = (socket, emitName, msg) => {
  socket.emit(emitName, { status: 409, msg, data: {}, metadata: {} });
};

const formatDate = (dateStr, today) => {
  const formatted = new Date(dateStr).toISOString().split('T')[0];
  return formatted === today ? 'Today' : formatted;
};

const buildUserDetails = (u) => ({
  _id: u._id,
  name: u.firstName + ' ' + u.lastName,
  profileImage: process.env.HOST_URL + u.profileImage,
  isOnline: u.isOnline,
  isSubcription: u.isSubcription,
  city: u.city,
});

const buildInboxData = (selfDetails, otherDetails, inbox, data, unreadCount) => ({
  _id: inbox._id,
  lastMesaageSenderId: data.senderId,
  lastMessage: data.contentType === 'image' ? process.env.HOST_URL + data.content : data.content,
  lastMessageContentType: data.contentType,
  messageCount: unreadCount,
  isAnyMessage: true,
  isCanChat: true, // selfDetails.isSubcription || otherDetails.isSubcription,
  createdAt: inbox.updatedAt,
  warringMessage: {},
  userDetails: otherDetails,
});

const buildConversationData = async (createConversation, inboxId, today) => {
  const targetDate = new Date(createConversation.createdAt).toISOString().split('T')[0];
  const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
  const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

  const prevConversations = await conversationRepo.findAll({
    inboxId,
    isDeleted: 0,
    isActived: 1,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const insertDate = prevConversations.length === 1;
  const conversationData = [];

  if (insertDate) {
    conversationData.push({
      type: 'date',
      _id: '',
      inboxId: '',
      senderId: '',
      content: formatDate(createConversation.createdAt, today),
      contentType: 'text',
      isRead: 0,
      isActived: 1,
      isDeleted: 0,
      createdAt: '',
      updatedAt: '',
      __v: 0,
    });
  }

  conversationData.push({
    type: 'message',
    _id: createConversation._id,
    inboxId: createConversation.inboxId,
    senderId: createConversation.senderId,
    content:
      createConversation.contentType === 'image'
        ? process.env.HOST_URL + createConversation.content
        : createConversation.content,
    contentType: createConversation.contentType,
    isRead: createConversation.isRead,
    isActived: createConversation.isActived,
    isDeleted: createConversation.isDeleted,
    createdAt: createConversation.createdAt,
    updatedAt: createConversation.updatedAt,
  });

  return conversationData;
};

const handleNotification = async (
  data,
  inbox,
  userDetails,
  receiverDetails,
  receiverId,
  isReceiverInRoom,
  isNotifyMap,
  checkConversation
) => {
  const shouldNotify =
    !isReceiverInRoom && (!isNotifyMap[data.inboxId] || isNotifyMap[data.inboxId][receiverId] !== false);

  if (!shouldNotify) return;

  const notificationMessage = `📬You have a new message from ${userDetails.firstName} ! Check it out!`;
  await notifyMatch(
    receiverDetails._id,
    userDetails._id,
    'chatDetails',
    'New Message Received',
    notificationMessage,
    inbox._id,
  );
  const notificationIconData = await notificationIconRepo.findOne({ type: 'message', isActived: 1, isDeleted: 0 });
  const email = receiverDetails.email;
  const subject = 'New Message Received';
  const icon = process.env.HOST_URL + notificationIconData?.icon;
  const messageOne = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:26px;">New message from</p>`;
  const messageTwo = `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:30px;">${userDetails.firstName}</h2>`;
  const messageThree = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Waiting for you!</p>`;

 



  if (!checkConversation) {

    emailTemplateFunction(email, subject, icon, messageOne, messageTwo, messageThree);
  }

  if (receiverDetails.isOnline) {
    if (!isNotifyMap[data.inboxId]) isNotifyMap[data.inboxId] = {};
    isNotifyMap[data.inboxId][receiverId] = false;
  }
};

module.exports = {
  emitError,
  buildUserDetails,
  buildInboxData,
  buildConversationData,
  handleNotification,
};
