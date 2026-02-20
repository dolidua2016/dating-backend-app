/*!
 * cmsController.js
 * Containing all the controller actions related to `Cms`
 * Author: Sukla Manna
 * Date: 17th July 2025
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const cmsRepo         = require('../../repositories/cmsRepo');
const adminRepo       = require('../../repositories/adminRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');

/*
|------------------------------------------------ 
| API name          :  cmsFetch
| Response          :  Respective response message in JSON format
| Logic             :  Cms Fetch
| Request URL       :  BASE_URL/admin/cms-fetch
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.cmsFetch = (req, res) => {
    (async () => {
        let purpose = "Cms Fetch";
        try { 
            const query = req.query;

            const cmsDetails = await cmsRepo.findOne({ pageName:query.pageName });

            return res.status(200).send({
                status: 200,
                msg: responseMessages.cmsFetch,
                data: cmsDetails || {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Cms Fetch Error : ", err);
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
| API name          :  cmsAddUpdate
| Response          :  Respective response message in JSON format
| Logic             :  Cms Update
| Request URL       :  BASE_URL/admin/cms-update
| Request method    :  PUT
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.cmsUpdate = (req, res) => {
    (async () => {
        let purpose = "Cms Update";
        try { 
            const body = req.body;
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

            const cmsDetails = await cmsRepo.findOne({ _id:body.id });
            if(!cmsDetails) {
                return res.status(404).send({
                    status: 404,
                    msg: responseMessages.cmsNotFound,
                    data: {},
                    purpose: purpose
                })
            }

            await cmsRepo.update({ _id:cmsDetails._id }, {content:body.content});
            const updatedCmsDetails = await cmsRepo.findOne({ _id:cmsDetails._id });

            return res.status(200).send({
                status: 200,
                msg: responseMessages.cmsUpdate,
                data: updatedCmsDetails,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Cms Update Error : ", err);
            return res.status(500).send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}