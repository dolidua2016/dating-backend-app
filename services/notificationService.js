const { notifyMatch } = require('../helpers/commonFunctions');
const inboxRepo = require('../repositories/inboxRepo');
const userLikeRepo = require('../repositories/userLikeRepo');
const { notifyMatchForMultipleUser } = require('../helpers/commonFunctions');
const { emailTemplateFunction } = require('../helpers/emailTamplateFunction');
const userReports = require('../models/userReports');
const userRepo = require('../repositories/userRepo');
const notificationIconRepo = require('../repositories/notificationIconRepo');

module.exports.matchUsernotification = async (userDetails, receiverUserDetail, inboxId) => {
  const notificationIconData = await notificationIconRepo.findAll({
    type: { $in: ['firstMatch', 'newMatch'] },
    isActived: 1,
    isDeleted: 0,
  });
  const firstMatchIcon = notificationIconData.filter((t) => t.type === 'firstMatch').map((m) => m.icon)[0];
  const newMatchIcon = notificationIconData.filter((t) => t.type === 'newMatch').map((m) => m.icon)[0];

  // Check if this is the first match for sender
  const existingInboxSender = await inboxRepo.findOne({
    _id: { $ne: inboxId },
    $or: [{ firstUserId: userDetails._id }, { secondUserId: userDetails._id }],
    isDeleted: 0,
    isActived: 1,
  });
  if (!existingInboxSender) {
    //Create Notification And Send Push Notification For First User (First Match Milestone)
    const notificationMessageFirstMatch = `Congrats! You've made your first match. Start chatting now.`;
    await notifyMatch(
      userDetails._id,
      receiverUserDetail._id,
      'matchedProfile',
      'First Match Milestone',
      notificationMessageFirstMatch,
      '',
    );
  } else {
    //Create Notification And Send Push Notification For Second User (New Match Found)
    const notificationMessageSecond = `🎉It’s a match! You and ${receiverUserDetail.firstName} have liked each other.`;
    await notifyMatch(
      userDetails._id,
      receiverUserDetail._id,
      'matchedProfile',
      'New Match Found',
      notificationMessageSecond,
      receiverUserDetail._id,
    );
  }

  const email = userDetails.email;
  const subject = !existingInboxSender ? 'First Match Milestone' : 'New Match Found';
  const icon = !existingInboxSender ? process.env.HOST_URL + firstMatchIcon : process.env.HOST_URL + newMatchIcon;
  const messageOne = !existingInboxSender
    ? `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:26px;">Exciting!</h2>`
    : `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:26px;">You’ve matched with</p>`;
  const messageTwo = !existingInboxSender
    ? `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Your first match awaits</p>`
    : `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:30px;">${receiverUserDetail.firstName} </h2>`;
  const messageThree = !existingInboxSender
    ? ''
    : `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Start chatting now!</p>`;
  emailTemplateFunction(email, subject, icon, messageOne, messageTwo, messageThree);

  const existingInboxReceiver = await inboxRepo.findOne({
    _id: { $ne: inboxId },
    $or: [{ firstUserId: receiverUserDetail._id }, { secondUserId: receiverUserDetail._id }],
    isDeleted: 0,
    isActived: 1,
  });

  //Create Notification And Send Push Notification For Second User (First Match Milestone)
  if (!existingInboxReceiver) {
    const notificationMessageSecondMatch = `Congrats! You've made your first match. Start chatting now.`;
    await notifyMatch(
      receiverUserDetail._id,
      userDetails._id,
      'matchedProfile',
      'First Match Milestone',
      notificationMessageSecondMatch,
      '',
    );
  } else {
    //Create Notification And Send Push Notification For First User (New Match Found)
    const notificationMessageFirst = `🎉It’s a match! You and ${userDetails.name} have liked each other.`;
    await notifyMatch(
      receiverUserDetail._id,
      userDetails._id,
      'matchedProfile',
      'New Match Found',
      notificationMessageFirst,
      userDetails._id,
    );
  }

  const receverEmail = receiverUserDetail.email;
  const subjects = !existingInboxReceiver ? 'First Match Milestone' : 'New Match Found';
  const icons = !existingInboxReceiver ? process.env.HOST_URL + firstMatchIcon : process.env.HOST_URL + newMatchIcon;
  const messageOnes = !existingInboxReceiver
    ? `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:26px;">Exciting!</h2>`
    : `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:26px;">You’ve matched with</p>`;
  const messageTwos = !existingInboxReceiver
    ? `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Your first match awaits</p>`
    : `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:30px;">${userDetails.name}</h2>`;
  const messageThrees = !existingInboxReceiver
    ? ''
    : `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Start chatting now!</p>`;
 
  emailTemplateFunction(receverEmail, subjects, icons, messageOnes, messageTwos, messageThrees);

  eventEmiter.emit(
    'matchedUser',
    {
      _id: receiverUserDetail._id,
      name: `${receiverUserDetail.firstName} `,
      profileImage: process.env.HOST_URL + receiverUserDetail.profileImage,
      isOnline: receiverUserDetail.isOnline,
      isSubcription: receiverUserDetail.isSubcription,
      city: receiverUserDetail.city,
      inboxId: inboxId || '',
      isCanChat: true, // (receiverUserDetail.isSubcription || userDetails.isSubcription)
    },
    userDetails._id,
  );
  eventEmiter.emit(
    'matchedUser',
    {
      _id: userDetails._id,
      name: userDetails.name,
      profileImage: process.env.HOST_URL + userDetails.profileImage,
      isOnline: userDetails.isOnline,
      isSubcription: userDetails.isSubcription,
      city: userDetails.city,
      inboxId: inboxId || '',
      isCanChat: receiverUserDetail.isSubcription || userDetails.isSubcription,
    },
    receiverUserDetail._id,
  );
};

