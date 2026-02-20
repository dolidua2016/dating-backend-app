const userWrapItUps = require("../models/userWrapItUps");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let userWrapItUpsData = new userWrapItUps(data);
    userWrapItUpsData.save()
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
    userWrapItUps.find(where)
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
        userWrapItUps.findOne(where)
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
        userWrapItUps.count(where)
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
        userWrapItUps.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};

module.exports.updateMany = (where, data) => {
    return new Promise((resolve, reject) => {
        userWrapItUps.updateMany(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
  
//Find All
module.exports.findAllWithTypes = (where, data) => {
  return new Promise((resolve, reject) => {
    userWrapItUps.aggregate([
      {$match: where},
      {
         $lookup: {
            from: "wrapitups",
            localField: "WrapItUpId",
            foreignField: "_id",
            as: "wrapitupsDetails"
       }
      },
      {
      $group: {
      _id: "$userId",
      wrapitup: { $push: "$$ROOT" }
      }
    },
    {
      $project: {
        userId: "$_id",
        wrapitup: 1,
        _id: 0
      }
    }
    ])
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};
