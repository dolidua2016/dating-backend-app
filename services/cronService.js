const conversationRepo  = require('../repositories/conversationRepo');
const  inboxRepo  = require('../repositories/inboxRepo');
const  userRepo  = require('../repositories/userRepo');
const { notifyMatch } = require('../helpers/commonFunctions');
const { sendPushNotificationsForSingleUser } = require('../helpers/notificationFunctions');
const moment   = require('moment');


//  01:00 AM – Light job
// async function unansweredMessageReminder() {
//   const purpose = 'Reminder for Unanswered Messages';
//   try {
//     const beforeTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

//     const cursor = await conversationRepo.findAllWithInbox(
//       {
//         isRead: 0,
//         isActived: 1,
//         isDeleted: 0,
//         isBlockMessaged: 0,
//         createdAt: { $lte: beforeTime }
//       },
//       { senderId: 1, inboxId: 1, inboxDetails: 1 }
//     );

    
//     for await (const convo of cursor) {
//       const sender = await userRepo.findOne(
//         { _id: convo.senderId, isDeleted: 0, isActived: 1 },
//         { firstName: 1, lastName: 1 }
//       );

//       if (!sender) continue;

//       const { firstUserId, secondUserId } = convo.inboxDetails[0];
//       const toUserId =
//         convo.senderId.toString() === firstUserId.toString()
//           ? secondUserId
//           : firstUserId;

//       await notifyMatch(
//         toUserId,
//         convo.senderId,
//         'chatDetails',
//         'Reminder for Unanswered Messages',
//         `${sender.firstName} ${sender.lastName} is waiting for your reply.`,
//         convo.inboxId
//       );
//     }
//   } catch (err) {
//     console.error(purpose, err);
//   }
// }

// 01:30 AM – Medium job
async function friendAnniversaryReminder() {
  const purpose = 'Friend Anniversary';

  try {
    const start = moment().subtract(1, 'months').startOf('day').toDate();
    const end = moment().subtract(1, 'months').endOf('day').toDate();

    
    const inboxes = await inboxRepo.findAll(
      {
        isActived: 1,
        isDeleted: 0,
        isBlocked: false,
        createdAt: { $gte: start, $lte: end }
      },
      { firstUserId: 1, secondUserId: 1 }
    );

    for (const inbox of inboxes) {
      const users = await userRepo.findAll(
        { _id: { $in: [inbox.firstUserId, inbox.secondUserId] } },
        { firstName: 1, lastName: 1 }
      );

      if (users.length !== 2) continue;

      await notifyMatch(
        inbox.firstUserId,
        inbox.secondUserId,
        'chatList',
        'Friend Anniversary',
        `Happy 1-month of knowing ${users[1].firstName}!`,
        ''
      );

      await notifyMatch(
        inbox.secondUserId,
        inbox.firstUserId,
        'chatList',
        'Friend Anniversary',
        `Happy 1-month of knowing ${users[0].firstName}!`,
        ''
      );
    }
  } catch (err) {
    console.error(purpose, err);
  }
}

// Profile Completion Reminder - runs daily at 2:00 AM
async function profileCompletionReminder() {
   const purpose = 'Profile Completion Reminder';
  const PAGE_SIZE = 100;
  let page = 0; 

  try {
    const now = moment().subtract(1, 'hours');

    const reminderRanges = [
      moment(now).subtract(1, 'days'),
      moment(now).subtract(14, 'days'),
      moment(now).subtract(21, 'days'),
      moment(now).subtract(24, 'days')
    ].map(d => ({
      createdAt: {
        $gte: d.startOf('day').toDate(),
        $lte: d.endOf('day').toDate()
      }
    }));

    
    while (true) {
      const users = await userRepo.findAllWithPagination(
        {
          steps: { $lt: 13},
          notificationAllow: 'true',
          isDeleted: 0,
          isActived: 1,
          $or: reminderRanges
        },
        // { _id: 1, steps: 1
        // },
       {
         limit : PAGE_SIZE,
         offset: page * PAGE_SIZE
    }
      );

      if (!users.length) break;

      for (const user of users) {
        const notifyData = {
          title: 'Profile Completion Reminder',
          type: 'inCompleteProfile',
          userId: user._id,
          linkedId: user._id,
          linkedUserId: user._id,
          message: 'Complete your profile to get more matches.',
          steps: String(user.steps)
        };

        await sendPushNotificationsForSingleUser(notifyData);
      }

      page++;
    }

    console.log(`[${purpose}] Completed successfully`);
  } catch (err) {
    console.error(`${purpose} Error:`, err);
  }
}

module.exports = {
  // unansweredMessageReminder,
  friendAnniversaryReminder,
  profileCompletionReminder
};


