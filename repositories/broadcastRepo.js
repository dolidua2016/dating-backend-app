const Broadcast = require("../models/broadcasts");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let BroadcastData = new Broadcast(data);
    BroadcastData.save()
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//Find All
module.exports.findAll = (where, data) => {
  return new Promise((resolve, reject) => {
    Broadcast.find(where)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

// find One
module.exports.findOne = (where) => {
    return new Promise((resolve, reject) => {
        Broadcast.findOne(where)
        .then((result) => {
          result =JSON.parse(JSON.stringify(result));
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};

// Count
module.exports.count = (where) => {
    return new Promise((resolve, reject) => {
        Broadcast.countDocuments(where)
        .then((result) => {
          result =JSON.parse(JSON.stringify(result));
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
  };
 
 // Update One Data
module.exports.update = (where, data) => {
    return new Promise((resolve, reject) => {
        Broadcast.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};

//Find broadcast list
module.exports.findAllWithUserDetails = (where, data) => {
  return new Promise((resolve, reject) => {
    Broadcast.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "broadcastusers",
          localField: "_id",
          foreignField: "broadcastId",
          as: "broadcastDetails",
          pipeline: [
            { $project: { _id: 1, broadcastId: 1, userId:1 } },
            {$lookup: {
               from: "users",
               localField: "userId",
               foreignField: "_id",
               as: "userDetails",
               pipeline: [
                {$project: {_id: 1, firstName: 1,lastName: 1, email: 1, phone: 1}}
               ]
            }}
          ]
        }
      },
     // { $unwind: "$userDetails" },
     ...(data.order ? [{ $sort: data.order }] : []),
     ...(data.offset ? [{ $skip: data.offset }] : []),
     ...(data.limit ? [{ $limit: data.limit }] : [])
    ])
      .then((result) => {
        resolve(JSON.parse(JSON.stringify(result)));
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};
  
