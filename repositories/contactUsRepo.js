const contactUs = require("../models/contactUs");
const mongoose = require("mongoose");


module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let contactUsData = new contactUs(data);
    contactUsData.save()
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
    contactUs.find(where)
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
module.exports.findAllWithPagination = (where, data) => {
  return new Promise((resolve, reject) => {
    contactUs.find(where)
      .sort(data.order)
      .skip(data.offset)
      .limit(data.limit)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

module.exports.findAllWithUserDetails = (where, data) => {
  return new Promise((resolve, reject) => {
    contactUs.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
          pipeline: [
            // { $match: data.where },
            { $match: { isDeleted:0 } },
            { $project: { _id: 1, profileImage: 1 } }
          ]
        }
      },
      {
        $match: {
          userDetails: {
            $exists: true,
            $ne: [],
          },
        }
      },
      { $unwind: "$userDetails" },
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

// find One
module.exports.findOne = (where) => {
    return new Promise((resolve, reject) => {
        contactUs.findOne(where)
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
        contactUs.countDocuments(where)
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
        contactUs.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
