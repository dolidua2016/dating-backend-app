const UserInterests = require("../models/userInterests");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserInterestsData = new UserInterests(data);
    UserInterestsData.save()
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

module.exports.insertMany = (data) => {
  console.log(data,'data---')
  return new Promise((resolve, reject) => {
    UserInterests.insertMany(data)
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
    UserInterests.find(where)
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
        UserInterests.findOne(where)
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
        UserInterests.count(where)
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
        UserInterests.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
 
 
 // Update One Data
 module.exports.updateMany = (where, data) => {
  console.log(where, data)
  return new Promise((resolve, reject) => {
      UserInterests.updateMany(where, data)
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
    UserInterests.aggregate([
      {$match: where},
        {
         $lookup: {
           from: "interests",
           localField: "interestId",
           foreignField: "_id",
           as: "interestsDetails"
         }
      },
      {
      $group: {
      _id: "$userId",
      interests: { $push: "$$ROOT" }
      }
    },
    {
      $project: {
        userId: "$_id",
        interests: 1,
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
