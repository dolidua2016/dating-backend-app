const User = require("../models/users");
const Inbox = require("../models/inboxes");
const mongoose = require("mongoose");
const DateTimeHelper = require('../helpers/DateTimeHelper')

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let UserData = new User(data);
    UserData.save()
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
    User.find(where)
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
module.exports.findAllWithPagination = (where, data) => {
  return new Promise((resolve, reject) => {
    User.find(where)
      .sort(data.order)
      .skip(data.offset)
      .limit(data.limit)
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
    User.findOne(where)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};
// find One user's basic details
module.exports.findBasicDetails = (where) => {
  return new Promise((resolve, reject) => {
    User.findOne(where).populate({
      path: 'countryId',
      strictPopulate: false,
      select: '_id countryFlag countryName countryCode telephoneCode'
    })
      .populate({ path: 'stateId', strictPopulate: false })
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};

// Count
module.exports.count = (where) => {
  return new Promise((resolve, reject) => {
    User.countDocuments(where)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};

// Update One Data
module.exports.update = (where, data) => {
  return new Promise((resolve, reject) => {
    User.updateOne(where, data)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};


module.exports.profileDetails = (where, data) => {

  return new Promise((resolve, reject) => {
    User.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "userwrapitups", // collection name in lowercase
          localField: "_id",
          foreignField: "userId",
          as: "userwrapitupsDetails",
          pipeline: [
            {
              $lookup: {
                from: "wrapitups", // collection name in lowercase
                localField: "WrapItUpId",
                foreignField: "_id",
                as: "wrapitupsDetails",
              }
            },
            {
              $match: { isDeleted: 0, isActived: 1 }
            },

          ]
        }
      },
      {
        $lookup: {
          from: "questionanswers", // collection name in lowercase
          localField: "_id",
          foreignField: "userId",
          as: "questionAnswers",
          pipeline: [
            {
              $lookup: {
                from: "questions", // collection name in lowercase
                localField: "questionId",
                foreignField: "_id",
                as: "questions",

              }
            },
            {
              $match: { isDeleted: 0, isActived: 1 }
            },

          ]
        }
      },
      {
        $lookup: {
          from: "userinterests", // collection name in lowercase
          localField: "_id",
          foreignField: "userId",
          as: "userInterestsDetails",
          pipeline: [
            {
              $lookup: {
                from: "interests", // collection name in lowercase
                localField: "interestId",
                foreignField: "_id",
                as: "interestsDetails",
              },
            },
            {
              $match: { isDeleted: 0, isActived: 1 }
            },
          ]
        }
      },
      {
        $lookup: {
          from: "userpersonalitytraits", // collection name in lowercase
          localField: "_id",
          foreignField: "userId",
          as: "userPersonalityTraitsDetails",
          pipeline: [
            {
              $lookup: {
                from: "personalitytraits", // collection name in lowercase
                localField: "personalityTraitId",
                foreignField: "_id",
                as: "personalityTraitsDetails",
              }
            },
            {
              $match: { isDeleted: 0, isActived: 1 }
            },
          ]
        }
      },
      {
        $lookup: {
          from: "userpictures", // collection name in lowercase
          localField: "_id",
          foreignField: "userId",
          as: "photos",
          pipeline: [
            {
              $match: { isDeleted: 0 },
            },
            {
              $lookup: {
                from: 'userreports',
                localField: '_id',
                foreignField: 'userPictureId',
                as: 'reports',
                pipeline: [
                  { $match: { fromUserId: data?.userId, isDeleted: 0 } }
                ]
              }
            },
            {
              $addFields: {
                image: {
                  $cond: {
                    if: { $ne: ["$image", null] }, // Check if profile_image is not null
                    then: { $concat: [process.env.HOST_URL, "$image"] }, // Concatenate the host URL
                    else: "$image" // If profile_image is null, keep it as is
                  }
                }
              }
            },
          ]
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



//Find All
module.exports.findTotalUser = (where, data) => {
  return new Promise((resolve, reject) => {
    User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(data.location.long), parseFloat(data.location.lat)],
          },
          distanceField: "distance",
          key: "location",
          spherical: true,
          distanceMultiplier: 0.001
        }
      },
      { $match: where },
      {
        $addFields: {
          maritalStatusOrder: data.maritalStatus || '',
          marriedOrder: data.married || '',
          religiousOrder: data.religious || '',
        }
      },

      // { $sort: { maritalStatusOrder: 1, marriedOrder: 1,  religiousOrder: 1, distance: 1 } },  // Sort by custom order

    ]).then((result) => {
      result = JSON.parse(JSON.stringify(result));
      resolve(result);
    })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

// Update One Data
module.exports.findOneAndUpdate = (where, data) => {
  console.log('where', where, 'data', data)
  return new Promise((resolve, reject) => {
    User.findOneAndUpdate(where, data)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//Find All
// module.exports.findAllWithLoginActivity = (where, data) => {
//   return new Promise((resolve, reject) => {
//     User.aggregate([
//       { $match: where },

//       // 1) Lookup login activities
//       {
//         $lookup: {
//           from: "userloginactivities",
//           localField: "_id",
//           foreignField: "userId",
//           as: "login"
//         }
//       },

//       // 2) Unwind login
//       { 
//         $unwind: { 
//           path: "$login", 
//           preserveNullAndEmptyArrays: true 
//         } 
//       },

//      // 3) Extract sorted date list safely
//         {
//           $addFields: {
//             activityDates: {
//               $sortArray: {
//                 input: {
//                   $map: {
//                     input: { $ifNull: ["$login.appOpenHistory", []] },
//                     as: "h",
//                     in: { $dateTrunc: { date: "$$h.date", unit: "day" } }
//                   }
//                 },
//                 sortBy: 1
//               }
//             }
//           }
//         },

//         // 4) First login safe
//         {
//           $addFields: {
//             signupDate: {
//               $ifNull: [
//                 { $arrayElemAt: ["$activityDates", 0] },
//                 null
//               ]
//             }
//           }
//         },

//         // 5) dayDiffs safe
//         {
//           $addFields: {
//             dayDiffs: {
//               $ifNull: [
//                 {
//                   $map: {
//                     input: "$activityDates",
//                     as: "d",
//                     in: {
//                       $dateDiff: {
//                         startDate: "$signupDate",
//                         endDate: "$$d",
//                         unit: "day"
//                       }
//                     }
//                   }
//                 },
//                 []
//               ]
//             }
//           }
//         },

//         // 6) Count loginTime safely
//         {
//           $addFields: {
//             loginTime: {
//               $size: {
//                 $filter: {
//                   input: "$dayDiffs",
//                   as: "dd",
//                   cond: {
//                     $and: [
//                       { $gte: ["$$dd", data.startDateCount] },
//                       { $lte: ["$$dd", data.endDateCount] }
//                     ]
//                   }
//                 }
//               }
//             }
//           }
//         },

//       {
//       $match: {
//         loginTime: { $gte: data.repeatedCount }
//       }
//     },

//       // 7) Clean up
//       {
//         $project: {
//           dayDiffs: 0
//         }
//       },

//       // 13) Pagination
//       { $skip: data.offset },
//       { $limit: data.limit }
//     ])
//       .then((result) => resolve(JSON.parse(JSON.stringify(result))))
//       .catch((error) => reject(new Error(error)));
//   });
// };



module.exports.findAllWithLoginActivity = (where, data) => {
  return new Promise((resolve, reject) => {
    User.aggregate([
      { $match: where },

      // 1) Lookup login activities
      {
        $lookup: {
          from: "userloginactivities",
          localField: "_id",
          foreignField: "userId",
          as: "login"
        }
      },

      // 2) Unwind login
      {
        $unwind: {
          path: "$login",
          preserveNullAndEmptyArrays: true
        }
      },

      // 3) Filter history by user input date range
      {
        $addFields: {
          filteredHistory: {
            $filter: {
              input: { $ifNull: ["$login.appOpenHistory", []] },
              as: "h",
              cond: {
                $and: [
                  { $gte: ["$$h.date", new Date(data.activityStartDate)] },
                  { $lte: ["$$h.date", new Date(data.activityEndDate)] }
                ]
              }
            }
          }
        }
      },

      // 4) Extract sorted date list safely
      {
        $addFields: {
          activityDates: {
            $sortArray: {
              input: {
                $map: {
                  input: "$filteredHistory",
                  as: "h",
                  in: { $dateTrunc: { date: "$$h.date", unit: "day" } }
                }
              },
              sortBy: 1
            }
          }
        }
      },

      // 5) First login safe
      {
        $addFields: {
          signupDate: {
            $ifNull: [
              { $arrayElemAt: ["$activityDates", 0] },
              null
            ]
          }
        }
      },

      // 6) dayDiffs safe
      {
        $addFields: {
          dayDiffs: {
            $ifNull: [
              {
                $map: {
                  input: "$activityDates",
                  as: "d",
                  in: {
                    $dateDiff: {
                      startDate: "$signupDate",
                      endDate: "$$d",
                      unit: "day"
                    }
                  }
                }
              },
              []
            ]
          }
        }
      },

      // 7) Count loginTime safely
      {
        $addFields: {
          loginTime: {
            $size: {
              $filter: {
                input: "$dayDiffs",
                as: "dd",
                cond: {
                  $and: [
                    { $gte: ["$$dd", data.startDateCount] },
                    { $lte: ["$$dd", data.endDateCount] }
                  ]
                }
              }
            }
          }
        }
      },
      // 8) Match repeated users
      {
        $match: {
          loginTime: { $gte: data.repeatedCount }
        }
      },

      // Cleanup
      { $project: { dayDiffs: 0, filteredHistory: 0 } },

      // Pagination
      { $skip: data.offset },
      { $limit: data.limit }

    ])
      .then((result) => resolve(JSON.parse(JSON.stringify(result))))
      .catch((error) => reject(new Error(error)));
  });
};

module.exports.CountWithLoginActivity = (where, data) => {
  return new Promise((resolve, reject) => {
    User.aggregate([
      { $match: where },

      // 1) Lookup login activities
      {
        $lookup: {
          from: "userloginactivities",
          localField: "_id",
          foreignField: "userId",
          as: "login"
        }
      },

      // 2) Unwind login
      {
        $unwind: {
          path: "$login",
          preserveNullAndEmptyArrays: true
        }
      },

      // 3) Filter history by user input date range
      {
        $addFields: {
          filteredHistory: {
            $filter: {
              input: { $ifNull: ["$login.appOpenHistory", []] },
              as: "h",
              cond: {
                $and: [
                  { $gte: ["$$h.date", new Date(data.activityStartDate)] },
                  { $lte: ["$$h.date", new Date(data.activityEndDate)] }
                ]
              }
            }
          }
        }
      },

      // 4) Extract sorted date list safely
      {
        $addFields: {
          activityDates: {
            $sortArray: {
              input: {
                $map: {
                  input: "$filteredHistory",
                  as: "h",
                  in: { $dateTrunc: { date: "$$h.date", unit: "day" } }
                }
              },
              sortBy: 1
            }
          }
        }
      },

      // 5) First login safe
      {
        $addFields: {
          signupDate: {
            $ifNull: [
              { $arrayElemAt: ["$activityDates", 0] },
              null
            ]
          }
        }
      },

      // 6) dayDiffs safe
      {
        $addFields: {
          dayDiffs: {
            $ifNull: [
              {
                $map: {
                  input: "$activityDates",
                  as: "d",
                  in: {
                    $dateDiff: {
                      startDate: "$signupDate",
                      endDate: "$$d",
                      unit: "day"
                    }
                  }
                }
              },
              []
            ]
          }
        }
      },

      // 7) Count loginTime safely
      {
        $addFields: {
          loginTime: {
            $size: {
              $filter: {
                input: "$dayDiffs",
                as: "dd",
                cond: {
                  $and: [
                    { $gte: ["$$dd", data.startDateCount] },
                    { $lte: ["$$dd", data.endDateCount] }
                  ]
                }
              }
            }
          }
        }
      },

      // 8) Match repeated users
      {
        $match: {
          loginTime: { $gte: data.repeatedCount }
        }
      },

      // Cleanup
      { $project: { dayDiffs: 0, filteredHistory: 0 } },


    ])
      .then((result) => resolve(JSON.parse(JSON.stringify(result))))
      .catch((error) => reject(new Error(error)));
  });
};


module.exports.findAllWithReportedUsers = (where, data) => {
  return new Promise((resolve, reject) => {
    User.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "userreports",
          localField: "_id",
          foreignField: "toUserId",
          as: "reportedusers"
        }
      },
      {
        $match: {
          reportedusers: {
            $exists: true,
            $ne: [],
          },
        }
      },
      //  Pagination
      { $skip: data.offset },
      { $limit: data.limit }

    ])
      .then((result) => resolve(JSON.parse(JSON.stringify(result))))
      .catch((error) => reject(new Error(error)));

  });
};


module.exports.countWithReportedUsers = (where) => {
  return new Promise((resolve, reject) => {
    User.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "userreports",
          localField: "_id",
          foreignField: "toUserId",
          as: "reportedusers"
        }
      },
      {
        $match: {
          reportedusers: {
            $exists: true,
            $ne: [],
          },
        }
      },

    ])
      .then((result) => resolve(JSON.parse(JSON.stringify(result))))
      .catch((error) => reject(new Error(error)));

  });
};


module.exports.findCountryUsers = (where = {}) => {
  const now = new Date();

  // UTC day boundaries
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

  const endOfYesterday = new Date(startOfToday);
  endOfYesterday.setUTCMilliseconds(-1);

  const last90Days = DateTimeHelper.getStartDay(now, 90)
  const last60Days = DateTimeHelper.getStartDay(now, 60)
  const last45Days = DateTimeHelper.getStartDay(now, 45)
  const last30Days = DateTimeHelper.getStartDay(now, 30)
  const last15Days = DateTimeHelper.getStartDay(now, 15)
  const last7Days = DateTimeHelper.getStartDay(now, 7)

  return User.aggregate([
    {
      $match: {
        ...where,
        countryId: {
          $exists: true,
          $type: "string",
          $regex: /^[0-9a-fA-F]{24}$/
        }
      }
    },

    {
      $group: {
        _id: "$countryId",

        // All-time users
        allTimeCount: { $sum: 1 },
        // Last 90-days users
        last90DaysCount: {
          $sum: { $cond: [{ $gte: ["$createdAt", last90Days] }, 1, 0] }
        },
        // Last 60-day users
        last60DaysCount: {
          $sum: { $cond: [{ $gte: ["$createdAt", last60Days] }, 1, 0] }
        },
        // Last 45-day users
        last45DaysCount: {
          $sum: { $cond: [{ $gte: ["$createdAt", last45Days] }, 1, 0] }
        },
        // Last 30-day users
        last30DaysCount: {
          $sum: { $cond: [{ $gte: ["$createdAt", last30Days] }, 1, 0] }
        },
        // Last 15-day users
        last15DaysCount: {
          $sum: { $cond: [{ $gte: ["$createdAt", last15Days] }, 1, 0] }
        },
        // Last 7-day users
        last7DaysCount: {
          $sum: { $cond: [{ $gte: ["$createdAt", last7Days] }, 1, 0] }
        },
        // yesterdays users
        yesterDayCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $lte: ["$createdAt", startOfYesterday]
                  },
                  {
                    $gte: ["$createdAt", endOfYesterday]
                  }
                ]
              },
              1,
              0
            ]
          }
        },

        // today users
        todayDayCount: {
          $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0] }
        },
      }
    },
    {
      $project: {
        _id: 0,
        countryId: "$_id",
        allTimeCount: 1,
        last90DaysCount: 1,
        last60DaysCount: 1,
        last45DaysCount: 1,
        last30DaysCount: 1,
        last15DaysCount: 1,
        last7DaysCount: 1,
        yesterDayCount: 1,
        todayDayCount: 1,
      }
    },

    // Lookup country details
    {
      $lookup: {
        from: "countries",
        let: { countryIdStr: "$countryId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", { $toObjectId: "$$countryIdStr" }]
              }
            }
          }
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


    { $sort: { allTimeCount: -1 } }
  ]);
};


