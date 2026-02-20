/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 3rd Dec, 2025`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const subscriptionRepo = require('../../repositories/subscriptionRepo');
const subscriptionFeaturesRepo = require('../../repositories/subscriptionFeaturesRepo');

const { fetchInAppPurchases } = require('../../services/appleService')

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages')

/*
|------------------------------------------------ 
| API name          :  addSubscription
| Response          :  Respective response message in JSON format
| Logic             :  Add Basic Details
| Request URL       :  BASE_URL/api/
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchInAppPurchaseList = async (req, res) => {
    const purpose = 'Fetch In-App purchase  List';
    try {
        const data = await fetchInAppPurchases(req.query.appId);
        return res.send({
            status: 200,
            msg: 'In-app purchase list fetched successfully',
            data: data,
            purpose: purpose
        })
    } catch (err) {
        console.log("add Subscription Error : ", err);
        return res.send({
            status: 500,
            msg: responseMessages.serverError,
            data: {},
            purpose: purpose
        })
    }
}