const userPictureReports = require("../models/userPictureReports");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let userPictureReportsData = new userPictureReports(data);
    userPictureReportsData.save()
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
    userPictureReports.find(where)
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
  console.log(where,'where-----')
  return new Promise((resolve, reject) => {
    userPictureReports.findOne(where)
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
    userPictureReports.countDocuments(where)
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
    return new Promise((resolve, reject) => {
        userPictureReports.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};


//Find All Report With User List
module.exports.findAllWithUserReportedByMeAndWhomIReported = (where, data) => {
  return new Promise((resolve, reject) => {
    userPictureReports.aggregate([
      {
        $match: where
      },
      {
        $lookup: {
          from: "users", // collection name in lowercase
          localField: "userId",
          foreignField: "_id",
          as: "reportedTo",
          pipeline: [
            { $match: data.where },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 } }
          ]
        }
      },
        {
        $lookup: {
          from: "imagereports", // collection name in lowercase
          localField: "reportedId",
          foreignField: "_id",
          as: "reportDetails",
        }
      },
      {
        $match: {
          reportedTo: {
            $exists: true,
            $ne: [],
          },
        }
      },
      { $unwind: "$reportedTo" }, // Flatten the userDetails array
      { $sort: data.order }, // Sort the result set
      ...(data.offset !== null ? [{ $skip: data.offset }] : []),
      ...(data.limit !== null ? [{ $limit: data.limit }] : []),

    ])
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};