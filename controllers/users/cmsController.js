/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 24th Dec, 2024`
 * MIT Licensed
 */

// ################################ Repositories ################################ //
const cmsRepo    = require("../../repositories/cmsRepo");


//################################ Response Message ###########################//
const responseMessages = require("../../responseMessages");


/*
|------------------------------------------------ 
| API name          :  fetchCms
| Response          :  Respective response message in JSON format
| Logic             :  Fetch CMS
| Request URL       :  BASE_URL/api/cms
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchCms = (req, res) => {
  (async () => {
    let purpose = "Fetch CMS";
    try {
      let query = req.query;
      let findCmsData = await cmsRepo.findOne({pageName: query.pageName})
      return res.send({
        status: 200,
        msg: responseMessages.cmsSuccess,
        data: findCmsData,
        purpose: purpose,
      });
    } catch (err) {
      console.log("Fetch CMS Error : ", err);
      return res.send({
        status: 500,
        msg: responseMessages.serverError,
        data: {},
        purpose: purpose,
      });
    }
  })();
};