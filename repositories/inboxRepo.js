const Inboxes = require('../models/inboxes');
const mongoose = require('mongoose');
const moment = require('moment');
const DateTimeHelper = require("../helpers/DateTimeHelper");
const Conversation = require('../models/conversations')

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let InboxesData = new Inboxes(data);
    InboxesData.save()
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};

//Find All
module.exports.findAll = (where, data) => {
  return new Promise((resolve, reject) => {
    Inboxes.find(where)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};

// find One
module.exports.findOne = (where) => {
  return new Promise((resolve, reject) => {
    Inboxes.findOne(where)
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
    Inboxes.countDocuments(where)
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
    Inboxes.updateOne(where, data)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};


//Find All
// module.exports.InboxChatList = (where, data) => {
//   console.log(data.where, 'data');
//   return new Promise((resolve, reject) => {
//     Inboxes.aggregate([
//       { $match: where },
//       {
//         $lookup: {
//           from: 'users', // collection name in lowercase
//           localField: 'firstUserId',
//           foreignField: '_id',
//           as: 'firstUserDetails',
//           pipeline: [
//             { $match: data.where },
//             {
//               $project: {
//                 _id: 1,
//                 name: 1,
//                 firstName: 1,
//                 lastName: 1,
//                 profileImage: 1,
//                 city: 1,
//                 isOnline: 1,
//                 isSubcription: 1,
//                 isDeleted: 1,
//                 isActived: 1,
//                 deactivateAccount: 1,
//               },
//             },
//             {
//               $addFields: {
//                 profileImage: {
//                   $cond: {
//                     if: {$and: [{$ne: ["$profileImage", null]}, {$ne: ["$isDeleted", 1]}, {$ne: ["$isActived", 0]}, {$ne: ["$deactivateAccount", 1]}]},
//                     then: {$concat: [process.env.HOST_URL, "$profileImage"]},
//                     else: process.env.HOST_URL + '/uploads/photos/default-user.png'
//                   }
//                 },
                
//                 name: {$concat: ["$firstName", " ", "$lastName"]},
//               }
              
              
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: 'users', // collection name in lowercase
//           localField: 'secondUserId',
//           foreignField: '_id',
//           as: 'secondUserDetails',
//           pipeline: [
//             { $match: data.where },
//             {
//               $project: {
//                 _id: 1,
//                 name: 1,
//                 firstName: 1,
//                 lastName: 1,
//                 profileImage: 1,
//                 city: 1,
//                 isOnline: 1,
//                 isSubcription: 1,
//                 isDeleted: 1,
//                 isActived: 1,
//                 deactivateAccount: 1,
//               },
//             },
//             {
//               $addFields: {
//                 profileImage: {
//                   $cond: {
//                     if: {$and: [{$ne: ['$profileImage', null]}, {$ne: ['$isDeleted', 1]}, {$ne: ["$isActived", 0]}, {$ne: ["$deactivateAccount", 1]}]},
//                     then: {$concat: [process.env.HOST_URL, '$profileImage']},
//                     else: process.env.HOST_URL + '/uploads/photos/default-user.png',
//                   },
//                 },
//                 name: {$concat: ['$firstName', ' ', '$lastName']},
//               },
             
//             },
//           ],
//         },
//       },
//       {
//         $lookup: {
//           from: 'inboxmessagecheks', // Collection name in lowercase
//           let: {
//             userIds: data.userId,
//             inboxId: '$_id',
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ['$userId', '$$userIds'] }, // Match userId
//                     { $eq: ['$inboxId', '$$inboxId'] }, // Match inboxId
//                   ],
//                 },
//               },
//             },
//           ],
//           as: 'inboxConversationCheks',
//         },
//       },
//       {
//         $match: {
//           $or: [
//             {
//               firstUserDetails: {
//                 $exists: true,
//                 $ne: [],
//               },
//             },
//             {
//               secondUserDetails: {
//                 $exists: true,
//                 $ne: [],
//               },
//             },
//           ],
//         },
//       },
//       {
//         $match: {
//           $or: [{ createdAt: { $gt: new Date(moment().subtract(7, 'days').toISOString()) } }, { isAnyMessage: true }],
//         },
//       },
//       { $sort: { lastMessageTime: -1 } },
//       { $skip: data.offset },
//       { $limit: data.limit },
//     ])
//       .then((result) => {
//         result = JSON.parse(JSON.stringify(result));
//         resolve(result);
//       })
//       .catch((error) => {
//         reject(new Error(error));
//       });
//   });
// };

module.exports.InboxChatList = (where, data) => {
  return new Promise((resolve, reject) => {
    Inboxes.aggregate([
      { $match: where },

      // =======================
      // FIRST USER LOOKUP
      // =======================
      {
        $lookup: {
          from: 'users',
          localField: 'firstUserId',
          foreignField: '_id',
          as: 'firstUserDetails',
          pipeline: [
            { $match: data.where },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                profileImage: 1,
                city: 1,
                isOnline: 1,
                isSubcription: 1,
                isDeleted: 1,
                isActived: 1,
                deactivateAccount: 1,
              },
            },
            {
              $addFields: {
                profileImage: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$profileImage", null] },
                        { $ne: ["$isDeleted", 1] },
                        { $ne: ["$isActived", 0] },
                        { $ne: ["$deactivateAccount", 1] }
                      ]
                    },
                    then: { $concat: [process.env.HOST_URL, "$profileImage"] },
                    else: process.env.HOST_URL + '/uploads/photos/default-user.png'
                  }
                },
                name: { $concat: ["$firstName", " ", "$lastName"] }
              }
            }
          ]
        }
      },

      // =======================
      // SECOND USER LOOKUP
      // =======================
      {
        $lookup: {
          from: 'users',
          localField: 'secondUserId',
          foreignField: '_id',
          as: 'secondUserDetails',
          pipeline: [
            { $match: data.where },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                profileImage: 1,
                city: 1,
                isOnline: 1,
                isSubcription: 1,
                isDeleted: 1,
                isActived: 1,
                deactivateAccount: 1,
              },
            },
            {
              $addFields: {
                profileImage: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$profileImage", null] },
                        { $ne: ["$isDeleted", 1] },
                        { $ne: ["$isActived", 0] },
                        { $ne: ["$deactivateAccount", 1] }
                      ]
                    },
                    then: { $concat: [process.env.HOST_URL, "$profileImage"] },
                    else: process.env.HOST_URL + '/uploads/photos/default-user.png'
                  }
                },
                name: { $concat: ["$firstName", " ", "$lastName"] }
              }
            }
          ]
        }
      },

      // =======================
      // MESSAGE CHECK LOOKUP
      // =======================
      {
        $lookup: {
          from: 'inboxmessagecheks',
          let: { inboxId: '$_id', userId: data.userId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$inboxId', '$$inboxId'] }
                  ]
                }
              }
            }
          ],
          as: 'inboxConversationCheks'
        }
      },

      // =======================
      // FILTER VALID INBOX (TYPE BASED)
      // =======================
      {
        $match: {
        $or: [
          {
            $and: [
              { type: "admin" },
              {
               $expr: {
                $regexMatch: {
                  input: "$type",
                  regex: data.searchText || "",
                  options: "i"
                }
              }
               }
              // { firstUserDetails: { $eq: [] } }
            ]
          },
          {
            $and: [
              { type: { $ne: "admin" } },
              {
                $or: [
                  { firstUserDetails: { $ne: [] } },
                  { secondUserDetails: { $ne: [] } }
                ]
              }
            ]
          }
        ]
      }
      },

      {
        $match: {
          $or: [
            { createdAt: { $gt: new Date(moment().subtract(7, 'days').toISOString()) } },
            { isAnyMessage: true }
          ]
        }
      },

      // =======================
      // FACET FOR DATA + COUNT
      // =======================
      {
        $facet: {
          data: [
            { $sort: { lastMessageTime: -1 } },
            { $skip: data.offset },
            { $limit: data.limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ])
      .then((result) => {
        const inboxes = result[0]?.data || [];
        const total = result[0]?.totalCount[0]?.count || 0;

        resolve({
          total,
          inboxes
        });
      })
      .catch((error) => reject(error));
  });
};


