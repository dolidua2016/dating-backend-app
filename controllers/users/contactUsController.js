/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 24th Dec, 2024`
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const adminRepo     = require("../../repositories/adminRepo");
const contactUsRepo = require('../../repositories/contactUsRepo');
const inboxRepo     = require('../../repositories/inboxRepo');
const conversationRepo = require('../../repositories/conversationRepo');

//################################ Response Message ###########################//
const responseMessages = require("../../responseMessages");


const {handleContactUsNotification } = require('../../services/contactUsService')

/*
|------------------------------------------------ 
| API name          :  fetchContactUsData
| Response          :  Respective response message in JSON format
| Logic             :  Fetch CMS
| Request URL       :  BASE_URL/api/fetch-contact-us
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchContactUsData = (req, res) => {
  (async () => {
    let purpose = "Fetch Contact Us Data";
    try {
      let adminData = await adminRepo.findOne({})
      return res.send({
        status: 200,
        msg: responseMessages.contactUsSuccess,
        data: adminData,
        purpose: purpose,
      });
    } catch (err) {
      console.log("Fetch Contact Us Data Error : ", err);
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
| API name          :  addContactUs
| Response          :  Respective response message in JSON format
| Logic             :  Submit Contact Us Data
| Request URL       :  BASE_URL/api/submit-contact-us
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.addContactUs = (req, res) => {
    (async () => {
      let purpose = "Submit Contact Us Data";
      try {
        let userId = req.headers.userId;
        let body = req.body;
        let inboxData = {}
        await contactUsRepo.create({userId:userId,name:body.name,email:body.email,phone:body.phone,readUnread:0, message: body.message})
        const existingInbox = await inboxRepo.findOne({ firstUserId: userId, secondUserId: '6878f93a2715cf72cbb1a19f', type: 'admin', isDeleted: 0});
        let inboxId = existingInbox?._id ?? '';
       
       if(!existingInbox){
             let inboxCreate = await inboxRepo.create({ firstUserId: userId, secondUserId: '6878f93a2715cf72cbb1a19f', type: 'admin', isSendButtonHidden: true});
             inboxId = inboxCreate?._id;
       }
          // Create conversation
              const createConversation = await conversationRepo.create({
                  inboxId: inboxId,
                  senderId: userId,
                  receiverId: '6878f93a2715cf72cbb1a19f',
                  content: body.message,
                  contentType: 'text',
                  isBlockMessaged: 0,
                  isDeleted:  0,
              });
              
            if(!existingInbox){
               const createAutoReplyConversation = await conversationRepo.create({
                  inboxId: inboxId,
                  senderId: '6878f93a2715cf72cbb1a19f',
                  receiverId: userId,
                  content: `Thank you for contacting us! We have received your message and our team will get back to you shortly.`,
                  contentType: 'text',
                  isBlockMessaged: 0,
                  isDeleted:  0,
              });
              await inboxRepo.update({_id: inboxId},{
                lastMesaageSenderId: '6878f93a2715cf72cbb1a19f',
                lastMessage:  `Thank you for contacting us! We have received your message and our team will get back to you shortly.`,
                lastMessageContentType: 'text',
                messageCount: 1,
                lastMessageTime: new Date(),
                isAnyMessage: true,
              })
              handleContactUsNotification(createAutoReplyConversation,userId, '6878f93a2715cf72cbb1a19f', inboxId);
              
            }else{
              await inboxRepo.update({_id: inboxId},{
                lastMesaageSenderId: userId,
                lastMessage:  body.message, 
                lastMessageContentType: 'text',
                messageCount: existingInbox?.lastMesaageSenderId === userId ? existingInbox.messageCount + 1 : 1,
                lastMessageTime: new Date(),
                isAnyMessage: true,
              })
            }

            inboxData = await inboxRepo.findOne({_id: inboxId});
              
        
        return res.send({
          status: 200,
          msg: responseMessages.contactUsSubmitSuccess,
          data: inboxData,
          purpose: purpose,
        });
      } catch (err) {
        console.log("Submit Contact Us Data Error : ", err);
        return res.send({
          status: 500,
          msg: responseMessages.serverError,
          data: {},
          purpose: purpose,
        });
      }
    })();
};

