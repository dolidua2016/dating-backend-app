/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 2nd Dec, 2024`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const subscriptionRepo         = require('../../repositories/subscriptionRepo');
const subscriptionFeaturesRepo = require('../../repositories/subscriptionFeaturesRepo');

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

module.exports.addSubscription = (req, res) => {
    (async () => {
        let purpose = "add Subscription";
        try { 
            let body = req.body;
            const planPerDayPrice = Number(body.planPrice) / Number(body.planDays) ;
            let create = {
                planName : body.planName,
                planPrice : body.planPrice,
                planDays : body.planDays,
                planPerDayPrice: planPerDayPrice.toFixed(2),
                perWeekPlanPrice: Math.round(planPerDayPrice.toFixed(2) * 7),
            }

            console.log(create,'create');
           // let createFeature = await subscriptionFeaturesRepo.create({message: 'Unlimited Messaging'})
         //let createData = await subscriptionRepo.create(create)

            return res.send({
                status: 200,
                msg: {},
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("add Subscription Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}