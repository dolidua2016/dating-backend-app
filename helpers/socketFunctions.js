const responseMessages = require('../responseMessages');
const jwt = require('jsonwebtoken');
const jwtOptionsAccess = global.constants.jwtAccessTokenOptions;
const mongoose = require('mongoose');
const EventEmitter = require("events");
global.eventEmiter = new EventEmitter();
const moment = require('moment');

// ################################ Repositories ################################ //
const userRepo = require('../repositories/userRepo');
const userPassesRepo = require('../repositories/userPassesRepo');
const userFavoritesRepo = require('../repositories/userFavoritesRepo');
const userLikeRepo = require('../repositories/userLikeRepo');
const inboxRepo = require('../repositories/inboxRepo');
const conversationRepo = require('../repositories/conversationRepo');
const userBlockRepo = require('../repositories/userBlockRepo');
const notificationRepo = require('../repositories/notificationRepo');
const notificationIconRepo = require('../repositories/notificationIconRepo');

// ################################ Function ################################ //
const notificationFunction = require('../helpers/notificationFunctions');
const { notifyMatch } = require('../helpers/commonFunctions');
const { matchUsernotification } = require('../services/notificationService');
const { emitError,
    buildUserDetails,
    buildInboxData,
    buildConversationData,
    handleNotification } = require('../services/sendMessageService');
 
const {handleLike , handlePass} = require('../services/UserFeedMetricsV2Service')   

let userActiveRooms = {};
const isNotifyMap = {};

const {emailTemplateFunction} = require('../helpers/emailTamplateFunction');