/**
 * If User updates their profile then all the user those are connected with that people also notified about the profile modification.
 * Previously it sends the email about any modification, but it's Removed in a previous patch version of 1.0.1
 * @param userDetails
 * @author Doli Dua
 * @since 1.0.0
 * @version 1.0.1
 */
module.exports.updateProfileNotification = async (userDetails) => {
  // If User profile completion steps completed 11 and more then only executes otherwise not
  if (userDetails.steps >= 11) {
    // Find User All Connections And Send Push Notification If Connection Found
    // Get the notification Icon that saved on DB
    const notificationIconData = await notificationIconRepo.findOne({
      type: 'profileUpdate',
      isActived: 1,
      isDeleted: 0,
    });

    // Get all the matched persons with that user
    const matchedInbox = await inboxRepo.findAll({
      $or: [{ firstUserId: userDetails._id }, { secondUserId: userDetails._id }],
      isDeleted: 0,
      isActived: 1,
      isBlocked: false,
    });

    // Get all the matched users Ids. And also check a validation that if user id is the same as second Userid,
    // then add first user id as match user otherwise add the second one user's id as matched User's is
    const matchedUserIds = matchedInbox.map((m) =>
      m.firstUserId.toString() === userDetails._id.toString() ? m.secondUserId : m.firstUserId,
    );

    // Get all the user's details of the matched users and also check that user must be active and non deleted
    const userList = await userRepo.findAll({ _id: { $in: matchedUserIds }, isDeleted: 0, isActived: 1 });
    // Now extract the User ids from the userList that are filtered with non-deleted and active users only
    const userListIds = userList.map((m) => m._id.toString());

    if (userListIds.length > 0) {
      //Create Notification And Send Push Notification (Match Profile Update)
      // Construct the message to send
      const notificationMessage = `${userDetails.firstName} updated their profile! Check out their new details.`;
      // Send Notification
      await notifyMatchForMultipleUser(
        userListIds,
        userDetails._id,
        'userProfile',
        'Match Profile Update',
        notificationMessage,
        userDetails._id,
      );


      //Send Email To All Connections (Match Profile Update)

      //   for (let user of userList) {
      //     const email = user.email;
      //     const subject = 'Match Profile Update';
      //     const icon = process.env.HOST_URL + notificationIconData?.icon;
      //     const messageOne = `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:26px;">${userDetails.firstName}</h2>`;
      //     const messageTwo = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Has new updates.</p>`;
      //     const messageThree = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Take a look!</p>`;
      //     console.log(icon, 'icon');
      //     emailTemplateFunction(email, subject, icon, messageOne, messageTwo, messageThree);
      //   }
    }
  }
};
