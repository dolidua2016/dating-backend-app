const UserFavorites = require("../models/userFavorites");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserFavoritesData = new UserFavorites(data);
    UserFavoritesData.save()
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
    UserFavorites.find(where)
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
        UserFavorites.findOne(where)
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
        UserFavorites.count(where)
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
        UserFavorites.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
module.exports.findAllFavoriteUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserFavorites.aggregate([
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
                { $match: { isDeleted: 0 ,isActived: 1} },
                {$project:{_id:1,firstName:1,lastName:1,profileImage:1,city:1, address: 1,  dob: 1, verifyBadge: 1}}
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
    UserFavorites.aggregate([
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
                { $match: { isDeleted: 0 ,isActived: 1} },
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