module.exports.findStepUsers = (where = {}) => {
  return User.aggregate([
    { $match: where },

    // Normalize steps
    {
      $addFields: {
        normalizedStep: {
          $cond: [
            { $gte: ["$steps", 13] },
            13,
            { $ifNull: ["$steps", 0] }
          ]
        }
      }
    },

    // Group by step
    {
      $group: {
        _id: "$normalizedStep",
        count: { $sum: 1 }
      }
    },

    // Collect result into array
    {
      $group: {
        _id: null,
        stats: {
          $push: {
            step: "$_id",
            count: "$count"
          }
        }
      }
    },

    // 🔥 Generate all steps (0–13)
    {
      $project: {
        steps: {
          $map: {
            input: { $range: [0, 14] },
            as: "step",
            in: {
              step: "$$step",
              count: {
                $let: {
                  vars: {
                    matched: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$stats",
                            as: "s",
                            cond: { $eq: ["$$s.step", "$$step"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ["$$matched.count", 0] }
                }
              }
            }
          }
        }
      }
    },

    { $unwind: "$steps" },

    // Step name mapping
    {
      $addFields: {
        stepName: {
          $switch: {
            branches: [
              { case: { $eq: ["$steps.step", 0] }, then: "Only Registered" },
              { case: { $eq: ["$steps.step", 1] }, then: "Added Name" },
              { case: { $eq: ["$steps.step", 2] }, then: "Added DOB" },
              { case: { $eq: ["$steps.step", 3] }, then: "Added Phone" },
              { case: { $eq: ["$steps.step", 4] }, then: "Added Gender" },
              { case: { $eq: ["$steps.step", 5] }, then: "Added Wrap" },
              { case: { $eq: ["$steps.step", 6] }, then: "Added Picture" },
              { case: { $eq: ["$steps.step", 7] }, then: "Added Selfie" },
              { case: { $eq: ["$steps.step", 8] }, then: "Added Ejamaat" },
              { case: { $eq: ["$steps.step", 9] }, then: "Added About" },
              { case: { $eq: ["$steps.step", 10] }, then: "Added Question" },
              { case: { $eq: ["$steps.step", 11] }, then: "Added Interest" },
              { case: { $eq: ["$steps.step", 12] }, then: "Added Personality" },
              { case: { $eq: ["$steps.step", 13] }, then: "Profile Completed" }
            ],
            default: "Unknown Step"
          }
        }
      }
    },

    {
      $project: {
        _id: 0,
        steps: "$steps.step",
        stepName: 1,
        count: "$steps.count"
      }
    },

    { $sort: { steps: 1 } }
  ]);
};


module.exports.findAllUser = (where, data, agePriorityData) => {

  return new Promise(async (resolve, reject) => {
    try {
      const now = new Date();
      const offset = parseInt(data.offset) || 0;
      const limit = parseInt(data.limit) || 20;

      const pipeline = [
        // ===============================
        //  GEO NEAR
        // ===============================
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(data.location.long),
                parseFloat(data.location.lat)
              ]
            },
            distanceField: "distance",
            key: "location",
            spherical: true,
            distanceMultiplier: 0.001
          }
        },
        // ===============================
        //   Distance fix
        // ===============================
        {
          $addFields: {
            distanceNum: {
              $convert: {
                input: "$distance",
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        },
        // ===============================
        //  Country Priority
        // ===============================
        {
          $addFields: {
            isCountyUser: {
              $cond: {
                if: { $eq: ["$countryId", data.countryId] },
                then: 0,
                else: 1
              }
            }
          }
        },

        // ===============================
        //  Base Filters
        // ===============================
        {
          $match: {
            ...where,
            isDeleted: 0,
            isActived: 1,
            isVisible: true,
            isBlocked: 0
          }
        },
        // ===============================
        //  Marital / Married / Religious Order mapping
        // ===============================
        {
          $addFields: {
            maritalStatusOrder: {
              $cond: {
                if: { $isArray: { $literal: data.maritalStatusMapping } },
                then: {
                  $indexOfArray: [data.maritalStatusMapping, "$maritalStatus"]
                },
                else: 99
              }
            },

            marriedOrder: {
              $cond: {
                if: { $isArray: { $literal: data.marriedMapping } },
                then: {
                  $indexOfArray: [data.marriedMapping, "$married"]
                },
                else: 99
              }
            },

            religiousOrder: {
              $cond: {
                if: { $isArray: { $literal: data.religiousMapping } },
                then: {
                  $indexOfArray: [data.religiousMapping, "$religious"]
                },
                else: 99
              }
            }
          }
        },
        {
          $addFields: {
            priorityGroup: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $gte: ["$dateOfBirth", new Date(agePriorityData.primaryMinDOB)] },
                        { $lte: ["$dateOfBirth", new Date(agePriorityData.primaryMaxDOB)] }
                      ]
                    },
                    then: 1
                  },
                  {
                    case: {
                      $and: [
                        { $gte: ["$dateOfBirth", new Date(agePriorityData.secondaryMinDOB)] },
                        { $lte: ["$dateOfBirth", new Date(agePriorityData.secondaryMaxDOB)] }
                      ]
                    },
                    then: 2
                  }
                ],
                default: 99
              }
            }
          }
        },
        // ===============================
        //  INCLUDE PRIORITY
        // ===============================
        {
          $addFields: {
            includePriority: {
              $cond: [{ $in: ["$_id", data.includeIds] }, 0, 1]
            }
          }
        },
        // ===============================
        //  Join FEED METRICS (SOURCE OF TRUTH)
        // ===============================
        {
          $lookup: {
            from: "userfeedmetrics",
            localField: "_id",
            foreignField: "userId",
            as: "metrics"
          }
        },
        { $unwind: "$metrics" },

        // ===============================
        //  Sort
        // ===============================
        {
          $sort: {
            includePriority: 1,
            isCountyUser: 1,
            "metrics.finalScore": -1,
            priorityGroup: 1,
            maritalStatusOrder: 1,
            marriedOrder: 1,
            religiousOrder: 1
          }
        },
        {
          $facet: {
            data: [

              // ===============================
              //  Pagination 
              // ===============================

              { $skip: offset },
              { $limit: limit },

              // ===============================
              //  Detail Lookups
              // ===============================
              {
                $lookup: {
                  from: "userwrapitups",
                  localField: "_id",
                  foreignField: "userId",
                  as: "userwrapitupsDetails",
                  pipeline: [
                    {
                      $lookup: {
                        from: "wrapitups",
                        localField: "WrapItUpId",
                        foreignField: "_id",
                        as: "wrapitupsDetails"
                      }
                    },
                    { $match: { isDeleted: 0, isActived: 1 } }
                  ]
                }
              },
              {
                $lookup: {
                  from: "questionanswers",
                  localField: "_id",
                  foreignField: "userId",
                  as: "questionAnswers",
                  pipeline: [
                    {
                      $lookup: {
                        from: "questions",
                        localField: "questionId",
                        foreignField: "_id",
                        as: "questions"
                      }
                    },
                    { $match: { isDeleted: 0, isActived: 1 } }
                  ]
                }
              },
              {
                $lookup: {
                  from: "userinterests",
                  localField: "_id",
                  foreignField: "userId",
                  as: "userInterestsDetails",
                  pipeline: [
                    {
                      $lookup: {
                        from: "interests",
                        localField: "interestId",
                        foreignField: "_id",
                        as: "interestsDetails"
                      }
                    },
                    { $match: { isDeleted: 0, isActived: 1 } }
                  ]
                }
              },
              {
                $lookup: {
                  from: "userpersonalitytraits",
                  localField: "_id",
                  foreignField: "userId",
                  as: "userPersonalityTraitsDetails",
                  pipeline: [
                    {
                      $lookup: {
                        from: "personalitytraits",
                        localField: "personalityTraitId",
                        foreignField: "_id",
                        as: "personalityTraitsDetails"
                      }
                    },
                    { $match: { isDeleted: 0, isActived: 1 } }
                  ]
                }
              },
              {
                $lookup: {
                  from: "userpictures",
                  localField: "_id",
                  foreignField: "userId",
                  as: "photos",
                  pipeline: [
                    {
                      $match: { isDeleted: 0, imageVerificationStatus: "completed" }
                    },
                    {
                      $lookup: {
                        from: "userreports",
                        localField: "_id",
                        foreignField: "userPictureId",
                        as: "reports",
                        pipeline: [
                          { $match: { fromUserId: data.userId, isDeleted: 0 } }
                        ]
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
                    }
                  ]
                }
              },
            ],
            totalCount: [
              { $count: "count" }
            ]
          }
        }
      ];


      const result = await User.aggregate(pipeline);
      const userData = {
        data: result[0]?.data || [],
        totalUsers: result[0].totalCount[0]?.count || 0,
      };
      resolve(JSON.parse(JSON.stringify(userData)));

    } catch (error) {
      reject(error);
    }
  });
};

