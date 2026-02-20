/*!
 * inboxController.js
 * Containing all the controller actions related to `Inbox`
 * Author: Sukla Manna
 * Date: 18th July, 2025`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const contactUsRepo          = require('../../repositories/contactUsRepo');
const adminRepo              = require('../../repositories/adminRepo');
const inboxRepo              = require('../../repositories/inboxRepo');
const conversationRepo       = require('../../repositories/conversationRepo');
const inboxConversationCheks = require('../../repositories/inboxMessageCheksRepo');
const userRepo               = require('../../repositories/userRepo');

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

//################################ Packages ###########################//
const moment = require('moment');
const mongoose = require('mongoose');
/*
|------------------------------------------------ 
| API name          :  inboxList
| Response          :  Respective response message in JSON format
| Logic             :  Inbox List
| Request URL       :  BASE_URL/admin/inbox-list
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.inboxList = (req, res) => {
    (async () => {
        let purpose = "Inbox List";
        try { 
            const query = req.query;
            const where = {isActived:1, isDeleted:0};
            const data = {};
            const page = query.page ? parseInt(query.page) : 1;
            data.limit = 10;
            data.offset = data.limit ? data.limit * (page - 1) : null;
            data.order = { "_id": -1 };
            const formattedInboxList = [];
            let userId = req.headers.userId;
            
            const adminDetails = await adminRepo.findOne({ _id:userId, isActived:1, isDeleted:0 });
            if(!adminDetails) {
                return res.status(404).send({
                    status: 404,
                    msg: responseMessages.adminDetailsNotFound,
                    data: {},
                    purpose: purpose
                })
            }

            //Search By Name
            if(query.search) {
                where.name = { '$regex': query.search, '$options': 'i' };
            }

            //Filter By Start And End Date
            if (query.startDate && query.endDate) {
                 const start = moment.utc(query.startDate).startOf('day').toDate();
                 const end = moment.utc(query.endDate).endOf('day').toDate();
                
                where.createdAt = {
                    $gte: start,
                    $lte: end
                };
            } else if (query.startDate) {
                const start = moment.utc(query.startDate).startOf('day').toDate();
                const end = moment.utc(query.startDate).endOf('day').toDate();

                where.createdAt = {
                    $gte: start,
                    $lte: end
                };
            }

            const inboxLists = await contactUsRepo.findAllWithUserDetails(where, data);
            const inboxListsCount = await contactUsRepo.findAllWithUserDetails(where, {});

            if(inboxLists.length > 0) {
                for(const inboxList of inboxLists) {
                    formattedInboxList.push({
                        _id: inboxList._id,
                        userId: inboxList.userId,
                        name: inboxList.name,
                        email: inboxList.email,
                        phone: inboxList.phone,
                        message: inboxList.message,
                        readUnread: inboxList.readUnread,
                        profileImage: inboxList.userDetails.profileImage ? `${process.env.HOST_URL}${inboxList.userDetails.profileImage}` : "",
                        createdAt: inboxList.createdAt,
                        inboxData: await inboxRepo.findOne({$or: [
                                {
                                  firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),
                                  secondUserId: mongoose.Types.ObjectId.createFromHexString(inboxList.userId),
                                },
                                {
                                  firstUserId: mongoose.Types.ObjectId.createFromHexString(inboxList.userId),
                                  secondUserId: mongoose.Types.ObjectId.createFromHexString(userId),
                                },
                              ],
                              isActived: 1,
                              isDeleted: 0,
                            })
                    })
                }
            }

            return res.status(200).send({
                status: 200,
                msg: responseMessages.inboxListContact,
                data: {
                    inboxListsCount: formattedInboxList.length > 0 ? inboxListsCount.length : 0,
                    inboxLists: formattedInboxList
                },
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Inbox List Error : ", err);
            return res.status(500).send({
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
| API name          :  inboxReadMessage
| Response          :  Respective response message in JSON format
| Logic             :  Inbox Read Message
| Request URL       :  BASE_URL/admin/inbox-read-message
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.inboxReadMessage = (req, res) => {
    (async () => {
        let purpose = "Inbox Read Message";
        try { 
            const query = req.query;
            let userId = req.headers.userId;
            
            const adminDetails = await adminRepo.findOne({ _id:userId, isActived:1, isDeleted:0 });
            if(!adminDetails) {
                return res.status(404).send({
                    status: 404,
                    msg: responseMessages.adminDetailsNotFound,
                    data: {},
                    purpose: purpose
                })
            }

            const findOneInbox = await contactUsRepo.findOne({ _id:query.id, readUnread:0 });
            if(findOneInbox) {
                await contactUsRepo.update({ _id:findOneInbox._id }, { readUnread:1 });
            }

            return res.status(200).send({
                status: 200,
                msg: responseMessages.inboxMessageRead,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Inbox Read Message Error : ", err);
            return res.status(500).send({
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
*@RequestURL        :  BASE_URL/admin/fetch-conversation-list
*@RequestMethod     :  GET
*@Author            :  Doli Dua
* --------------------------------------------------------------------------------
*/

module.exports.chatConversationList = (req, res) => {
  (async () => {
    const purpose = "Fetch Chat Inbox List";
    try {
      const userId = req.headers.userId;
      const { anotherUserId} = req.query;
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const today = new Date().toISOString().split("T")[0];

      const data = { limit: 20, offset: (page - 1) * 20 };

    //   const userDetails = await userRepo.findOne({
    //     _id: userId,
    //     isDeleted: 0,
    //     isActived: 1,
    //   });

    //   // Return if user invalid
    //   if (!userDetails) return invalidUserResponse(res, purpose);

      const findOtherUserDetails = await userRepo.findOne({ _id: anotherUserId });

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

      const inboxId = findIndex?._id;
      
      let details = await buildUserDetails(findOtherUserDetails, userId, inboxId);
      details.profileImage = findOtherUserDetails?.profileImage ? process.env.HOST_URL + findOtherUserDetails.profileImage : process.env.HOST_URL + '/uploads/photos/default-user.png';
    
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
          // conversationList: findConversationList,
          totalCount: totalCount,
          totalPage: Math.ceil(totalCount/data.limit),
          inboxId: findIndex?._id,
          conversationData: conversationData,
          deactivateAccount: 0,
          deactivateAccountAt: null,
          isSendButtonHidden : findIndex?.isSendButtonHidden ?? false,
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
