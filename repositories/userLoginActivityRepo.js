const userLoginActivity = require("../models/userLoginActivity");
const DateTimeHelper = require("../helpers/DateTimeHelper");

module.exports.create = (data) => {
   console.log('userActivity create ------', data)
  return new Promise((resolve, reject) => {
    let userLoginActivityData = new userLoginActivity(data);
    userLoginActivityData.save()
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
   console.log('userActivity findAll', where)
  return new Promise((resolve, reject) => {
    userLoginActivity.find(where)
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
  console.log('userActivity findOne', where)
    return new Promise((resolve, reject) => {
        userLoginActivity.findOne(where)
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
        userLoginActivity.countDocuments(where)
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
        userLoginActivity.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};


module.exports.findRepeatedUserGeneralStatistic = async (where = {}, data) => {
  const now = new Date()
  const thirtyDaysAgo  = DateTimeHelper.getStartDay(now,30);
  const fifteenDaysAgo = DateTimeHelper.getStartDay(now,15);
  const sevenDaysAgo   = DateTimeHelper.getStartDay(now,7);

  const result = await userLoginActivity.aggregate([
    { $match: where },

    {
      $project: {
        userId: 1,

        last30Days: {
          $size: {
            $filter: {
              input: { $ifNull: ["$appOpenHistory", []] },
              as: "log",
              cond: { $gte: ["$$log.date", thirtyDaysAgo] }
            }
          }
        },

        last15Days: {
          $size: {
            $filter: {
              input: { $ifNull: ["$appOpenHistory", []] },
              as: "log",
              cond: { $gte: ["$$log.date", fifteenDaysAgo] }
            }
          }
        },

        last7Days: {
          $size: {
            $filter: {
              input: { $ifNull: ["$appOpenHistory", []] },
              as: "log",
              cond: { $gte: ["$$log.date", sevenDaysAgo] }
            }
          }
        }
      }
    },

    //Only users with activity
    { $match: { last30Days: { $gt: 0 } } },

    {
      $facet: {
        //USERS LIST
        users: [
          { $sort: data.order },
          
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $unwind: "$user" },

          //  Gender + Country filter
          { $match: data.userFilter },
          { $skip: data.offset },
          { $limit: data.limit },


          {
            $project: {
              userId: 1,
              last30Days: 1,
              last15Days: 1,
              last7Days: 1,
              firstName: "$user.firstName",
              lastName: "$user.lastName",
              name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
              email: "$user.email",
              phone: "$user.phone",
              countryId: "$user.countryId",
              gender: "$user.gender",
              profileImage: {
                $cond: {
                  if: {$ne: ["$user.profileImage", null]}, // Check if profile_image is not null
                  then: {$concat: [process.env.HOST_URL, "$user.profileImage"]}, // Concatenate the host URL
                  else: "$user.profileImage" // If profile_image is null, keep it as is
                }
              }
            }
          },
          {
            $lookup: {
              from: "countries",
              let: {countryIdStr: "$countryId"},
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$_id", {$toObjectId: "$$countryIdStr"}]
                    }
                  },
                },
                {
                  $project: {
                    "countryName" :1
                  },
                },
              ],
              as: "countryDetails"
            }
          },
          {
            $unwind: {
              path: "$countryDetails",
              preserveNullAndEmptyArrays: true
            }
          },
        ],

        // TOTAL COUNT (same filter)
        totalCount: [
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user"
            }
          },
          { $unwind: "$user" },

          //  Same filter here
          { $match: data.userFilter },

          { $count: "totalUsers" }
        ]
      }
    }
  ]);

  return {
    users: result[0].users,
    totalUsers: result[0].totalCount[0]?.totalUsers || 0,
    totalPages: Math.ceil(
      (result[0].totalCount[0]?.totalUsers || 0) / data.limit
    )
  };
};

module.exports.repeatedTimeList = async (where = {}, data) => {
    console.log('repeatedTimeList where ', where);
    console.log('repeatedTimeList data ', data);

  const result = await userLoginActivity.aggregate([
    { $match: where },
    {
      $project: {
        userId: 1,
        login: {
            $filter: {
              input: { $ifNull: ["$appOpenHistory", []] },
              as: "log",
              cond: { $gte: ["$$log.date", data.days] }
            }
          }
      }
    },
  ]);

  return result;
};
