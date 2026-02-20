const Interests = require("../models/interests");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let InterestsData = new Interests(data);
    InterestsData.save()
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
    Interests.find(where)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//Find All With User Interest
module.exports.findAllWithUserInterest = (where, data) => {
  return new Promise((resolve, reject) => {
    Interests.aggregate([
      {
        $match: where
      },
      {
        $lookup: {
          from: mongoose.model("userInterests").collection.name,
          localField: "_id",
          foreignField: "interestId",
          as: "user_interest_details",
          pipeline: [
            {
              $match: {
                userId: mongoose.Types.ObjectId.createFromHexString(data.userID)
              }
            },
            {
              $limit: 1
            }
          ]
        }
      },
      {
        $unwind: {
          path: "$user_interest_details",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          categoryName: 1,
          types: 1,
          isActived: 1,
          user_interest_details: 1
        }
      }
    ])
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
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
        Interests.findOne(where)
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
        Interests.count(where)
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
        Interests.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
