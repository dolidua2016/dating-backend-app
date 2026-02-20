/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 2th Dec, 2024
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const countriesRepo            = require('../../repositories/countriesRepo')
const stateRepo                = require('../../repositories/stateRepo');
const userRepo                 = require('../../repositories/userRepo');
const commonFunctions = require('../../helpers/commonFunctions')
//################################# Npm Package #################################//
require("dotenv").config();
const mongoose = require('mongoose');
const responseMessages = require('../../responseMessages')


/*
|------------------------------------------------ 
| API name          :  countryList
| Response          :  Respective response message in JSON format
| Logic             :  Country List Fetch
| Request URL       :  BASE_URL/api/country-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.countryList = (req, res) => {
    (async () => {
        let purpose = "Fetch All Country List";
        try {
            const countryId = await userRepo.findDistinctCountryIds({isDeleted: 0, isActived: 1, countryId: {$exists: true,$type: "string",$regex: /^[0-9a-fA-F]{24}$/}},{
                distinct: "countryId"}).then(ids => ids.map(id => mongoose.Types.ObjectId.createFromHexString(id))) ;
            let FindAllActiveCountryList = await countriesRepo.findAll({isActived: 1, isDeleted: 0,_id: {$in: countryId}});
            return res.send({
                status: 200,
                msg: responseMessages.countryList,
                data: FindAllActiveCountryList,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Fetch All Country List Error : ", err);
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
| API name          :  stateList
| Response          :  Respective response message in JSON format
| Logic             :  State List Fetch
| Request URL       :  BASE_URL/api/state-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.stateList = (req, res) => {
    (async () => {
        let purpose = "Fetch All State List";
        try {
            let countryId = req.query.countryId;
            
            const id = countryId.split(',').map(x => x.trim())


             const states = await userRepo.findDistinctCountryIds({isDeleted: 0, isActived: 1, countryId: {$in: id}}, {distinct: "state" });
             
             let FindAllStateList = [];

            if(id.length > 0 && countryId){
               FindAllStateList = await stateRepo.findAll({countryId: {$in: id}, isActived: 1, isDeleted: 0 , stateName: {$in: states}}, {populate: 'countryId',});
             }
         
              const result = FindAllStateList.reduce((acc, state) => {
                // Check if countryId already exists in acc
                const existing = acc.find(item => item.countryId === state.countryId._id);
                if (existing) {
                    existing.states.push(state.stateName); // add new state name
                } else {
                    acc.push({
                    countryId: state.countryId._id,
                    countryName: state.countryId.countryName,
                    states: [state.stateName],
                    });
                }

                return acc;
                }, []);


            return res.send({
                status: 200,
                msg: responseMessages.fetchStateList,
                data: result,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Fetch All State List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}
