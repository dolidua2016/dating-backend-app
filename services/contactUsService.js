const userRepo = require('../repositories/userRepo');
const notificationIconRepo = require('../repositories/notificationIconRepo');
const inboxRepo = require('../repositories/inboxRepo');

const { emailTemplateFunction } = require('../helpers/emailTamplateFunction');
const { buildConversationData} = require('../services/sendMessageService');
const { notifyMatch } = require('../helpers/commonFunctions');


const handleContactUsNotification = async(createConversation, userId, adminId, inboxId) =>{
    console.log('-----------------handle contact us notifications-----',inboxId)
    const user = await userRepo.findOne({_id: userId})
    const today = new Date().toISOString().split("T")[0];
    const inboxData = await inboxRepo.findOne({_id: inboxId});
    console.log(inboxData,'inboxData')
    const receiverUserDetails = {
                        _id: user._id,
                        name: user.firstName + ' ' + user.lastName,
                        profileImage: process.env.HOST_URL + user.profileImage,
                        isOnline: user.isOnline,
                        isSubcription: user.isSubcription,
                        city: user.city,
                        }
    const senderUserDetails = {
                           _id: adminId,
                            name: 'Admin',
                            profileImage: process.env.HOST_URL + '/uploads/photos/photos-1752480265291.png',
                            isOnline: true,
                            isSubcription: true,
                            city: '',
                        }       

    const receiverInboxData = {
                _id: inboxId,
                lastMesaageSenderId: adminId,
                lastMessage:  inboxData.lastMessage,
                lastMessageContentType: inboxData.lastMessageContentType,
                messageCount: 1,
                isAnyMessage: true,
                isCanChat: true, 
                createdAt: inboxData.updatedAt,
                warringMessage: {},
                userDetails: senderUserDetails,
                };   

    const notificationMessage = `📬You have a new message from Admin ! Check it out!`;
    await notifyMatch(
           receiverUserDetails._id,
           senderUserDetails._id,
           'chatDetails',
           'New Message Received',
           notificationMessage,
           createConversation._id,
      );
         const notificationIconData = await notificationIconRepo.findOne({ type: 'message', isActived: 1, isDeleted: 0 });
         const email = user.email;
         const subject = 'New Message Received';
         const icon = process.env.HOST_URL + notificationIconData?.icon;
         const messageOne = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:26px;">New message from</p>`;
         const messageTwo = `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:30px;">${senderUserDetails.name}</h2>`;
         const messageThree = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Waiting for you!</p>`;
         emailTemplateFunction(email, subject, icon, messageOne, messageTwo, messageThree);

          const conversationData = await buildConversationData(
                     createConversation,
                     inboxId,
                     today
                 );
                 console.log(conversationData,'conversationData')
         
                 const responseMessage = {
                     status: 200,
                     msg: "Message send successfully",
                     data: conversationData,
                     metadata: senderUserDetails,
                 };
         
                 console.log(responseMessage,'responseMessage')
                 
                 eventEmiter.emit('autoReplyConversation',user._id, responseMessage, receiverInboxData);
               
}

module.exports = { handleContactUsNotification }