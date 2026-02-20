const UserPersonalityTraits = require("../models/userPersonalityTraits");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserPersonalityTraitsData = new UserPersonalityTraits(data);
    UserPersonalityTraitsData.save()
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
    UserPersonalityTraits.find(where)
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
        UserPersonalityTraits.findOne(where)
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
        UserPersonalityTraits.count(where)
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
        UserPersonalityTraits.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
//Find All
module.exports.findAllWithCategories = (where, data) => {
  return new Promise((resolve, reject) => {
    UserPersonalityTraits.aggregate([
      {$match: where},
       {
        $lookup: {
          from: "personalitytraits",
          localField: "personalityTraitId",
          foreignField: "_id",
          as: "personalityTraitsDetails"
       }
      },
      {
      $group: {
      _id: "$userId",
      traits: { $push: "$$ROOT" }
      }
    },
    {
      $project: {
        userId: "$_id",
        traits: 1,
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
