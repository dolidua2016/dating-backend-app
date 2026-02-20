const UserReports = require("../models/userReports");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserReportsData = new UserReports(data);
    UserReportsData.save()
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
    UserReports.find(where)
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
    UserReports.findOne(where)
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
    UserReports.countDocuments(where)
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
    UserReports.updateMany(where, data)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//Find All Report With User List
module.exports.findAllWithUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserReports.aggregate([
      {
        $match: where
      },
      {
        $lookup: {
          from: "users", // collection name in lowercase
          localField: "toUserId",
          foreignField: "_id",
          as: "userDetails",
          pipeline: [
            { $match: { isDeleted: 0 } },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 , email: 1,verifyBadge: 1} }
          ]
        },
      },
      {
        $lookup: {
          from: "users", // collection name in lowercase
          localField: "fromUserId",
          foreignField: "_id",
          as: "fromUserDetails",
          pipeline: [
            // { $match: { isDeleted: 0 } },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 , email: 1} }
          ]
        },
      }, // This adds on "03-Dec-2025" for get the Who report the user
      {
        $lookup: {
          from: "reports", // collection name in lowercase
          localField: "reportedId",
          foreignField: "_id",
          as: "reportDetails",
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
      { $unwind: "$fromUserDetails" },
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

//Find All Report With User List
module.exports.findAllWithUserReportedByMeAndWhomIReported = (where, data) => {
  return new Promise((resolve, reject) => {
    UserReports.aggregate([
      {
        $match: where
      },
      {
        $lookup: {
          from: "users", // collection name in lowercase
          localField: "toUserId",
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
          from: "users", // collection name in lowercase
          localField: "fromUserId",
          foreignField: "_id",
          as: "reportedBy",
          pipeline: [
            // { $match: { isDeleted: 0, isActived: 1 } },
            { $match: data.where },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 } }
          ]
        }
      },
        {
        $lookup: {
          from: "reports", // collection name in lowercase
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
      {
        $match: {
          reportedBy: {
            $exists: true,
            $ne: [],
          },
        }
      },
      { $unwind: "$reportedTo" }, // Flatten the userDetails array
      { $unwind: "$reportedBy" }, // Flatten the userDetails array
      { $sort: data.order }, // Sort the result set
      ...(data.offset !== null ? [{ $skip: data.offset }] : []),
      ...(data.limit !== null ? [{ $limit: data.limit }] : []),

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