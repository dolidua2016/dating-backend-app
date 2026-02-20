/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 2th Dec, 2024`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const countriesRepo            = require('../../repositories/countriesRepo')
const stateRepo                = require('../../repositories/stateRepo');
const wrapItUpRepo             = require('../../repositories/wrapItUpRepo');
const interestRepo             = require('../../repositories/interestRepo');
const personalityTraitsRepo    = require('../../repositories/personalityTraitsRepo');
const saftyTipsRepo            = require('../../repositories/saftyTipsRepo');
const reportRepo               = require('../../repositories/reportRepo');
const appVersionRepo           = require('../../repositories/appVersionRepo');

const commonFunctions = require('../../helpers/commonFunctions');
const {convertSvgToPng } = require('../../services/authService');

//################################# Npm Package #################################//
require("dotenv").config();
const mongoose = require('mongoose');
const responseMessages = require('../../responseMessages')
const path = require("path");


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
            let FindAllActiveCountryList = await countriesRepo.findAll({isActived: 1, isDeleted: 0});
           
             const priority = ["India", "United States", "Canada"];
           
                           const sorted = FindAllActiveCountryList.sort((a, b) => {
                           const indexA = priority.indexOf(a.countryName);
                           const indexB = priority.indexOf(b.countryName);
                           
                           if (indexA !== -1 && indexB !== -1) {
                               return indexA - indexB;
                           }
                           
                           if (indexA !== -1) return -1;
                           
                           if (indexB !== -1) return 1;
                           return a.countryName.localeCompare(b.countryName);
                           });

                        for (const element of sorted) {
                            const svgFullPath = path.join(__dirname, "../../", element.countryFlag);
                            
                            const countryFlag = element.countryFlag; // process.env.SERVER !== 'test' ?  await convertSvgToPng(svgFullPath) :

                            element.countryFlag = process.env.HOST_URL + countryFlag;
                            }


           
            return res.send({
                status: 200,
                msg: responseMessages.countryList,
                data: sorted,
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
            let countryId = req.params.countryId;
            let FindAllStateList = await stateRepo.findAll({countryId: countryId, isActived: 1, isDeleted: 0 });
            
            return res.send({
                status: 200,
                msg: responseMessages.fetchStateList,
                data: FindAllStateList,
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



module.exports.insertWrapItData = (req, res) => {
    (async () => {
        let purpose = "Fetch All Country List";
        try {
            let body = req.body;

            let findWrapItUpData = await wrapItUpRepo.findOne({question: body.question});
            if(!findWrapItUpData){
                let create = {
                    question: body.question,
                    types: body.type
                }
                
                await wrapItUpRepo.create(create)
            }else{
                let update = {
                    types: body.type
                }
                await wrapItUpRepo.update({question: body.question,},{$push:update})
            }
            return res.send({
                status: 200,
                msg: responseMessages.countryList,
                data: {},
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

module.exports.insertInterest = (req, res) => {
    (async () => {
        let purpose = "Fetch All Country List";
        try {
            let body = req.body;

            let findInterest= await interestRepo.findOne({categoryName: body.categoryName});
            if(!findInterest){
                let create = {
                    categoryName: body.categoryName,
                    types: body.type
                }
               
                await interestRepo.create(create)
            }
            return res.send({
                status: 200,
                msg: responseMessages.countryList,
                data: {},
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


module.exports.insertPersonality = (req, res) => {
    (async () => {
        let purpose = "Fetch All Country List";
        try {
            let body = req.body;


                let create = {
                    categoryTypes: body.type
                }
              
                await personalityTraitsRepo.create(create);
            return res.send({
                status: 200,
                msg: responseMessages.countryList,
                data: {},
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
| API name          :  addQuestions
| Response          :  Respective response message in JSON format
| Logic             :  Add Questions
| Request URL       :  BASE_URL/api/add-questions
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.addQuestions = (req, res) => {
    (async () => {
        let purpose = "Add Questions";
        try { 
            let body = req.body;

            await questionRepo.create({question: body.question})

            return res.send({
                status: 200,
                msg: "Add questions successfully",
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Add Questions Error : ", err);
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
| API name          :  aboutSuggestionsAdd
| Response          :  Respective response message in JSON format
| Logic             :  Add About Suggestions 
| Request URL       :  BASE_URL/api/add-about-suggestions
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/
module.exports.addAboutSuggestions = (req, res) => {
    (async () => {
        let purpose = "Add About Suggestions";
        try { 
            let body = req.body;

            await aboutSuggestionsRepo.create({suggestions: body.suggestions})

            return res.send({
                status: 200,
                msg: "Add about suggestions successfully",
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Add About Suggestions Error : ", err);
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
| API name          :  saftyTipsAdd
| Response          :  Respective response message in JSON format
| Logic             :  Add About Suggestions 
| Request URL       :  BASE_URL/api/add-about-suggestions
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/
module.exports.saftyTipsAdd = (req, res) => {
    (async () => {
        let purpose = "Safty Tips Add";
        try { 
          
            let body = req.body;
            
         await saftyTipsRepo.create(body)

            return res.send({
                status: 200,
                msg: "Add safty tips successfully",
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Safty Tips Error : ", err);
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
| API name          :  reportAdd
| Response          :  Respective response message in JSON format
| Logic             :  Report Data Add
| Request URL       :  BASE_URL/api/add-about-suggestions
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.reportAdd = (req, res) => {
    (async () => {
        let purpose = "Report Data Add";
        try { 
          
            let body = req.body;
            await reportRepo.create(body)

            return res.send({
                status: 200,
                msg: "Report Data Add successfully",
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Report Data Add Error : ", err);
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
| API name          :  autoCompleteSearch
| Response          :  Respective response message in JSON format
| Logic             :  Autocomplete Search
| Request URL       :  BASE_URL/api/
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.autoCompleteSearch = (req, res) => {
    (async () => {
        let purpose = "Autocomplete Search";
        try {
            let name = req.query.name;
            let body = {
                "input": name,
            }
           

            let resultData = await commonFunctions.NewAutoCompleteSearchApi(body);
            for (let result of resultData) {
                let itemData = result.placePrediction;
                if(itemData?.structuredFormat?.secondaryText?.text){
                    result._id = itemData.placeId
                    result.name = itemData.text.text;
                    result.type = 'place';
                    result.main_text = itemData.structuredFormat.mainText.text;
                    result.secondary_text = itemData?.structuredFormat?.secondaryText?.text ?? '';
                    result.image = ''; // detailsResponse.data.result?.photos[0]?.photo_reference ? detailsResponse.data.result?.photos[0]?.photo_reference : 
                    result.color_code = '';
                    delete result["types"];
                    delete result?.placePrediction;
                }
                else{
                     resultData = resultData.filter((item) => item.placePrediction.placeId !== result.placePrediction.placeId);
                }
            

            }

            return res.status(200).send({
                status: 200,
                msg: responseMessages.autcompleteSearches,
                data: resultData,
                purpose: purpose
            })

        }
        catch (err) {
            console.log("Home page filter Error : ", err);
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
| API name          :  appVersionFetch
| Response          :  Respective response message in JSON format
| Logic             :  Report Data Add
| Request URL       :  BASE_URL/api/add-about-suggestions
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.appVersionFetch = (req, res) => {
    (async () => {
        let purpose = "App Version Fetch";
        try { 
        
            const versionData = await appVersionRepo.findOne({})

            return res.send({
                status: 200,
                msg: "App version fetched successfully",
                data: versionData,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("App Version Fetch Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}