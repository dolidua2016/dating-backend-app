const UserBlocks = require("../models/userBlocks");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserBlocksData = new UserBlocks(data);
    UserBlocksData.save()
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
    UserBlocks.find(where)
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
    UserBlocks.findOne(where)
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
    UserBlocks.countDocuments(where)
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
    UserBlocks.updateOne(where, data)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//Find All Block
module.exports.findAllBlock = (where, data) => {
  return new Promise((resolve, reject) => {
    UserBlocks.find(where)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

module.exports.findAllBlockUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserBlocks.aggregate([
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
            { $match: { isDeleted: 0, isActived: 1 } },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1 , verifyBadge: 1, isDeleted: 1, deactivateAccount: 1, isActived: 1} }
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
      { $sort: { _id: -1 } },
      { $skip: data.offset },
      { $limit: data.limit },
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

//Find All Block User List For User Details
module.exports.findAllBlockUserForUserDetails = (where, data) => {
  return new Promise((resolve, reject) => {
    UserBlocks.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "users",
          localField: "toUserId",
          foreignField: "_id",
          as: "userDetails",
          pipeline: [
            { $match: data.where },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 } }
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
      { $unwind: "$userDetails" },
      { $sort: data.order }, // Sort the result set
      ...(data.offset !== null ? [{ $skip: data.offset }] : []),
      ...(data.limit !== null ? [{ $limit: data.limit }] : []),
    ])
      .then((result) => {
        resolve(JSON.parse(JSON.stringify(result)));
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};


//Find All Block User List For User Details Who blocked me and whom i blocked
module.exports.findAllBlockUserForUserDetailsWithMyAndMe = (where, data) => {
  return new Promise((resolve, reject) => {
    UserBlocks.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "users",
          localField: "toUserId",
          foreignField: "_id",
          as: "blockByMe",
          pipeline: [
            { $match: data.where },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "fromUserId",
          foreignField: "_id",
          as: "blockedMe",
          pipeline: [
            { $match: data.where },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 } }
          ]
        }
      },
      {
        $match: {
          blockByMe: {
            $exists: true,
            $ne: [],
          },
        }
      },
      {
        $match: {
          blockedMe: {
            $exists: true,
            $ne: [],
          },
        }
      },
      { $unwind: "$blockByMe" },
      { $unwind: "$blockedMe" },
      { $sort: data.order }, // Sort the result set
      ...(data.offset !== null ? [{ $skip: data.offset }] : []),
      ...(data.limit !== null ? [{ $limit: data.limit }] : []),
    ])
      .then((result) => {
        resolve(JSON.parse(JSON.stringify(result)));
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//FindAll Block User Without Pagination
module.exports.findAllBlockUserWithoutPagination = (where) => {
  return new Promise((resolve, reject) => {
    UserBlocks.aggregate([
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
            { $match: { isDeleted: 0, isActived: 1 } },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 } }
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
      { $sort: { _id: -1 } },
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

module.exports.findTotalUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserBlocks.aggregate([
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
            { $match: { isDeleted: 0, isActived: 1 } },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1 } }
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
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//FindAll Block User Without Pagination
module.exports.findAllBlockMeUserWithoutPagination = (where) => {
  return new Promise((resolve, reject) => {
    UserBlocks.aggregate([
      {
        $match: where
      },
      {
        $lookup: {
          from: "users", // collection name in lowercase
          localField: "fromUserId",
          foreignField: "_id",
          as: "userDetails",
          pipeline: [
            { $match: { isDeleted: 0, isActived: 1 } },
            { $project: { _id: 1, firstName:1,lastName:1, profileImage: 1, city: 1, phone: 1 } }
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
      { $sort: { _id: -1 } },
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