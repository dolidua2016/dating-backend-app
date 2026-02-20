const UserQuestionAnswers = require("../models/userQuestionAnswers");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserQuestionAnswersData = new UserQuestionAnswers(data);
    UserQuestionAnswersData.save()
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
    UserQuestionAnswers.find(where)
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
        UserQuestionAnswers.findOne(where)
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
        UserQuestionAnswers.count(where)
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
        UserQuestionAnswers.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
 

//Find All
module.exports.findAllWithAnswer = (where, data) => {
  return new Promise((resolve, reject) => {
    UserQuestionAnswers.aggregate([
      {$match: where},
      {
           $lookup: {
            from: "questions",
            localField: "questionId",
            foreignField: "_id",
            as: "questions"
        }
      },
      {
      $group: {
      _id: "$userId",
      answers: { $push: "$$ROOT" }
      }
    },
    {
      $project: {
        userId: "$_id",
        answers: 1,
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

