/*!
 * profileController.js
 * Containing all the controller actions related to `Profile`
 * Author: Sukla Manna
 * Date: 17th July, 2025`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const adminRepo         = require('../../repositories/adminRepo');
const notificationRepo         = require('../../repositories/notificationRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');

// ################################ Globals ################################ //
const jwtOptionsAccess  = global.constants.jwtAccessTokenOptions;

//################################ Packages ###########################//
const jwt               = require('jsonwebtoken');
const CryptoJS          = require('crypto-js');

/*
|------------------------------------------------ 
| API name          :  login
| Response          :  Respective response message in JSON format
| Logic             :  Login
| Request URL       :  BASE_URL/admin/login
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.login = (req, res) => {
    (async () => {
        let purpose = "Login";
        try {
            let body = req.body;

            let adminDetails = await adminRepo.findOne({ email: body.email, isDeleted: '0', isActived:1 });
            if (!adminDetails) {
                return res.send({
                    status: 404,
                    msg: responseMessages.adminDetailsNotFound,
                    data: {},
                    purpose: purpose
                })
            }

            console.log(adminDetails,'adminDetails-----')
            if (CryptoJS.AES.decrypt(adminDetails.password, global.constants.passCode_for_password).toString(CryptoJS.enc.Utf8) === body.password) {

                let accessToken = jwt.sign({ user_id: adminDetails._id, email: adminDetails.email }, jwtOptionsAccess.secret, jwtOptionsAccess.options);
                adminDetails['accessToken'] = accessToken;

                delete adminDetails.password;
                await adminRepo.update(
                    { _id: adminDetails._id },
                    {
                        $push: { tokens: accessToken }
                    }
                    );
                return res.send({
                    status: 200,
                    msg: responseMessages.adminLogin,
                    data: adminDetails,
                    purpose: purpose
                })
            } else {
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidLogInDetails,
                    data: {},
                    purpose: purpose
                })
            }
        } catch (err) {
            console.log("Admin Login Error : ", err);
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
| API name          :  profileDetails
| Response          :  Respective response message in JSON format
| Logic             :  Cms Fetch
| Request URL       :  BASE_URL/admin/profile-details
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.profileDetails = (req, res) => {
    (async () => {
        let purpose = "Profile Details";
        try { 
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

            const unReadNotificationCount = await notificationRepo.count({ toUserId:userId, readUnread:0, forAdmin:1, isDeleted:0, isActived:1 });
            adminDetails["unReadNotificationCount"] = unReadNotificationCount;
            adminDetails["profileImage"] = adminDetails.profileImage ? `${process.env.HOST_URL}${adminDetails.profileImage}` : "";
            delete adminDetails.password;
            
            return res.status(200).send({
                status: 200,
                msg: responseMessages.adminProfileFetch,
                data: adminDetails,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Profile Details Error : ", err);
            return res.status(500).send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}