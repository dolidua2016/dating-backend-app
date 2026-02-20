const UserLikes = require("../models/userLikes");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserLikesData = new UserLikes(data);
    UserLikesData.save()
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
    UserLikes.find(where)
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
module.exports.findAllUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserLikes.aggregate([
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

//Find All
module.exports.findLikeMeUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserLikes.aggregate([
      {
        $match:where
      },
      {
        $lookup: {
            from: "users", // collection name in lowercase
            localField: "fromUserId",
            foreignField: "_id",
            as: "userDetails",
            pipeline: [
                { $match: { isDeleted: 0 ,isActived: 1, isVisible: true, ...(data.deactivateAccount ? data.deactivateAccount : {})} }, // TODO: -----> here deactivate account is added newly for filter out the Deactivated account
                {$project:{_id:1,firstName:1,lastName:1,profileImage:1,city:1, address: 1, dob: 1, verifyBadge: 1,privacyLocked: 1, deactivateAccountAt: 1}}
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

// find One
module.exports.findOne = (where) => {
    return new Promise((resolve, reject) => {
        UserLikes.findOne(where)
        .then((result) => {
          result =JSON.parse(JSON.stringify(result));
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};

module.exports.findLikeMeTotalUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserLikes.aggregate([
      {
        $match:where
      },
      {
        $lookup: {
            from: "users", // collection name in lowercase
            localField: "fromUserId",
            foreignField: "_id",
            as: "userDetails",
            pipeline: [
                { $match: { isDeleted: 0 ,isActived: 1, isVisible: true,...(data.deactivateAccount ? data.deactivateAccount : {})} },
                {$project:{_id:1,firstName:1,lastName:1,profileImage:1,city:1, address: 1, dob: 1, verifyBadge: 1}}
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

module.exports.findTotalUser = (where, data) => {
  return new Promise((resolve, reject) => {
    UserLikes.aggregate([
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
    // { $unwind: "$userDetails" }, // Flatten the userDetails array
    // {$sort:{_id:-1}},
    // { $skip: data.offset },
    // { $limit: data.limit }, 
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


module.exports.count = (where) => {
    return new Promise((resolve, reject) => {
        UserLikes.countDocuments(where)
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
        UserLikes.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};


module.exports.updateMany = (where, data) => {
  console.log(where,'where', data)
  return new Promise((resolve, reject) => {
      UserLikes.updateMany(where, data)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

 //Find All
module.exports.findLikeUser = (where, data) => {
 const myUserId  = where.toUserId
  return new Promise((resolve, reject) => {
    UserLikes.aggregate([
  {
    $match: where
  },
  {
    $lookup: {
      from: "userlikes",
      let: { otherUserId: "$fromUserId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$fromUserId", myUserId] },
                { $eq: ["$toUserId", "$$otherUserId"] },
                { $eq: ["$isActived", 1] },
                { $eq: ["$isDeleted", 0] }
              ]
            }
          }
        }
      ],
      as: "alreadyLiked"
    }
  },
  {
    $lookup: {
      from: "userpasses",
      let: { otherUserId: "$fromUserId" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$fromUserId", myUserId] },
                { $eq: ["$toUserId", "$$otherUserId"] },
                { $eq: ["$isActived", 1] },
                { $eq: ["$isDeleted", 0] }
              ]
            }
          }
        }
      ],
      as: "alreadyPassed"
    }
  },
  {
    $match: {
      alreadyLiked: { $size: 0 },
      alreadyPassed: { $size: 0 }
    }
  },
  {
    $sort: { createdAt: -1 }
  },

  { $skip: data.offset },
  { $limit: data.limit },

  {
    $lookup: {
      from: "users",
      localField: "fromUserId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },
  {
    $match: {
      "user.isDeleted": 0,
      "user.isActived": 1,
      "user.isBlocked": 0
    }
  },

  {
    $project: {
      _id: 0,
      userId: "$user._id",
      // name: "$user.name",
      // gender: "$user.gender",
      // profileImage: "$user.profileImage",
      // likedAt: "$createdAt"
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
