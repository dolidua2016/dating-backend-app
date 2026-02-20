const Conversation = require("../models/conversations");
const Inboxes      = require("../models/inboxes");
const mongoose     = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let ConversationData = new Conversation(data);
    ConversationData.save()
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
    Conversation.find(where)
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
module.exports.findAllId = (where, data) => {
  return new Promise((resolve, reject) => {
    Conversation.find(where).select({_id: 1})
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};


//Find All With Inbox
// module.exports.findAllWithInbox = (where, data) => {
//   return new Promise((resolve, reject) => {
//     Conversation.aggregate([
//       { $match: where },

//       // Join inbox
//       {
//         $lookup: {
//           from: "inboxes",
//           localField: "inboxId",
//           foreignField: "_id",
//           as: "inboxDetails",
//           pipeline: [
//             { $match: { isActived: 1, isDeleted: 0, isBlocked: false } }
//           ]
//         }
//       },

//       // Ensure inboxDetails exists
//       {
//         $match: {
//           "inboxDetails.0": { $exists: true }
//         }
//       },

//       // Sort by createdAt DESC (newest first)
//       { $sort: { createdAt: -1 } },

//       // Group by inboxId, get latest conversation
//       {
//         $group: {
//           _id: "$inboxId",
//           latestConversation: { $first: "$$ROOT" }
//         }
//       },

//       // Replace root with that single latestConversation object (not array)
//       {
//         $replaceRoot: { newRoot: "$latestConversation" }
//       }
//     ])
//       .then((result) => {
//         resolve(JSON.parse(JSON.stringify(result)));
//       })
//       .catch((error) => {
//         reject(new Error(error));;
//       });
//   });
// };

// find One
module.exports.findOne = (where) => {
  console.log(where,'where===')
    return new Promise((resolve, reject) => {
        Conversation.findOne(where)
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
        Conversation.countDocuments(where)
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
        Conversation.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};

 
 // Update Many Data
 module.exports.updateMany = (where, data) => {
  return new Promise((resolve, reject) => {
      Conversation.updateMany(where, data)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//Find All
module.exports.findAllConversationList = (where, data) => {
  console.log(data,'data')
  return new Promise((resolve, reject) => {
    Conversation.find(where)
    .sort({_id: -1})
    .limit(data.limit)
    .skip(data.offset)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};


module.exports.findChatUser = (where, data) => {
  return new Promise((resolve, reject)=> {
    Conversation.aggregate([
  //  Valid messages only
  {
    $match: {
      isDeleted: 0,
      isActived: 1
    }
  },

  // sender + receiver → single array
  {
    $project: {
      users: [
        { userId: "$senderId", type: "sent" , contentType: "$contentType"},
        { userId: "$receiverId", type: "received",contentType: "$contentType" }
      ]
    }
  },

  //  Break array → rows
  { $unwind: "$users" },

  //  Group by unique user
  {
    $group: {
      _id: "$users.userId",
      chatSent: {
        $sum: {
          $cond: [{$and: [{ $eq: ["$users.type", "sent"] },{$ne: ["$users.contentType", "image"]}]}, 1, 0]
        }
      },
      chatReceived: {
        $sum: {
           $cond: [{$and: [{ $eq: ["$users.type", "received"] },{$ne: ["$users.contentType", "image"]}]}, 1, 0]
        }
      },
      imageSent: {
        $sum: {
          $cond: [{$and: [{ $eq: ["$users.type", "sent"] },{$eq: ["$users.contentType", "image"]}]}, 1, 0]
        }
      },
      imageReceived: {
        $sum: {
           $cond: [{$and: [{ $eq: ["$users.type", "received"] },{$eq: ["$users.contentType", "image"]}]}, 1, 0]
        }
      }
    }
  },

  //  FACET: data + total count
  {
    $facet: {
     data: [
  { $sort: { chatSent: -1, chatReceived: -1 } },
  
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" },

  // ✅ countryId filter
  {
    $match: {
      ...(data?.countryId && { "user.countryId": data.countryId })
    }
  },
  { $skip: data.offset },
  { $limit: data.limit },


  {
    $project: {
      _id: 0,
      userId: "$_id",
      countryId: "$user.countryId",
      name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
      profileImage: {
        $cond: {
          if: {
            $and: [
              { $ne: ["$user.profileImage", null] },
              { $ne: ["$user.profileImage", ""] }
            ]
          },
          then: { $concat: [process.env.HOST_URL, "$user.profileImage"] },
          else: ""
        }
      },
      chatSent: 1,
      chatReceived: 1,
      imageSent: 1,
      imageReceived: 1
    }
  }
     ],
      totalCount: [
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: "$user" },

        // ✅ SAME FILTER
        {
          $match: {
            ...(where?.countryId && { "user.countryId": where.countryId })
          }
        },

        { $count: "count" }
      ]

    }
  }
    ]).then((result) => {
      result = JSON.parse(JSON.stringify(result));
      resolve(result)
    })
    .catch((error) => {
      reject(new Error(error));
    })
  })
}
  
