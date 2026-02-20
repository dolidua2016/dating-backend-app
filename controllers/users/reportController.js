/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 30th Dec, 2024`
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const userRepo       = require('../../repositories/userRepo');
const reportRepo     = require('../../repositories/reportRepo');
const userReportRepo = require('../../repositories/userReportRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');

// ################################ Function ################################ //
const notificationFunction      = require('../../helpers/notificationFunctions');
const { notifyMatch }           = require('../../helpers/commonFunctions');


/*
|------------------------------------------------ 
| API name          :  reportList
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Report List
| Request URL       :  BASE_URL/api/fetch-report-data
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.reportList = (req, res) => {
    (async () => {
        let purpose = "Fetch Report List";
        try {
    
            let findAllReportData = await reportRepo.findAll({isDeleted: 0, isActived: 1})
          

            return res.send({
                status: 200,
                msg: responseMessages.reportFetch,
                data: findAllReportData,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Fetch Report List Error : ", err);
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
| API name          :  reposrtSubmit
| Response          :  Respective response message in JSON format
| Logic             :  Reposrt Submit
| Request URL       :  BASE_URL/api/submit-report
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.reposrtSubmit = (req, res) => {
    (async () => {
        let purpose = "Reposrt Submit";
        try {
            let userId = req.headers.userId;
            let body   = req.body;
            let image = '';

            if(body.reportType === 'image'){
                image =body.reason.split(process.env.HOST_URL)[1]
            }

            let where = {
                toUserId: body.userId,
                fromUserId: userId,
                isDeleted: 0
            }

            if(body?.inboxId) where.inboxId = body?.inboxId;
            if(body?.userPictureId) where.userPictureId = body?.userPictureId;
            if(body?.userConversationId) where.userConversationId = body?.userConversationId;
            if(image) where.reason = image; 

            const findReport = await userReportRepo.findOne(where)

            if(findReport){
                return res.send({
                status: 409,
                msg: 'You have already reported this.',
                data: {},
                purpose: purpose
             });
            }

            const userDetails = await userRepo.findOne({ _id: userId, isDeleted: 0, isActived: 1 });
            const reportedUser = await userRepo.findOne({ _id: body.userId, isDeleted: 0});
            const findPreviousReport = await userReportRepo.findOne({
                toUserId: body.userId,
                fromUserId: userId, 
                isDeleted: 0,
                isReported: 0
            });

           
            
            let createdData = {
                toUserId: body.userId,
                fromUserId: userId, 
                reportedId: body.reportId, 
                reason: body?.reportType === 'image' ? image : body.reason,
                reportType: body?.reportType,
                userReason: body?.userReason
            }

            if(body?.inboxId) createdData.inboxId = body?.inboxId;
            if(body?.userPictureId) createdData.userPictureId = body?.userPictureId;
            if(body?.userConversationId) createdData.userConversationId = body?.userConversationId;

           
            await userReportRepo.create(createdData)


            //Create Notification And Send Push Notification (Report reviewed)
            const notificationMessage = `Your report has been submitted`;
            await notifyMatch(userDetails._id, "", "", 'Report reviewed', notificationMessage, "");


            if(!findPreviousReport){
                const reportedCount = reportedUser?.reportCount + 1;
                let updateData = {reportCount: reportedCount}
                if(reportedCount >= 3){
                    updateData.isBlocked = 1;
                    updateData.isActived = 0
                    eventEmiter.emit('blockedUser', reportedUser?._id , reportedCount, reportedUser?.isActived, 1 );
                }

                await userRepo.update({_id:reportedUser?._id }, updateData);
            }
           

            return res.send({
                status: 200,
                msg: responseMessages.reportSubmit,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Reposrt Submit Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

