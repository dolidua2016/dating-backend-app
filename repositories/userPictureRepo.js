const UserPictures = require("../models/userPictures");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  console.log(data, 'data============')
  return new Promise((resolve, reject) => {
    let UserPicturesData = new UserPictures(data);
    UserPicturesData.save()
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
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
    UserPictures.find(where)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

module.exports.findAllWithImage = (where, data) => {
  return new Promise((resolve, reject) => {
    UserPictures.aggregate([
      {
        $match: where // Filter the records based on the `where` condition
      },
      {
        $addFields: {
          withBaseUrl: "$image",
          image: {
            $cond: {
              if: { $ne: ["$image", null] }, // Check if profile_image is not null
              then: { $concat: [process.env.HOST_URL, "$image"] }, // Concatenate the host URL
              else: "$image" // If profile_image is null, keep it as is
            }
          }
        }
      },
      {
        $sort: { index: 1 } // Sort in ascending order by the 'index' field
      },
      {
        $project: {
          _id: 1, // Include _id
          userId: 1, // Include userId
          index: 1, // Include index
          image: 1, // Include the transformed profile_image field
          withBaseUrl: 1,
          imageVerificationStatus: 1,
        }
      }
    ])
      .then((result) => {
        result = JSON.parse(JSON.stringify(result)); // Convert to plain JavaScript object
        resolve(result); // Return the result
      })
      .catch((error) => {
        reject(new Error(error));; // Handle errors
      });
  });
};


// find One
module.exports.findOne = (where) => {
  return new Promise((resolve, reject) => {
    UserPictures.findOne(where)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
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
    UserPictures.count(where)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

// Update One Data
module.exports.update = (where, data) => {
  console.log('where', where)
  console.log('data', data)
  return new Promise((resolve, reject) => {
    UserPictures.updateOne(where, data)
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
  return new Promise((resolve, reject) => {
    UserPictures.updateMany(where, data)
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
    UserPictures.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "userreports",
          localField: "_id",
          foreignField: "userPictureId",
          as: "reports",
          // pipeline: [
          //   { $match: { fromUserId: data.userId, isDeleted: 0 } }
          // ]
        }
      },
      {
        $addFields: {
          image: {
            $cond: {
              if: { $ne: ["$image", null] },
              then: { $concat: [process.env.HOST_URL, "$image"] },
              else: "$image"
            }
          }
        }
      },
      {
        $group: {
          _id: "$userId",
          photos: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          userId: "$_id",
          photos: 1,
          _id: 0
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