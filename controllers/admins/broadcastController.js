/*!
 * cmsController.js
 * Containing all the controller actions related to `broadcast`
 * Author: Doli Dua
 * Date: 10th Sep, 2025
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const userRepo = require('../../repositories/userRepo');
const broadcastRepo = require('../../repositories/broadcastRepo')
const broadcastUserRepo = require('../../repositories/broadcastUserRepo');

//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');

//#################################### Service #############################//
const { filterList,filterCondition } = require('../../services/broadcastService')

//############################ notification ###################################//
const {sendPushNotificationsForMultipleUserWithImage} = require("../../helpers/notificationFunctions")


/*
|------------------------------------------------ 
| API name          :  fetchUserList
| Response          :  Respective response message in JSON format
| Logic             :  User List Fetch
| Request URL       :  BASE_URL/admin/
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchUserList = (req, res) => {
    (async () => {
        let purpose = "User List Fetch";
        try {
            const query = req.query;
            let where = { isActived: 1, isDeleted: 0, isBlocked: 0, steps: { $gte: 11 } };
            const data = {};
            const page = query.page ? parseInt(query.page) : 1;
            console.log('page', page);
            data.limit = 10;
            data.offset = data.limit ? data.limit * (page - 1) : null;
            data.order = { "_id": -1 };

            const filterData = await filterList();


            if (query.filter) {
               where = await filterCondition(query.filter);
              where.$and = [
            ...(where.$and || []),
            { isActived: 1 },
            { isDeleted: 0 },
            { steps: { $gte: 11 }},
            {isBlocked: 0}
                ];
            }   


            if(query.search){
                where.$and=[
                    ...(where.$and || []),
                    {$or: [
                    { firstName: { $regex: query.search, $options: "i" } },
                    { lastName: { $regex: query.search, $options: "i" } },
                    { email: { $regex: query.search, $options: "i" } }
                ]}
                    // {name: {'$regex': query.search, '$options': 'i' }}
                ]
            }
           
            console.log(where,'where')

            const userList = await userRepo.findAllWithPagination(where, data);
            const totalCount = await userRepo.count(where)
            const formattedUserList = [];

             if(userList.length > 0) {
                            for(const item of userList) {
                                formattedUserList.push({
                                    _id: item._id,
                                    name: item.firstName + ' ' + item.lastName,
                                    phone: item.phone,
                                })
                            }
                            
                 }

            return res.status(200).send({
                status: 200,
                msg: responseMessages.cmsFetch,
                data: { 
                    totalPages: Math.ceil(totalCount / data.limit),
                    totalCount: totalCount,
                    userList: formattedUserList, 
                    filterData 
                    },
                purpose: purpose
            })
        }
        catch (err) {
            console.log("User List Fetch Error : ", err);
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
| API name          :  uploadImage
| Response          :  Respective response message in JSON format
| Logic             :  Broadcast Image Upload
| Request URL       :  BASE_URL/admin/
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.uploadImage = (req, res) => {
    (async () => {
        let purpose = "upload Image";
        try {
            let image = '';
            console.log(req.file,'req.file')
            if (req.file !== undefined) {
                image = `${global.constants.broadcast_image_url}/${req.file.filename}`;
            }

            return res.send({
                status: 200,
                msg: responseMessages.photosUpdate,
                data: {
                    withBaseUrl: process.env.HOST_URL + image,
                  withoutBasedUrl: image
                },
                purpose: purpose
            })

        }
        catch (err) {
            console.log("Update Photos ERROR : ", err);
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
| API name          :  broadcastCreate
| Response          :  Respective response message in JSON format
| Logic             :  Broadcast Create
| Request URL       :  BASE_URL/admin/broadcast-create
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.broadcastCreate = async (req, res) => {
  const purpose = "Broadcast Create";

  try {
    const body = req.body;
    let userIds = body.userIds || [];

    // =============================
    // SELECT ALL USERS
    // =============================
    if (body.isSelectAll) {
      let where = {
        isActived: 1,
        isDeleted: 0,
        isBlocked: 0,
        steps: { $gte: 11 }
      };

      if (body.filter) {
        const filterWhere = await filterCondition(body.filter);
        where = {
          $and: [
            ...(filterWhere.$and || []),
            { isActived: 1 },
            { isDeleted: 0 },
            { isBlocked: 0 },
            { steps: { $gte: 11 } }
          ]
        };
      }

      if (body.search) {
        where.$and = [
          ...(where.$and || []),
          {
            $or: [
              { firstName: { $regex: body.search, $options: "i" } },
              { lastName: { $regex: body.search, $options: "i" } },
              { email: { $regex: body.search, $options: "i" } }
            ]
          }
        ];
      }

      const userList = await userRepo.findAllWithPagination(where, {});
      userIds = userList.map(u => u._id);
    }
    console.log(userIds.length,'userIds.length')
    if (!userIds.length) {
      return res.send({
        status: 400,
        msg: "No users found for broadcast",
        data: {},
        purpose
      });
    }

    // =============================
    // CREATE BROADCAST
    // =============================
    const broadcast = await broadcastRepo.create({
      title: body.title,
      message: body.message,
      image: body.image
    });

    // Link users with broadcast (bulk insert recommended)
    await broadcastUserRepo.insertMany(
      userIds.map(userId => ({
        broadcastId: broadcast._id,
        userId
      }))
    );

    // =============================
    // PUSH PAYLOAD
    // =============================
    const pushData = {
      title: body.title,
      message: body.message,
      type: "broadcast",
      linkedId: broadcast._id.toString(),
      image: body.image ? process.env.HOST_URL + body.image : ""
    };

    // =============================
    // CHUNK (500 LIMIT)
    // =============================
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < userIds.length; i += chunkSize) {
      chunks.push(userIds.slice(i, i + chunkSize));
    }
    console.log(chunks.length, 'total chunks');
    // PARALLEL SEND
    await Promise.all(
      chunks.map(chunk =>
        sendPushNotificationsForMultipleUserWithImage(pushData, chunk)
      )
    );

    return res.send({
      status: 200,
      msg: responseMessages.broadcastCreate,
      data: broadcast,
      purpose
    });

  } catch (err) {
    console.error("Broadcast Create Error:", err);
    return res.send({
      status: 500,
      msg: responseMessages.serverError,
      data: {},
      purpose
    });
  }
};



/*
|------------------------------------------------ 
| API name          :  broadcastList
| Response          :  Respective response message in JSON format
| Logic             :  Broadcast List
| Request URL       :  BASE_URL/admin/
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
module.exports.broadcastList = async(req, res) => {
        const purpose = "Broadcast list";
        try {
            const queryParam = req.query;

            // Filter only non-deleted broadcasts
            const where = { isDeleted: 0 };

            // Handle pagination
            const page = queryParam.page ? parseInt(queryParam.page) : 1;
            let data = {};
            data.limit = 20;
            data.offset = data.limit ? data.limit * (page - 1) : null;
            data.order = {_id : -1}


            // Fetch list of broadcasts along with associated users
            const broadcastList = await broadcastRepo.findAllWithUserDetails(where, data);
            const broadcastCount = await broadcastRepo.count(where);

             const Result = await Promise.all(
                    broadcastList.map(async (element) => ({
                    _id: element._id,
                    message: element.message,
                    image: element?.image ? process.env.HOST_URL + element.image : '', 
                    title: element.title,
                    createdAt: element.createdAt,
                    userList: element.broadcastDetails.map(item => item.userDetails[0])
                    }))
             );

            return res.send({
                status: 200,
                msg: responseMessages.broadcastList,
                data: {
                    broadcastCount: broadcastCount,
                    broadcastList: Result,
                },
                purpose: purpose
            })

        }
        catch (err) {
            console.log("Broadcast list Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
}

/*
|------------------------------------------------ 
| API name          :  broadcastDelete
| Response          :  Respective response message in JSON format
| Logic             :  Broadcast Delete
| Request URL       :  BASE_URL/admin
| Request method    :  PUT
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.broadcastDelete = async(req, res) => {
        const purpose = "Broadcast Delete";
        try {
            const body = req.body;


            // Check if the broadcast message exists and is not already deleted
            const findOneBroadcast = await broadcastRepo.findOne({_id: body?.id, isDeleted: 0 });
            if (!findOneBroadcast) {

                return res.send({
                    status: 404,
                    msg: responseMessages.broadcastNotFound,
                    data: {},
                    purpose: purpose
                })
            }

            // Soft delete the broadcast message by updating isDeleted to '1'
            await broadcastRepo.update({ _id: findOneBroadcast?._id }, { isDeleted: 1 });

            return res.send({
                status: 200,
                msg: responseMessages.broadcastDelete,
                data: {},
                purpose: purpose
            })

        }
        catch (err) {
            console.log("Broadcast Delete Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
   
}