module.exports.findAllUniueUser = (where, data, agePriorityData) => {

  return new Promise(async (resolve, reject) => {
    try {
      const now = new Date();
      const offset = parseInt(data.offset) || 0;
      const limit = parseInt(data.limit) || 20;

      const pipeline = [
        // ===============================
        //  GEO NEAR
        // ===============================
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(data.location.long),
                parseFloat(data.location.lat)
              ]
            },
            distanceField: "distance",
            key: "location",
            spherical: true,
            distanceMultiplier: 0.001
          }
        },
        // ===============================
        //   Distance fix
        // ===============================
        {
          $addFields: {
            distanceNum: {
              $convert: {
                input: "$distance",
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        },
        // ===============================
        //  Country Priority
        // ===============================
        {
          $addFields: {
            isCountyUser: {
              $cond: {
                if: { $eq: ["$countryId", data.countryId] },
                then: 0,
                else: 1
              }
            }
          }
        },

        // ===============================
        //  Base Filters
        // ===============================
        {
          $match: {
            ...where,
            isDeleted: 0,
            isActived: 1,
            isVisible: true,
            isBlocked: 0
          }
        },
        // ===============================
        //  Marital / Married / Religious Order mapping
        // ===============================
        {
          $addFields: {
            maritalStatusOrder: {
              $cond: {
                if: { $isArray: { $literal: data.maritalStatusMapping } },
                then: {
                  $indexOfArray: [data.maritalStatusMapping, "$maritalStatus"]
                },
                else: 99
              }
            },

            marriedOrder: {
              $cond: {
                if: { $isArray: { $literal: data.marriedMapping } },
                then: {
                  $indexOfArray: [data.marriedMapping, "$married"]
                },
                else: 99
              }
            },

            religiousOrder: {
              $cond: {
                if: { $isArray: { $literal: data.religiousMapping } },
                then: {
                  $indexOfArray: [data.religiousMapping, "$religious"]
                },
                else: 99
              }
            }
          }
        },
        {
          $addFields: {
            priorityGroup: {
              $switch: {
                branches: [
                  {
                    case: {
                      $and: [
                        { $gte: ["$dateOfBirth", new Date(agePriorityData.primaryMinDOB)] },
                        { $lte: ["$dateOfBirth", new Date(agePriorityData.primaryMaxDOB)] }
                      ]
                    },
                    then: 1
                  },
                  {
                    case: {
                      $and: [
                        { $gte: ["$dateOfBirth", new Date(agePriorityData.secondaryMinDOB)] },
                        { $lte: ["$dateOfBirth", new Date(agePriorityData.secondaryMaxDOB)] }
                      ]
                    },
                    then: 2
                  }
                ],
                default: 99
              }
            }
          }
        },
        // ===============================
        //  INCLUDE PRIORITY
        // ===============================
        {
          $addFields: {
            includePriority: {
              $cond: [{ $in: ["$_id", data.includeIds] }, 0, 1]
            }
          }
        },
        // ===============================
        //  Join FEED METRICS (SOURCE OF TRUTH)
        // ===============================
        {
          $lookup: {
            from: "userfeedmetrics",
            localField: "_id",
            foreignField: "userId",
            as: "metrics"
          }
        },
        { $unwind: "$metrics" },

        // ===============================
        //  Sort
        // ===============================
        {
          $sort: {
            includePriority: 1,
            isCountyUser: 1,
            "metrics.finalScore": -1,
            priorityGroup: 1,
            maritalStatusOrder: 1,
            marriedOrder: 1,
            religiousOrder: 1
          }
        },
        {
          $facet: {
            data: [

              // ===============================
              //  Pagination 
              // ===============================

              { $skip: offset },
              { $limit: limit },

              // ===============================
              //  Detail Lookups
              // ===============================
              // {
              //   $lookup: {
              //     from: "userwrapitups",
              //     localField: "_id",
              //     foreignField: "userId",
              //     as: "userwrapitupsDetails",
              //     pipeline: [
              //       {
              //         $lookup: {
              //           from: "wrapitups",
              //           localField: "WrapItUpId",
              //           foreignField: "_id",
              //           as: "wrapitupsDetails"
              //         }
              //       },
              //       { $match: { isDeleted: 0, isActived: 1 } }
              //     ]
              //   }
              // },
              // {
              //   $lookup: {
              //     from: "questionanswers",
              //     localField: "_id",
              //     foreignField: "userId",
              //     as: "questionAnswers",
              //     pipeline: [
              //       {
              //         $lookup: {
              //           from: "questions",
              //           localField: "questionId",
              //           foreignField: "_id",
              //           as: "questions"
              //         }
              //       },
              //       { $match: { isDeleted: 0, isActived: 1 } }
              //     ]
              //   }
              // },
              // {
              //   $lookup: {
              //     from: "userinterests",
              //     localField: "_id",
              //     foreignField: "userId",
              //     as: "userInterestsDetails",
              //     pipeline: [
              //       {
              //         $lookup: {
              //           from: "interests",
              //           localField: "interestId",
              //           foreignField: "_id",
              //           as: "interestsDetails"
              //         }
              //       },
              //       { $match: { isDeleted: 0, isActived: 1 } }
              //     ]
              //   }
              // },
              // {
              //   $lookup: {
              //     from: "userpersonalitytraits",
              //     localField: "_id",
              //     foreignField: "userId",
              //     as: "userPersonalityTraitsDetails",
              //     pipeline: [
              //       {
              //         $lookup: {
              //           from: "personalitytraits",
              //           localField: "personalityTraitId",
              //           foreignField: "_id",
              //           as: "personalityTraitsDetails"
              //         }
              //       },
              //       { $match: { isDeleted: 0, isActived: 1 } }
              //     ]
              //   }
              // },
              // {
              //   $lookup: {
              //     from: "userpictures",
              //     localField: "_id",
              //     foreignField: "userId",
              //     as: "photos",
              //     pipeline: [
              //       {
              //         $match: { isDeleted: 0, imageVerificationStatus: "completed" }
              //       },
              //       {
              //         $lookup: {
              //           from: "userreports",
              //           localField: "_id",
              //           foreignField: "userPictureId",
              //           as: "reports",
              //           pipeline: [
              //             { $match: { fromUserId: data.userId, isDeleted: 0 } }
              //           ]
              //         }
              //       },
              //       {
              //         $addFields: {
              //           image: {
              //             $cond: {
              //               if: { $ne: ["$image", null] },
              //               then: { $concat: [process.env.HOST_URL, "$image"] },
              //               else: "$image"
              //             }
              //           }
              //         }
              //       }
              //     ]
              //   }
              // },
            ],
            totalCount: [
              { $count: "count" }
            ]
          }
        }
      ];


      const result = await User.aggregate(pipeline);
      const userData = {
        data: result[0]?.data || [],
        totalUsers: result[0].totalCount[0]?.count || 0,
      };
      resolve(JSON.parse(JSON.stringify(userData)));

    } catch (error) {
      reject(error);
    }
  });
};

