const subscriptionFeatures = require("../models/subscriptionFeatures");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let subscriptionFeaturesData = new subscriptionFeatures(data);
    subscriptionFeaturesData.save()
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
    subscriptionFeatures.find(where)
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
        subscriptionFeatures.findOne(where)
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
        subscriptionFeatures.count(where)
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
        subscriptionFeatures.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};
  
