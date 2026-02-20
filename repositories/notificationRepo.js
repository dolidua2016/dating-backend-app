const notification = require("../models/notifications");
const mongoose = require("mongoose");

//Create Notification
module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let notificationData = new notification(data);
    notificationData.save()
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

//Bulk Create
module.exports.bulkCreate = (dataArray) => {
  return new Promise((resolve, reject) => {
    notification.insertMany(dataArray)
      .then((result) => {
        result = JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};


//Find All Notification
module.exports.findAll = (where, data) => {
  return new Promise((resolve, reject) => {
    notification.find(where)
      .sort({ _id: -1 }) // Sort by _id descending
      .skip(data.offset)
      .limit(data.limit)
      .then((result) => {
        result =JSON.parse(JSON.stringify(result));
        resolve(result);
      })
      .catch((error) => {
        reject(new Error(error));;
      });
  });
};

// find One Notification
module.exports.findOne = (where) => {
    return new Promise((resolve, reject) => {
        notification.findOne(where)
        .then((result) => {
          result =JSON.parse(JSON.stringify(result));
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};

// Count Notification
module.exports.count = (where) => {
    return new Promise((resolve, reject) => {
        notification.countDocuments(where)
        .then((result) => {
          result =JSON.parse(JSON.stringify(result));
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
  };
  
 
 // Update Notification
module.exports.update = (where, data) => {
    return new Promise((resolve, reject) => {
        notification.updateMany(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
