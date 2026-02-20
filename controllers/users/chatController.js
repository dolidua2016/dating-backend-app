/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 27th Dec, 2024
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const userRepo               = require('../../repositories/userRepo');
const inboxRepo              = require('../../repositories/inboxRepo');
const conversationRepo       = require('../../repositories/conversationRepo');
const inboxConversationCheks = require('../../repositories/inboxMessageCheksRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages')

//############################# Service #####################################//
const { 
    invalidUserResponse,
    subscriptionErrorResponse,
    serverErrorResponse,
    buildUserDetails,
    ensureInboxCheck,
    buildConversationData
} = require('../../services/chatService')

//################################# Npm Package #################################//
require("dotenv").config();
const mongoose = require('mongoose');
const moment = require('moment');

const buildAdminDetails = () => {
               return {
                    "_id": "6878f93a2715cf72cbb1a19f",
                    "firstName": "Admin",
                    "lastName": "",
                    "profileImage": process.env.HOST_URL + '/uploads/photos/photos-1752480265291.png',
                    "city": "",
                    "isSubcription": true,
                    "isOnline": true,
                    "isActived": 1,
                    "isDeleted": 0,
                    "deactivateAccount": 0,
                    "name": "Admin"
              }
}

/*
|------------------------------------------------ 
| API name          :  inboxList
| Response          :  Respective response message in JSON format
| Logic             :  Inbox Chat List
| Request URL       :  BASE_URL/api/chat-inbox-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.inboxList = (req, res) => {
    (async () => {
        let purpose = "Fetch Chat Inbox List";
        try {
            let userId = req.headers.userId;
            let query = req.query;
            let data = {};
            let page = req.query.page ? parseInt(req.query.page) : 1;
            data.limit = 10;
            data.offset = (page - 1) * data.limit;
            data.userId = mongoose.Types.ObjectId.createFromHexString(userId);
            let userDetails = await userRepo.findOne({_id: userId, isDeleted: 0});
            let today = moment.utc();
        
            
            if(!userDetails){
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                    purpose: purpose
                })
            }

            let where = {
                $or: [
                    {firstUserId: mongoose.Types.ObjectId.createFromHexString(userId)},
                    {secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)}
                ],
                isActived: 1,
                isDeleted: 0,
                isBlocked: false
            };

            data.where = {_id:{$nin:[data.userId]}, isVisible: true,}
            // Search user
            if(query.search) {
              const [first, last] = query.search.split(" ");
              
                data.where = { 
                  _id:{$nin:[data.userId]}, 
                  isVisible: true,
                  $or: [
                    {firstName: { '$regex': query.search, '$options': 'i' }, 
                    lastName: { '$regex': query.search, '$options': 'i' }},
                    {
                    $and: [
                      { firstName: { $regex: first, $options: "i" } },
                      { lastName: { $regex: last || "", $options: "i" } }
                    ]
                  } 
                  ]}

                 data.searchText = query.search; 
            }
            // Fetch Inbox
            let FetchInboxList = await inboxRepo.InboxChatList(where,data);

            // Get the Total inbox count
            //const totalInboxCount = await inboxRepo.totalInboxChatListCount(where,data);
            // Set the warning message for inboxes because if a user doesn't chat or
            // doesn't reply to the chat within 7 days,
            // then automatically it's removed from chat
            let warringInformation = (inboxCreateTime, today) => {
                let totalWaringDay = 7 - Math.floor(moment.duration(today.diff(moment(inboxCreateTime))).asDays());
                return {
                    message: 'Every story begins with one message. Start yours now 💬',
                    days: `${totalWaringDay} days left`
                }
            }
          

            const result = await Promise.all(FetchInboxList.inboxes.map(async (element) => ({ 
                _id: element._id,
                lastMessageSenderId: element.lastMesaageSenderId, 
                lastMessage: element?.lastMessage || null,
                lastMessageContentType: element.lastMessageContentType,
                messageCount: (element.lastMesaageSenderId != userId) ? element.messageCount : 0,
                isAnyMessage: element.isAnyMessage,
                isCanChat: true, // (userDetails.isSubcription || element?.firstUserDetails[0]?.isSubcription || element?.secondUserDetails[0]?.isSubcription),
                createdAt: element.lastMessageTime,
                warringMessage: !element.isAnyMessage ? warringInformation(element.createdAt, today) : {}, 
                isSendButtonHidden : element?.isSendButtonHidden ?? false,
                userDetails: element?.firstUserDetails[0] || element?.secondUserDetails[0] || buildAdminDetails(),
                type: element?.type || 'user'
              }) 
            )
            );


            return res.send({
                status: 200,
                msg: responseMessages.inboxList,
                data: {inboxList:result,totalCount:FetchInboxList.total, FetchInboxList},
                purpose: purpose
            })
        }

        catch (err) {
            console.log("Fetch Chat Inbox List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
* --------------------------------------------------------------------------------
*@APIName           :  chatConversationList
*@Summary           :  Its gives all the chat conversation of the user
*@Response          :  Respective response message in JSON format
*@Logic             :  Chat Conversation List
*@RequestURL        :  BASE_URL/api/fetch-conversation-list
*@RequestMethod     :  GET
*@Author            :  Doli Dua
* --------------------------------------------------------------------------------
*/
module.exports.chatConversationList = (req, res) => {
  (async () => {
    const purpose = "Fetch Chat Inbox List";

    try {
      const userId = req.headers.userId;
      const { anotherUserId, inboxId } = req.query;
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const today = new Date().toISOString().split("T")[0];

      const data = { limit: 20, offset: (page - 1) * 20 };

      const userDetails = await userRepo.findOne({
        _id: userId,
        isDeleted: 0,
        isActived: 1,
      });
      // Return if user invalid
      if (!userDetails) return invalidUserResponse(res, purpose);

      let findOtherUserDetails = await userRepo.findOne({ _id: anotherUserId });

      // find the Inbox
      const findIndex = await inboxRepo.findOne({
        $or: [
          {
            firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),
            secondUserId: mongoose.Types.ObjectId.createFromHexString(anotherUserId),
          },
          {
            firstUserId: mongoose.Types.ObjectId.createFromHexString(anotherUserId),
            secondUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          },
        ],
        isActived: 1,
        isDeleted: 0,
      });

      
      if(findIndex?.type === 'admin'){
        findOtherUserDetails = buildAdminDetails();
      }

      console.log(findOtherUserDetails,'findOtherUserDetails-----')
      
      const details = await buildUserDetails(findOtherUserDetails, userId, inboxId, findIndex?.type);

    
      // Find out all the conversation of the user
      const findConversationList = await conversationRepo.findAllConversationList(
        { inboxId, isDeleted: 0, isActived: 1, isBlockMessaged: 0 },
        data
      );
        // Find out the total count of conversations. It needs it for pagination
      const totalCount = await conversationRepo.count({
        inboxId,
        isDeleted: 0,
        isActived: 1,
        isBlockMessaged: 0,
      });

      // Check is the inbox exists if not then create
      await ensureInboxCheck(inboxConversationCheks, inboxId, userId);

      const conversationData = await buildConversationData(
        findConversationList.reverse(),
        userId,
        anotherUserId,
        inboxId,
        today
      );

      conversationData.reverse()
      return res.send({
        status: 200,
        msg: responseMessages.inboxList,
        data: {
          userDetails: details,
          conversationList: findConversationList,
          totalCount: totalCount.length,
          inboxId: findIndex?._id,
          conversationData: conversationData,
          deactivateAccount: userDetails?.deactivateAccount,
          deactivateAccountAt: userDetails?.deactivateAccountAt || null,
          isSendButtonHidden : findIndex?.isSendButtonHidden ?? false,
          type: findIndex?.type || 'user'
        },
        purpose,
      });
    } catch (err) {
      console.log("Fetch Chat Inbox List Error : ", err);
      return serverErrorResponse(res, purpose);
    }
  })();
};


