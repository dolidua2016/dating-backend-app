const UserPasses = require("../models/userPasses");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  console.log('data===',data)
  return new Promise((resolve, reject) => {
    let UserPassesData = new UserPasses(data);
    UserPassesData.save()
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
    UserPasses.find(where)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

module.exports.findAllPassUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserPasses.aggregate([
      {
        $match:where
      },
      {
        $lookup: {
            from: "users", // collection name in lowercase
            localField: "toUserId",
            foreignField: "_id",
            as: "userDetails",
            pipeline: [
                { $match: { isDeleted: 0 ,isActived: 1, isVisible: true,...(data.deactivateAccount ? data.deactivateAccount : {})} },
                {$project:{_id:1,firstName:1,lastName:1,profileImage:1,city:1, address: 1,  dob: 1, verifyBadge: 1, privacyLocked: 1, deactivateAccountAt: 1}}
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
    { $unwind: "$userDetails" }, // Flatten the userDetails array
    {$sort:{_id:-1}},
    { $skip: data.offset },
    { $limit: data.limit }, 
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

module.exports.findTotalUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserPasses.aggregate([
      {
        $match:where
      },
      {
        $lookup: {
            from: "users", // collection name in lowercase
            localField: "toUserId",
            foreignField: "_id",
            as: "userDetails",
            pipeline: [
                { $match: { isDeleted: 0 ,isActived: 1, isVisible: true,...(data.deactivateAccount ? data.deactivateAccount : {})} },
                {$project:{_id:1,firstName:1,lastName:1,profileImage:1,city:1}}
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

// find One
module.exports.findOne = (where) => {
    return new Promise((resolve, reject) => {
        UserPasses.findOne(where)
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
        UserPasses.countDocuments(where)
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
        UserPasses.updateOne(where, data)
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
        UserPasses.updateMany(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  

//Find All Passes
module.exports.findAllPass = (where, data) => {
  return new Promise((resolve, reject) => {
    UserPasses.find(where)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};
