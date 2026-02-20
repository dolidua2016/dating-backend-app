/*!
 * userController.js
 * Containing all the controller actions related to `User`
 * Author: Sukla Manna
 * Date: 4th July, 2025
 * MIT Licensed
 */



// ################################ Repositories ################################ //
const subscriptionRepo         = require('../../repositories/subscriptionRepo');
const subscriptionFeaturesRepo = require('../../repositories/subscriptionFeaturesRepo');
const transactionRepo  = require('../../repositories/transactionRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages')

const {buildPagination } = require('../../services/userService') 

/*
|------------------------------------------------ 
| API name          :  fetchTransactionList
| Response          :  Respective response message in JSON format
| Logic             :  fetch Transaction List
| Request URL       :  BASE_URL/api/transaction-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchTransactionList = (req, res) => {
    (async () => {
        let purpose = "Fetch Transaction List";
        try { 
            let body = req.body;
            let where = {isActived: 1, isDeleted: 0}
            const pagination = buildPagination(req.query);

            const transactionList =  await transactionRepo.findAllWithUserDetails(where,pagination);
            const totalCount = await transactionRepo.count(where)
            return res.send({
                status: 200,
                msg: 'Transaction list fetched successfully',
                data: {transactionList, totalCount, totalPage: Math.ceil(totalCount / pagination.limit)},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Fetch Transaction List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}