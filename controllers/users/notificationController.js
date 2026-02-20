/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 2th Dec, 2024`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const userRepo          = require('../../repositories/userRepo');
const conversationRepo  = require('../../repositories/conversationRepo');
const notificationRepo  = require('../../repositories/notificationRepo');
const inboxRepo         = require('../../repositories/inboxRepo');


//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages')

// ################################ Function ################################ //
const notificationFunction      = require('../../helpers/notificationFunctions');
const { notifyMatch }           = require('../../helpers/commonFunctions');
const {emailTemplateFunction}     = require('../../helpers/emailTamplateFunction');

//############################ Services #################################### //
const { friendAnniversaryReminder, unansweredMessageReminder, profileCompletionReminder} = require('../../services/cronService');


//################################# Npm Package #################################//
require("dotenv").config();
const mongoose = require('mongoose');
const cron     = require('node-cron');
const moment   = require('moment');

/*
|------------------------------------------------ 
| API name          :  allowNotification
| Response          :  Respective response message in JSON format
| Logic             :  Allow Notification
| Request URL       :  BASE_URL/api/allow-notification
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.allowNotification = (req, res) => {
    (async () => {
        let purpose = "Allow Notification";
        try { 
            let userId = req.headers.userId;
            let body = req.body;
            
            let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
            if (!findUser) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose: purpose
                });
            }

            if(body?.notificationAllow) {
                await userRepo.update({_id: userId}, {notificationAllow: body.notificationAllow});
            }

            return res.send({
                status: 200,
                msg: responseMessages.allowNotification,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Allow Notification Error : ", err);
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
| API name          :  notificationList
| Response          :  Respective response message in JSON format
| Logic             :  Notification List
| Request URL       :  BASE_URL/api/notification-list
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.notificationList = (req, res) => {
    (async () => {
        let purpose = "Notification List";
        try { 
            let userId = req.headers.userId;
            let query = req.query;
            let data = {};
            let page = query.page ? parseInt(query.page) : 1;
            data.limit = 10;
            data.offset = data.limit ? data.limit * (page - 1) : null;
            data.order = [['id', 'DESC']];
            let notificationList = [];
            

            let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
            if (!findUser) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose: purpose
                });
            }

            let notificationLists = await notificationRepo.findAll({ toUserId:findUser?._id, isDeleted:0 }, data);
            let notificationListCount = await notificationRepo.count({ toUserId:findUser?._id, isDeleted:0 });

            if(notificationLists.length > 0) {

                for(let notification of notificationLists) {
                    notificationList.push({
                        id: notification.id,
                        message: notification?.message,
                        readUnread: notification?.readUnread,
                        date: moment(notification?.createdAt).format("MM-DD-YYYY"),
                        linkedId: notification?.linkedId,
                        linkedUserId: notification?.linkedUserId,
                        type: notification?.type
                    })
                }
                await notificationRepo.update({ toUserId:findUser?._id }, { readUnread:1 });
            }

            return res.send({
                status: 200,
                msg: responseMessages.notificationList,
                data: {
                    notificationListCount: notificationList.length > 0 ? notificationListCount : 0,
                    notificationList: notificationList.length > 0 ? notificationList : []
                },
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Notification List Error : ", err);
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
| API name          :  testEmail
| Response          :  Respective response message in JSON format
| Logic             :  Test Email
| Request URL       :  BASE_URL/api/test-email
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/


module.exports.testEmail = (req, res) => {
    (async () => {
        let purpose = "Email Template Function";
        try { 
            
           const email = 'dolidua2016@gmail.com';
           const subject = 'Test Email from FindABohra';
           const icon = process.env.HOST_URL + 'uploads/emailimages/firstMatch.png';
           const messageOne = '';
           const messageTwo = 'Has new updates.';
           const messageThree = 'Take a look!'; 



           const pushData = {
                         title: 'Testing Email Function',
                         type: 'Test Email',
                         userId: '690cee4d0ec30c0471e00006',
                         linkedId: '690cee4d0ec30c0471e00006', //Page Id Where Redirect
                         linkedUserId: '690cee4d0ec30c0471e00006', //User Id 
                         message: 'This is a test email from FindABohra.',
                     };
           
           const result = await notificationFunction.sendPushNotificationsForSingleUser(pushData);
           //await emailTemplateFunction(email, subject, icon, messageOne, messageTwo, messageThree);

            return res.send({
                status: 200,
                msg: 'Email sent successfully',
                data: {result},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Notification List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

// 01:00 AM – Light job
// cron.schedule('* 1 * * *', unansweredMessageReminder);

// 01:30 AM – Medium job
cron.schedule('30 1 * * *', friendAnniversaryReminder);


// 02:00 AM – Heavy job
cron.schedule('* 2 * * *', profileCompletionReminder);