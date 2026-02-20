const Transactions = require("../models/transactions");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let TransactionsData = new Transactions(data);
    TransactionsData.save()
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
    Transactions.find(where)
      .sort(data.order)
      .limit(data.limit)
      .skip(data.offset)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

module.exports.findAllWithUserDetails = (where, data) => {
  return new Promise((resolve, reject) => {
    Transactions.aggregate([
      { $match: where },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
          pipeline: [
           
            { $project: { _id: 1, profileImage: 1, firstName:1,lastName:1,} }
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
     ...(data.order ? [{ $sort: data.order }] : []),
     ...(data.offset ? [{ $skip: data.offset }] : []),
     ...(data.limit ? [{ $limit: data.limit }] : [])
    ])
      .then((result) => {
        resolve(JSON.parse(JSON.stringify(result)));
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

// find One
module.exports.findOne = (where) => {
    return new Promise((resolve, reject) => {
        Transactions.findOne(where)
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
        Transactions.countDocuments(where)
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
        Transactions.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