//Find All
module.exports.findUserList = (where, data) => {
  return new Promise((resolve, reject) => {
    User.aggregate([
      { $match: where },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          profileImage: {
            $cond: {
              if: { $and: [{ $ne: ["$profileImage", null] }, { $ne: ["$profileImage", ""] }] },
              then: { $concat: [process.env.HOST_URL, "$profileImage"] },
              else: ""
            }
          }
        },
      },
      //  Pagination
      { $sort: data.order },
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


module.exports.countUserList = (where) => {
  return new Promise((resolve, reject) => {
    User.aggregate([
      {
        $match: {
          ...where,
          countryId: {
            $exists: true,
            $type: "string",
            $regex: /^[0-9a-fA-F]{24}$/
          }
        }
      },

      {
        $group: {
          _id: "$countryId",

        }
      },
      {
        $project: {
          _id: 0,
          countryId: "$_id",
        }
      },
      // Lookup country details
      {
        $lookup: {
          from: "countries",
          let: { countryIdStr: "$countryId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $toObjectId: "$$countryIdStr" }]
                }
              }
            }
          ],
          as: "countryDetails"
        }
      },
    ])
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};

module.exports.findDistinctCountryIds = (where = {}, data) => {
  return new Promise((resolve, reject) => {
    User.distinct(data.distinct, where)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
}

module.exports.userCountryStateList = async (
  where,
  page = 1,
  limit = 10,
  sortOrder = -1,
  countryIds = [],
  search = ''
) => {
  console.log(where, 'where=========-----')
  const skip = (page - 1) * limit;
  try {
    const matchStage = {
      ...where,
      countryId: {
        $exists: true,
        $type: "string",
        $regex: /^[0-9a-fA-F]{24}$/
      }
    };

    // Convert countryIds to strings for consistent comparison
    const countryIdStrings = countryIds.map(id => id.toString());

    const result = await User.aggregate([
      { $match: matchStage },

      // Group by country + state
      {
        $group: {
          _id: { countryId: "$countryId", state: "$state" },
          stateUserCount: { $sum: 1 }
        }
      },

      // Regroup by country
      {
        $group: {
          _id: "$_id.countryId",
          states: {
            $addToSet: {
              name: "$_id.state",
              isSelected: false
            }
          },
          totalUsers: { $sum: "$stateUserCount" }
        }
      },

      // Add priority index with proper string comparison
      {
        $addFields: {
          priorityIndex: {
            $cond: [
              { $in: ["$_id", countryIdStrings] },
              { $indexOfArray: [countryIdStrings, "$_id"] },
              9999
            ]
          }
        }
      },

      //Lookup country list
      {
        $lookup: {
          from: "countries",
          let: { countryIdStr: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $toObjectId: "$$countryIdStr" }]
                }
              }
            }
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
      {
        $match: search
          ? {
            "countryDetails.countryName": {
              $regex: search,
              $options: "i"
            }
          }
          : {}
      },
      {
        $facet: {
          countryList: [
            {
              $sort: {
                priorityIndex: 1,
                totalUsers: sortOrder,
                _id: 1
              }
            },
            { $skip: skip },
            { $limit: limit },

            {
              $project: {
                _id: 0,
                countryId: "$_id",
                countryName: "$countryDetails.countryName",
                countryFlag: "$countryDetails.countryFlag",
                totalUsers: 1,
                states: 1
              }
            }
          ],
          totalCountryCount: [{ $count: "count" }]
        }
      }
    ]);

    return {
      countries: result[0].countryList,
      totalCountries: result[0].totalCountryCount[0]?.count || 0
    };
  } catch (error) {
    throw error;
  }
};