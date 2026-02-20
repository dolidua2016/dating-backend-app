const GlobalFeedStats = require("../models/globalFeedStats");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let GlobalFeedStatsData = new GlobalFeedStats(data);
    GlobalFeedStatsData.save()
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
    GlobalFeedStats.find(where)
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
module.exports.findAllPagination = (where, data) => {
  return new Promise((resolve, reject) => {
    GlobalFeedStats.find(where)
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
    GlobalFeedStats.findOne(where)
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
    GlobalFeedStats.countDocuments(where)
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
        GlobalFeedStats.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};



module.exports.findOneAndUpdate = (where, data, options = {}) => {


  return new Promise((resolve, reject) => {
    GlobalFeedStats.findOneAndUpdate(
      where,
      data,
      {
        new: true,        
        upsert: true,     
        setDefaultsOnInsert: true,
        ...options
      }
    )
    .then((result) => resolve(result))
    .catch((error) => reject(error));
  });
};