// Total Count
module.exports.totalInboxChatListCount = (where, data) => {
  return new Promise((resolve, reject) => {
    Inboxes.aggregate([
      { $match: where },
      {
        $lookup: {
          from: 'users', // collection name in lowercase
          localField: 'firstUserId',
          foreignField: '_id',
          as: 'firstUserDetails',
          pipeline: [
            { $match: data.where },
            {
              $project: { _id: 1, firstName: 1, lastName: 1, profileImage: 1, city: 1, isOnline: 1, isSubcription: 1 },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'users', // collection name in lowercase
          localField: 'secondUserId',
          foreignField: '_id',
          as: 'secondUserDetails',
          pipeline: [
            { $match: data.where },
            {
              $project: { _id: 1, firstName: 1, lastName: 1, profileImage: 1, city: 1, isOnline: 1, isSubcription: 1 },
            },
          ],
        },
      },
      {
        $match: {
          $or: [
            {
              firstUserDetails: {
                $exists: true,
                $ne: [],
              },
            },
            {
              secondUserDetails: {
                $exists: true,
                $ne: [],
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'inboxMessageCheksSchema', // collection name in lowercase
          localField: 'userId',
          foreignField: '_id',
          as: 'inboxConversationCheks',
        },
      },
      {
        $match: {
          $or: [{ createdAt: { $gt: new Date(moment().subtract(7, 'days').toISOString()) } }, { isAnyMessage: true }],
        },
      },
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

//
module.exports.findAllwithUserDetails = (where, data) => {
  return new Promise((resolve, reject) => {
    Inboxes.aggregate([
      {
        $match: where,
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [
              { $eq: ['$firstUserId', mongoose.Types.ObjectId.createFromHexString(data)] },
              '$secondUserId',
              '$firstUserId',
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'otherUserId',
          foreignField: '_id',
          as: 'otherUser',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                firstName: 1,
                lastName: 1,
                profileImage: 1,
                email: 1,
                phone: 1,
                lastLogin: 1,
              },
            },
            {
              $addFields: {
                profileImage: {
                  $cond: {
                    if: { $and: [{ $ne: ['$profileImage', null] }, { $ne: ['$isDeleted', 1] }] },
                    then: { $concat: [process.env.HOST_URL, '$profileImage'] },
                    else: process.env.HOST_URL + '/uploads/photos/photos-1752480265291.png',
                  },
                },
                name: { $concat: ['$firstName', ' ', '$lastName'] },
              },
            },
          ],
        },
      },
      {
        $unwind: '$otherUser',
      },
      { $project: { _id: 1, firstUserId: 1, secondUserId: 1, createdAt: 1, otherUser: 1 } },
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


module.exports.findMatchUser = async (where, data) => {
  
  const now = new Date()
  const sevenDaysAgo   = DateTimeHelper.getStartDay(now,7)
  const fifteenDaysAgo = DateTimeHelper.getStartDay(now,15)
  const thirtyDaysAgo  = DateTimeHelper.getStartDay(now,30)

  const result =  await Inboxes.aggregate([
    //  Only last 30-day inbox
    {
      $match: { createdAt: { $gte: thirtyDaysAgo } }
    },

    //  Convert first/second user into an array
    {
      $project: {
        users: ["$firstUserId", "$secondUserId"],
        createdAt: 1
      }
    },

    //  One doc per user
    { $unwind: "$users" },

    //  Count per user
    {
      $group: {
        _id: "$users",
        last30Days: { $sum: 1 },
        last15Days: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", fifteenDaysAgo] }, 1, 0]
          }
        },
        last7Days: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", sevenDaysAgo] }, 1, 0]
          }
        }
      }
    },

    //  Join users
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },

    { $unwind: "$user" },

    //  Filter active users
    {
      $match: {
        "user.isActived": 1,
        "user.isBlocked": 0,
        "user.isDeleted": 0,
        ...(data.where || {})
      }
    },

    //  Shape response
    {
      $project: {
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
        email: "$user.email",
        phone: "$user.phone",
        profileImage: {
          $cond: {
            if: {$ne: ["$user.profileImage", null]}, // Check if profile_image is not null
            then: {$concat: [process.env.HOST_URL, "$user.profileImage"]}, // Concatenate the host URL
            else: "$user.profileImage" // If profile_image is null, keep it as is
          }
        },
        countryId: "$user.countryId",
        last30Days: 1,
        last15Days: 1,
        last7Days: 1
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

    //  Sort + paginate
    {
      $sort: {
        ...data.order,
        createdAt: -1
      }
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: data.offset }, { $limit: data.limit }]
      }
    }
  ]);

  return {
    users: result[0].data,
    totalUsers: result[0].metadata[0]?.total || 0,
    totalPages: Math.ceil((result[0].metadata[0]?.total || 0) / data.limit)
  };
};

module.exports.matchUsers = async (where, data) => {
  console.log('matchUsers where ', where);
  console.log('matchUsers data ', data);

  const result =  await Inboxes.aggregate([
    //  Only last 30-day inbox
    {
      $match: where
    },

    //  Convert first/second user into an array
    {
      $project: {
        users: ["$firstUserId", "$secondUserId"],
        createdAt: 1
      }
    },

    //  One doc per user
    { $unwind: "$users" },

    // // Count per user
    {
      $group: {
        _id: "$users",
      }
    },

    //  Join users
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },

    { $unwind: "$user" },

    //  Filter active users
    {
      $match: {
        "user.isActived": 1,
        "user.isBlocked": 0,
        "user.isDeleted": 0,
        ...(data.where || {})
      }
    },

    //  Shape response
    {
      $project: {
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
        email: "$user.email",
        phone: "$user.phone",
        profileImage: {
          $cond: {
            if: {$ne: ["$user.profileImage", null]}, // Check if profile_image is not null
            then: {$concat: [process.env.HOST_URL, "$user.profileImage"]}, // Concatenate the host URL
            else: "$user.profileImage" // If profile_image is null, keep it as is
          }
        },
        countryId: "$user.countryId",
        last30Days: 1,
        last15Days: 1,
        last7Days: 1
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

    //  Sort + paginate
    { $sort: data.order },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: data.offset }, { $limit: data.limit }]
      }
    }
  ]);

  return {
    users: result[0].data,
    totalUsers: result[0].metadata[0]?.total || 0,
    totalPages: Math.ceil((result[0].metadata[0]?.total || 0) / data.limit)
  };
};

// module.exports.findAllChatCountsOfUsers = async (where,data)=>{
//   return new Promise((resolve,reject)=>{
//
//   })
// }