module.exports.socketResponse = (socket) => {

    // Connection Tester
    socket.on('test-socket', (datas) => {
        console.log("Socket Configured Successfully...");
    });

    socket.on("passUser", async (data) => {
        try {

            let emitName = `passUserSuccess${data.fromUserId}`; // Generate a unique emitter name
            const passedFrom = data?.passedFrom; // Its need for know from where the user pass the user
            let passedUser = await userPassesRepo.findOne({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1});
            let likeUser = await userLikeRepo.findOne({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1 });
            let inboxData = await inboxRepo.findOne({
                $or: [
                    { firstUserId: data.fromUserId, secondUserId: data.toUserId },
                    { firstUserId: data.toUserId, secondUserId: data.fromUserId }
                ],
                isDeleted: 0,
                isActived: 1
            });

            
            // If there is an inbox between two users, then soft delete it
            if (inboxData) {
                await inboxRepo.update({ _id: inboxData._id, isDeleted: 0, isActived: 1 }, { isDeleted: 1, isActived: 0 });
            }
            // If the user passes and the user was previously liked, then it removed
            if (likeUser) {
                await userLikeRepo.update({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1 }, { isDeleted: 1 });
            }
            // If previously not passed, then create in Passed User DB
            if (!passedUser) {
                await userPassesRepo.create({ fromUserId: data.fromUserId, toUserId: data.toUserId, pageFrom: data?.passedFrom === 'home' ? 'home' : 'profile'});
                socket.emit(emitName, { status: 200, response: 'User pass added successfully', data: {}, purpose: 'User pass creation' });
               

                //For user metric data
                handlePass(data.fromUserId, data.toUserId, !!likeUser);

            } else if(passedUser && passedFrom === 'home'){
                   await userPassesRepo.updateMany({ fromUserId: data.fromUserId, toUserId: data.toUserId }, { isDeleted: 1 });
                   await userPassesRepo.create({ fromUserId: data.fromUserId, toUserId: data.toUserId , pageFrom: data?.passedFrom === 'home' ? 'home' : 'profile'});
                socket.emit(emitName, { status: 200, response: 'User pass updated successfully', data: {}, purpose: 'User pass update' });
            }else {
                await userPassesRepo.update({ fromUserId: data.fromUserId, toUserId: data.toUserId }, { isDeleted: 1 });
                socket.emit(emitName, { status: 200, response: 'User pass updated successfully', data: {}, purpose: 'User pass update' });

            }

        } catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }

    });

    /**
     * @deprecated
     */
    socket.on("favoriteUser", async (data) => {
        try {
            let emitName = `favoriteUserSuccess${data.fromUserId}`
            let passedUser = await userFavoritesRepo.findOne({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1 });
            if (!passedUser) {
                await userFavoritesRepo.create({ fromUserId: data.fromUserId, toUserId: data.toUserId });
                socket.emit(emitName, { status: 200, response: 'Favorite user added successfully', data: {}, purpose: 'User pass creation' });
            } else {
                await userFavoritesRepo.update({ fromUserId: data.fromUserId, toUserId: data.toUserId }, { isDeleted: 1 });
                socket.emit(emitName, { status: 200, response: 'Favorite user updated successfully', data: {}, purpose: 'User pass update' });

            }

        } catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }

    });

    socket.on("likedUser", async (data) => {
        try {
            let emitName = `likedUserSuccess${data.fromUserId}`;
            let emitName2 = `inboxData`
            let likeUser = await userLikeRepo.findOne({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1 });
            let userDetails = await userRepo.findOne({ _id: data.fromUserId, isDeleted: 0, isActived: 1 });
            let ReceiverUserDetail = await userRepo.findOne({ _id: data.toUserId, isDeleted: 0, isActived: 1 });
            let passedUser = await userPassesRepo.findOne({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1 });

            // If the user was in pass, then remove from there or soft delete
            if (passedUser) {
                await userPassesRepo.update({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1 }, { isDeleted: 1 });
            }

            // If user not in likedUser table, then add it there
            if (!likeUser) {
                await userLikeRepo.create({ fromUserId: data.fromUserId, toUserId: data.toUserId , pageFrom: data?.pageFrom === 'home' ? 'home' : 'profile'});
                // Emit success response
                socket.emit(emitName, { status: 200, response: 'User like successfully', data: {}, purpose: 'User like ' });

                // Create Notification And Send Push Notification (New Like Received)
                const notificationMessage = `👍${userDetails.firstName} liked your profile! Tap to learn more.`;
                await notifyMatch(ReceiverUserDetail._id, userDetails._id, 'userProfile', 'New Like Received', notificationMessage, userDetails._id);
                const notificationIconData = await notificationIconRepo.findOne({type: 'message', isActived: 1, isDeleted: 0});
                
                const email = ReceiverUserDetail.email;
                const subject =  'New Like Received';
                const icon = process.env.HOST_URL + notificationIconData?.icon;
                const messageOne = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:26px;">Good news!</p>`;
                const messageTwo = `<h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:30px;">${userDetails.firstName}</h2>`;
                const messageThree = `<p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">liked your profile.</p>` ;

                 // Send email
                 if(ReceiverUserDetail.gender !== 'Female'){
                    emailTemplateFunction(email, subject, icon, messageOne, messageTwo, messageThree );
                 }

                 //For user metric data
                 handleLike(data.fromUserId, data.toUserId, !!passedUser);
                 
            } else {
                // If previously have liked, then remove from like
                await userLikeRepo.update({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0 }, { isDeleted: 1 });
                socket.emit(emitName, { status: 200, response: 'User dislike successfully', data: {}, purpose: 'User dislike ' });
            }

            let bothUserLike = await userLikeRepo.findAll({
                $or: [{
                    fromUserId: data.toUserId,
                    toUserId: data.fromUserId
                }, {
                    fromUserId: data.fromUserId,
                    toUserId: data.toUserId
                }],
                isDeleted: 0,
                isActived: 1
            });
            let findChatInbox = await inboxRepo.findAll({
                $or: [{
                    firstUserId: data.toUserId,
                    secondUserId: data.fromUserId
                }, {
                    firstUserId: data.fromUserId,
                    secondUserId: data.toUserId
                }],
                // isDeleted: 0,
                // isActived: 1
            })

            // If both users like but don't have any inbox, then create a new Inbox
            if (bothUserLike.length == 2 && findChatInbox.length == 0) {
                let inboxCreate = await inboxRepo.create({ firstUserId: data.fromUserId, secondUserId: data.toUserId });
                let Inbox = await inboxRepo.findOne({ _id: inboxCreate._id, isDeleted: 0, isActived: 1 });
                const senderUserDetails = {
                    _id: userDetails._id,
                    name: userDetails.firstName, //+ ' ' + userDetails.lastName,
                    email: userDetails.email,
                    profileImage: userDetails.profileImage,
                    isOnline: userDetails.isOnline,
                    isSubcription: userDetails.isSubcription,
                    city: userDetails.city
                }

                let receiverInboxData =
                {
                    _id: Inbox._id,
                    lastMessageSenderId: Inbox.senderId,
                    lastMessage: null,
                    lastMessageContentType: 'text',
                    messageCount: 0,
                    isAnyMessage: false,
                    isCanChat: true, //(ReceiverUserDetail.isSubcription || userDetails.isSubcription),
                    createdAt: inboxCreate.updatedAt,
                    warringMessage: { message: 'Start chatting now...', days: `7 days left` },
                    userDetails: senderUserDetails,
                }
                socket.broadcast.emit(emitName2 + data.toUserId, { status: 200, msg: 'User like count fetch successfully', data: receiverInboxData });
                // Send the match notification
                matchUsernotification(senderUserDetails, ReceiverUserDetail, Inbox._id)


            }
            else if (bothUserLike.length == 2 && findChatInbox.length == 1) {
            if(findChatInbox[0].isDeleted == 1){
                    await inboxRepo.update({
                        _id: findChatInbox[0]._id
                }, {
                    isDeleted: 0,
                    isActived: 1
                });
                   const senderUserDetails = {
                    _id: userDetails._id,
                    name: userDetails.firstName, //+ ' ' + userDetails.lastName,
                    email: userDetails.email,
                    profileImage: userDetails.profileImage,
                    isOnline: userDetails.isOnline,
                    isSubcription: userDetails.isSubcription,
                    city: userDetails.city
                }

                let receiverInboxData =
                {
                    _id: findChatInbox[0]._id,
                    lastMessageSenderId: findChatInbox[0].senderId,
                    lastMessage: null,
                    lastMessageContentType: 'text',
                    messageCount: 0,
                    isAnyMessage: false,
                    isCanChat: true, //(ReceiverUserDetail.isSubcription || userDetails.isSubcription),
                    createdAt: findChatInbox[0].updatedAt,
                    warringMessage: { message: 'Start chatting now...', days: `7 days left` },
                    userDetails: senderUserDetails,
                }
                socket.broadcast.emit(emitName2 + data.toUserId, { status: 200, msg: 'User like count fetch successfully', data: receiverInboxData });
                // Send the match notification
                matchUsernotification(senderUserDetails, ReceiverUserDetail, findChatInbox[0]._id)


             }
            }
            else if (bothUserLike.length > 0 && findChatInbox.length > 0) {
                 await inboxRepo.update({
                    $or: [{
                        firstUserId: data.fromUserId,
                        secondUserId: data.toUserId
                    }, {
                        firstUserId: data.toUserId,
                        secondUserId: data.fromUserId
                    }],
                    isDeleted: 0,
                    isActived: 1,
                    isAnyMessage: false
                }, {
                    isDeleted: 1,
                    isActived: 0
                 });
            }

            let emitNames = `likedMeCountSuccess${data.toUserId}`
            let likeUsers = await userLikeRepo.findAll({ toUserId: data.toUserId, isDeleted: 0, isActived: 1, isRead: 0 });
            socket.emit(emitNames, {
                status: 200,
                response: 'User like count fetch successfully',
                data: {totalCount: likeUsers.length},
                purpose: 'User like count '
            });

        } catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }

    });

    socket.on("blockUnblockUser", async (data) => {
        try {
            let emitName = `blockUnblockUserSuccess`
            let blockedUser = await userBlockRepo.findOne({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0, isActived: 1 });
            let userBlock = await userBlockRepo.findOne({ fromUserId: data.toUserId, toUserId: data.fromUserId, isDeleted: 0, isActived: 1 });
            let findIndex = await inboxRepo.findOne({ $or: [{ firstUserId: mongoose.Types.ObjectId.createFromHexString(data.fromUserId), secondUserId: mongoose.Types.ObjectId.createFromHexString(data.toUserId) }, { firstUserId: mongoose.Types.ObjectId.createFromHexString(data.toUserId), secondUserId: mongoose.Types.ObjectId.createFromHexString(data.fromUserId) }], isActived: 1, isDeleted: 0 });
            if (!blockedUser) {
                await userBlockRepo.create({ fromUserId: data.fromUserId, toUserId: data.toUserId });
            } else {
                await userBlockRepo.update({ fromUserId: data.fromUserId, toUserId: data.toUserId, isDeleted: 0 }, { isDeleted: 1 });
            }

            if (findIndex) {

                if (!blockedUser && !userBlock) {
                    await inboxRepo.update({ _id: findIndex._id, isActived: 1, isDeleted: 0 }, { isBlocked: true });
                    socket.emit(emitName + data.fromUserId, { status: 200, response: 'User has been successfully blocked.', data: { inboxId: findIndex._id, toUserId: data.toUserId }, purpose: 'User block update' });
                    socket.broadcast.emit(emitName + data.toUserId, { status: 200, response: 'User has been successfully blocked.', data: { inboxId: findIndex._id, toUserId: data.fromUserId }, purpose: 'User block update' });
                }

                else if (blockedUser && !userBlock) {
                    await inboxRepo.update({ _id: findIndex._id, isActived: 1, isDeleted: 0 }, { isBlocked: false });
                    socket.emit(emitName + data.fromUserId, { status: 200, response: 'User has been unblocked successfully .', data: { inboxId: findIndex._id, toUserId: data.toUserId }, purpose: 'User block update' });
                }
                else if (blockedUser && userBlock) {
                    socket.emit(emitName + data.fromUserId, { status: 200, response: 'User has been unblocked successfully .', data: { inboxId: findIndex._id, toUserId: data.toUserId }, purpose: 'User block update' });
                }

            }



        } catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }

    });

    socket.on("likedMeCount", async (data) => {
        try {
          let where = {$or:[
            {firstUserId: mongoose.Types.ObjectId.createFromHexString(data.userId)},
             {secondUserId: mongoose.Types.ObjectId.createFromHexString(data.userId)}],
             isActived: 1, isDeleted: 0, isBlocked: false};
            
            let emitName = `likedMeCountSuccess${data.userId}`
            let likeUser = await userLikeRepo.findAll({ toUserId: data.userId, isDeleted: 0, isActived: 1, isRead: 0 });
            let inboxId = (await inboxRepo.findAll(where)).map(m => mongoose.Types.ObjectId.createFromHexString(m._id))
            let unreadMessages = await conversationRepo.count({inboxId: { $in: inboxId }, receiverId: data.userId, isDeleted: 0, isRead: 0, isBlockMessaged: 0});
            socket.emit(emitName, { status: 200, response: 'User like count fetch successfully', data: { totalCount: likeUser.length, unreadMessagesCount: unreadMessages }, purpose: 'User like count ' });


        } catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }

    });

    eventEmiter.on("likedMeCounts", (userID,  notificationCount, unreadMessageCount) => {
        let emitName = `likedMeCountSuccess${userID}`
        const response = { status: 200, response: 'User like count fetch successfully', data: { totalCount: notificationCount, unreadMessagesCount:  unreadMessageCount}, purpose: 'User like count ' }
        socket.emit(emitName, response);
    });

    eventEmiter.on('userDeleteOrDisable', (userId) => {
        let emitName = `deleteOrDisableUser${userId}`
        const response = { status: 200, response: 'User delete or disable', data: { userId: userId }, purpose: 'User delete or disable' }
        socket.emit(emitName, response);
    });

    let socketMap = {};
    let userId = [];
    socket.on("onlineOffline", async (data) => {
        let keys;
        try {
            if (!socketMap[data.userId]) {
                socketMap[data.userId] = [];
            }
            socketMap[data.userId].push(socket.id);
            keys = Object.keys(socketMap);

            userId = userId.concat(keys);

            await userRepo.update({ _id: data.userId }, { socketId: socket.id, isOnline: true });
            socket.broadcast.emit('onlineOfflineSuccess', { _id: data.userId, isOnline: true });
        }
        catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }
    });

    socket.on("joinRoom", ({ userId, inboxId }) => {
        userActiveRooms[userId] = inboxId;

        // Mark isNotify = false since user is active in this room
        if (!isNotifyMap[inboxId]) {
            isNotifyMap[inboxId] = {};
        }
        isNotifyMap[inboxId][userId] = false;
        socket.join(inboxId);
          console.log(`User ${userId} join in room ${inboxId}`);
    });

    socket.on("sendMessages", async (data) => {
    try {
        
        const emitName = `conversationMessage${data.senderId}`;
        const emitName2 = `inboxData${data.senderId}`;
        const today = new Date().toISOString().split("T")[0];
        const startOfDay = moment.utc().startOf('day');
        const endOfDay = moment.utc().endOf('day');
      
        let userDetails = '' ;
        let receiverDetails = '';
        
        const inbox = await inboxRepo.findOne({
            _id: data.inboxId,
          
        });

       const notify = (inbox.type === 'admin') ?   data.notify  : true ;

        
        if (!inbox) return emitError(socket, emitName, "Inbox not found");

        // Validate receiver + inbox
        if(inbox.type === 'admin'){
            if(inbox.secondUserId === data.senderId){
                 userDetails = buildAdminDetails()
                 receiverDetails = await userRepo.findOne({ _id: data.receiverId });
            }else{
                 userDetails = await userRepo.findOne({_id: data.senderId,isDeleted: 0,isActived: 1,});
                 receiverDetails = buildAdminDetails()
            }
        }else{
            userDetails = await userRepo.findOne({_id: data.senderId,isDeleted: 0,isActived: 1,});
            receiverDetails = await userRepo.findOne({ _id: data.receiverId });
        }
        
         if (!userDetails) return emitError(socket, emitName, responseMessages.invalidUser);


        //Check existing conversation for today [it's used for notification]
        const checkConversation = await conversationRepo.findOne({
            inboxId: inbox._id,
            senderId: userDetails._id,
            createdAt: {$gte: startOfDay, $lte: endOfDay},
            isDeleted: 0,
        });
            

        // Create conversation
        const createConversation = await conversationRepo.create({
            inboxId: data.inboxId,
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            contentType: data.contentType,
            isBlockMessaged: inbox.isBlocked ? 1 : 0,
            isDeleted: inbox?.isDeleted === 0 ? 0 : 1,
        });
        

        // Unread messages
        const unreadMessages = await conversationRepo.count({
            inboxId: data.inboxId,
            isRead: 0,
            isDeleted: 0,
            isActived: 1,
            isBlockMessaged: 0,
        });

        // Update inbox
        const updateInboxData = {
            lastMesaageSenderId: data.senderId,
            isAnyMessage: true,
            lastMessageTime: new Date(),
        };
        if (!inbox.isBlocked || inbox.isDeleted !== 1) {
            Object.assign(updateInboxData, {
                lastMessage: data.content,
                lastMessageContentType: data.contentType,
                messageCount: unreadMessages, //.length
                isSendButtonHidden: (inbox?.type === 'admin' && inbox?.secondUserId === data.senderId) ? false : inbox?.isSendButtonHidden
            });
        }
        await inboxRepo.update({ _id: data.inboxId }, updateInboxData);
        const updatedInbox = await inboxRepo.findOne({
            _id: data.inboxId,
            // isDeleted: 0,
            // isActived: 1,
        });

        // Build response data
        const senderUserDetails = (inbox.type === 'admin' && inbox.secondUserId === data.senderId ) ?  userDetails : buildUserDetails(userDetails) ;
        const receiverUserDetails = (inbox.type === 'admin' && inbox.secondUserId !== data.senderId ) ?  receiverDetails : buildUserDetails(receiverDetails);
      
        const receiverInboxData = buildInboxData(
            receiverUserDetails,
            senderUserDetails,
            updatedInbox,
            data,
            unreadMessages //.length
        );
        const senderInboxData = buildInboxData(
            senderUserDetails,
            receiverUserDetails,
            updatedInbox,
            data,
            unreadMessages //.length
        );
        const conversationData = await buildConversationData(
            createConversation,
            data.inboxId,
            today
        );

        const responseMessage = {
            status: 200,
            msg: "Message send successfully",
            data: conversationData,
            metadata: senderUserDetails,
            isSendButtonHidden: updateInboxData?.isSendButtonHidden || false
        };


        // Emit to sender
        socket.emit(emitName, responseMessage);
        socket.emit(emitName2, {
            status: 200,
            msg: "Message send successfully",
            data: senderInboxData,
        });

        // Emit to receiver if not blocked
        if (!inbox.isBlocked || inbox.isDeleted !== 1) {
            socket.broadcast.emit(
                `conversationMessage${data.receiverId}`,
                responseMessage
            );
            socket.broadcast.emit(`inboxData${data.receiverId}`, {
                status: 200,
                msg: "Message send successfully",
                data: receiverInboxData,
            });

           
            
            // Notifications
            const receiverId =
                data.senderId === inbox.firstUserId
                    ? inbox.secondUserId
                    : inbox.firstUserId;
            const isReceiverInRoom = userActiveRooms[receiverId] === data.inboxId;
            

               let unreadMessageCount = await conversationRepo.count({receiverId: receiverId, isDeleted: 0, isRead: 0, isBlockMessaged: 0});
            let likeUser = await userLikeRepo.findAll({ toUserId: receiverId, isDeleted: 0, isActived: 1, isRead: 0 });
            
            
            let unreadEmitName = `likedMeCountSuccess${data.receiverId}`
            const responseData = { status: 200, response: 'User like count fetch successfully', data: { totalCount: likeUser.length, unreadMessagesCount:  unreadMessageCount}, purpose: 'User like count ' }
           
            if(receiverDetails.isActived ==1){
                
                socket.broadcast.emit(unreadEmitName, responseData);
                socket.emit(unreadEmitName, responseData);
                
            }

             if(inbox.type === 'admin' && inbox.secondUserId === data.senderId && !notify ) return;

            // Send notification
            await handleNotification(
                data,
                inbox,
                userDetails,
                receiverDetails,
                receiverId,
                isReceiverInRoom,
                isNotifyMap,
                checkConversation
            );

         


        }
    } catch (err) {
        console.log(err);
        return {
            status: 500,
            msg: responseMessages.serverError,
        };
    }
    });

    socket.on("leaveRoom", ({ userId, inboxId }) => {
        //Remove user from activeRooms
        if (userActiveRooms[userId]) {
            delete userActiveRooms[userId];
        }

        // Set isNotify to true so future messages trigger notifications
        if (!isNotifyMap[inboxId]) {
            isNotifyMap[inboxId] = {};
        }
        isNotifyMap[inboxId][userId] = true;

        // Leave the actual socket room
        socket.leave(inboxId);

        console.log(`User ${userId} left room ${inboxId}`);
    });

    socket.on("isTyping", async (data) => {
        try {
            let emitName = `typingSuccess`
            let findInbox = await inboxRepo.findOne({ _id: data.inboxId, isDeleted: 0, isActived: 1 });
            let userDetails = '';
           
            if(findInbox.type === 'admin')
                 userDetails = buildAdminDetails() 
            else
                 userDetails = await userRepo.findOne({ _id: data.senderId, isDeleted: 0, isActived: 1 });
            
           

            if (!userDetails) {
                let responseMessage = {
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                }
                emitName = emitName + data.senderId;
                socket.emit(emitName, responseMessage)
            }
            const details = {
                _id: userDetails._id,
                name: userDetails.firstName, // + ' ' + userDetails.lastName,
                profileImage: userDetails.profileImage,
                isOnline: userDetails.isOnline,
                inboxId: data.inboxId
            }

            let responseMessage = {
                status: 200,
                msg: 'Message typing',
                data: details,
            }

            if(findInbox && !findInbox?.isSendButtonHidden){
            let otherUserId = (findInbox.firstUserId != data.senderId) ? findInbox.firstUserId : findInbox.secondUserId
          
            socket.broadcast.emit(emitName + otherUserId, responseMessage)
            }

        } catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }

    });

    
    
    socket.on("readMessage", async (data) => {
        try {
            let emitName = `readMessageSuccess`
            let findInbox = await inboxRepo.findOne({ _id: data.inboxId});
            let otherUserId = (findInbox?.firstUserId != data.senderId) ? findInbox?.firstUserId : findInbox?.secondUserId;
            let findAllConversation = await conversationRepo.findAll({ inboxId: data.inboxId, senderId: { $nin: [data.senderId] }, isRead: 0, isDeleted: 0, isActived: 1 })
            let conversationId = findAllConversation.map(m => m._id);
            findInbox.messageCount = 0;

            let responseMessage = {
                status: 200,
                msg: 'Message Read',
                data: {
                    conversationId: conversationId,
                    chatInbox: findInbox
                },
            }

            await conversationRepo.updateMany({ inboxId: data.inboxId, senderId: { $ne: data.senderId }, isRead: 0, isDeleted: 0, isActived: 1 }, { isRead: 1 })
            await inboxRepo.update({ _id: data.inboxId, isDeleted: 0, isActived: 1, lastMesaageSenderId: { $ne: data.senderId } }, { messageCount: 0 });

            let unreadMessageCount = await conversationRepo.count({receiverId: otherUserId, isDeleted: 0, isRead: 0, isBlockMessaged: 0});
            let likeUser = await userLikeRepo.findAll({ toUserId: otherUserId, isDeleted: 0, isActived: 1, isRead: 0 });
            

            let unreadEmitName = 'likedMeCountSuccess' + otherUserId;
            
            const responseData = { status: 200, response: 'User like count fetch successfully', data: { totalCount: likeUser.length, unreadMessagesCount:  unreadMessageCount}, purpose: 'User like count ' }
          
            
            socket.broadcast.emit(unreadEmitName, responseData);
            socket.emit(unreadEmitName, responseData);
            socket.broadcast.emit(emitName + otherUserId, responseMessage);
            if(findInbox && findInbox?.lastMesaageSenderId !== data.senderId){
                console.log('emit read message to self')
              socket.emit(emitName + data.inboxId, {unreadMessagesCount: 0});
            }

        } catch (err) {
            console.log(err);
            return ({
                status: 500,
                msg: responseMessages.serverError,
            });
        }

    });

    eventEmiter.on('matchedUser', (data, userId) => {
        socket.emit(`userMatching${userId}`, data);
    });

    socket.on('userMatchChecking', async (data) => {
        const { userId, otherUserId } = data;

        
        let userDetails = await userRepo.findOne({ _id: userId, isDeleted: 0, isActived: 1 });
        if(!userDetails) return ;

        let ReceiverUserDetail = await userRepo.findOne({ _id: otherUserId, isDeleted: 0, isActived: 1 });
        if (!ReceiverUserDetail) return

        let findInbox = await inboxRepo.findOne({$or:[{firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),secondUserId: mongoose.Types.ObjectId.createFromHexString(otherUserId)},{firstUserId: mongoose.Types.ObjectId.createFromHexString(otherUserId),secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)}],isActived: 1, isDeleted: 0});

        if (!findInbox) return;
        
        let bothUserLike = await userLikeRepo.findAll({ $or: [{ fromUserId: userId, toUserId: otherUserId }, { fromUserId: otherUserId, toUserId: userId }], isDeleted: 0, isActived: 1 });

        if(bothUserLike.length == 2){
            const reponse = {
                    _id: ReceiverUserDetail._id,
                    name: ReceiverUserDetail.firstName, //+ ' ' + ReceiverUserDetail.lastName,
                    profileImage: process.env.HOST_URL + ReceiverUserDetail.profileImage,
                    isOnline: ReceiverUserDetail.isOnline,
                    isSubcription: ReceiverUserDetail.isSubcription,
                    city: ReceiverUserDetail.city,
                    inboxId: findInbox?._id || '',
                    isCanChat: true //(ReceiverUserDetail.isSubcription || userDetails.isSubcription)
                }

             socket.emit(`userMatchingResponse${userId}`,reponse)
        }

    })

    socket.on('canChat', async (data) => {
        const { userId, otherUserId } = data;
      
        
        let userDetails = await userRepo.findOne({ _id: userId, isDeleted: 0, isActived: 1 });
        if(!userDetails) return ;

        let ReceiverUserDetail = await userRepo.findOne({ _id: otherUserId, isDeleted: 0, isActived: 1 });
        if (!ReceiverUserDetail) return

        let findInbox = await inboxRepo.findOne({$or:[{firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),secondUserId: mongoose.Types.ObjectId.createFromHexString(otherUserId)},{firstUserId: mongoose.Types.ObjectId.createFromHexString(otherUserId),secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)}],isActived: 1, isDeleted: 0});
        if (!findInbox) return;
        
        let bothUserLike = await userLikeRepo.findAll({ $or: [{ fromUserId: userId, toUserId: otherUserId }, { fromUserId: otherUserId, toUserId: userId }], isDeleted: 0, isActived: 1 });
        const blockedUser = await userBlockRepo.findOne({toUserId:  ReceiverUserDetail._id, fromUserId: userId, isActived: 1, isDeleted: 0});
        const blockedMe = await userBlockRepo.findOne({fromUserId:  ReceiverUserDetail._id, toUserId: userId, isActived: 1, isDeleted: 0});

       
        if(bothUserLike.length == 2){
            const reponse = {
                    _id: ReceiverUserDetail._id,
                    name: ReceiverUserDetail.firstName, //+ ' ' + ReceiverUserDetail.lastName,
                    profileImage: process.env.HOST_URL + ReceiverUserDetail.profileImage,
                    isOnline: ReceiverUserDetail.isOnline,
                    isSubcription: ReceiverUserDetail.isSubcription,
                    city: ReceiverUserDetail.city,
                    inboxId: findInbox?._id || '',
                    isCanChat: true, //(ReceiverUserDetail.isSubcription || userDetails.isSubcription),
                    isBlocked: (blockedUser || blockedMe)
                }
             socket.emit(`canChatResponse${userId}`,reponse)
        }

    });


    eventEmiter.on('blockedUser', (userId, reportedCount, isActived, isBlocked) => {

        socket.emit(`userBlock${userId}`, {
            isBlocked: isBlocked, 
            reportedCount: reportedCount, 
            isActived: isActived,
            title: 'Account blocked',
            message: 'Your account has been blocked. Please contact the admin for further clarification.'

        });
    });

    socket.on('checkBlock', async(data) => {
        const userDetails = await userRepo.findOne({ _id: mongoose.Types.ObjectId.createFromHexString(data.userId), isDeleted: 0});
        socket.emit(`userBlock${data.userId}`, {
            isBlocked: userDetails.isBlocked, 
            reportedCount: userDetails.reportCount, 
            isActived: userDetails.isActived,
            title: 'Account blocked',
            message: 'Your account has been blocked. Please contact the admin for further clarification.'});
    });

    eventEmiter.on('autoReplyConversation', (userId, responseMessage, receiverInboxData) => {
            console.log('autoReplyConversation === receiverInboxData', userId, responseMessage, receiverInboxData)
              socket.broadcast.emit(
                `conversationMessage${userId}`,
                responseMessage
            );
            socket.broadcast.emit(`inboxData${userId}`, {
                status: 200,
                msg: "Message send successfully",
                data: receiverInboxData,
            });

    });

    socket.on("disconnect", async (data) => {
        await userRepo.update({ socketId: socket.id }, { isOnline: false });
        let findUser = await userRepo.findOne({ socketId: socket.id });

        if (findUser) {
            socket.broadcast.emit('onlineOfflineSuccess', { _id: findUser._id, isOnline: false })
        }

        //Remove user from userActiveRooms
        if (userId && userActiveRooms[userId]) {
            delete userActiveRooms[userId];
        }

        // Remove user from all inboxes in isNotifyMap
        for (const inboxId in isNotifyMap) {
            if (isNotifyMap[inboxId][userId] !== undefined) {
                delete isNotifyMap[inboxId][userId];

                //Optionally delete empty inbox entry
                if (Object.keys(isNotifyMap[inboxId]).length === 0) {
                    delete isNotifyMap[inboxId];
                }
            }
        }



    });

}

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

global.em = new EventEmitter();