/*
|------------------------------------------------ 
| API name          :  chatContinue
| Response          :  Respective response message in JSON format
| Logic             :  Chat Continue
| Request URL       :  BASE_URL/api/chat-continue
| Request method    :  PUT
| Author            :  Doli Dua
|------------------------------------------------
*/
// Its need to enable for chat with another, or If someone chats with you, then you can see.
// In the future, it will be paid if paid user then only can continue to chat

module.exports.chatContinue = (req, res) => {
    (async () => {
        let purpose = "Chat Continue Status Update ";
        try {
            let userId = req.headers.userId;
            let userDetails = await userRepo.findOne({_id: userId, isDeleted: 0, isActived: 1});
            
            if(!userDetails){
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                    purpose: purpose
                })
            }
            // set chat continues to true.
            await userRepo.update({_id: userId}, {isChatContinue: true});
           
            return res.send({
                status: 200,
                msg: responseMessages.chatCountinueStatus,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Fetch Continue Status Update Error: ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------ 
| API name          :  chatImageUpload
| Response          :  Respective response message in JSON format
| Logic             :  Chat Image Upload
| Request URL       :  BASE_URL/api/chat-continue
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
// Controller for Upload images in a chat section to send image to another
module.exports.chatImageUpload = (req, res) => {
    (async () => {
        let purpose = "upload Image";
        try {
            let image = '';

            if (req.file !== undefined) {
                image = `${global.constants.chat_image_url}/${req.file.filename}`;
            }

            return res.send({
                status: 200,
                msg: responseMessages.photosUpdate,
                data: {
                    withBaseUrl: process.env.HOST_URL + image,
                  withoutBasedUrl: image
                },
                purpose: purpose
            })

        }
        catch (err) {
            console.log("Update Photos ERROR : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}
