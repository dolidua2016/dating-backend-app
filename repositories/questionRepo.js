const Questions = require("../models/questions");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let QuestionsData = new Questions(data);
    QuestionsData.save()
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
    Questions.find(where)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

module.exports.findAllWithAnswers = (where, data) => {
  return new Promise((resolve, reject) => {
    Questions.aggregate([
      {
        $match: where // Apply the where filter to questions
      },
      {
        $lookup: {
          from: mongoose.model("QuestionAnswers").collection.name, // The collection to join with
          localField: "_id", // The field in Questions collection
          foreignField: "questionId", // The field in QuestionAnswers collection
          as: "answer_details", // The name of the new array field to hold matched documents
          pipeline: [
            {
              $match: {
                userId: mongoose.Types.ObjectId.createFromHexString(data.userID),
                isDeleted: 0 // Filter by the `userId` passed from data
              }
            },
            {
              $limit: 1 // Limit to one answer per question
            },
            
          ]
        }
      },
      {
        $unwind: {
          path: "$answer_details", // Flatten the array to get a single object per question
          preserveNullAndEmptyArrays: true // Allow questions without answers to still appear
        }
      },
      {
        $project: {
          _id: 1,
          question: 1,
          placeholder: 1,
          isActived: 1,
          isDeleted: 1,
          answer_details: 1 // This will now be an object, not an array
        }
      }
    ])
      .then((result) => {
        result = JSON.parse(JSON.stringify(result)); // Convert to plain JavaScript object
        resolve(result); // Resolve the promise with the result
      })
      .catch((error) => {
        reject(new Error(error));; // Reject the promise if there's an error
      });
  });
};




// find One
module.exports.findOne = (where) => {
    return new Promise((resolve, reject) => {
        Questions.findOne(where)
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
        Questions.count(where)
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
        Questions.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
