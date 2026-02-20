const homeFiletr = require("../models/homeFilter");
const mongoose = require("mongoose");

module.exports.create = (data) => {
  return new Promise((resolve, reject) => {
    let homeFiletrData = new homeFiletr(data);
    homeFiletrData.save()
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
    homeFiletr.find(where)
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
    homeFiletr.findOne(where)
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
        homeFiletr.updateOne(where, data)
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(new Error(error));;
        });
    });
};



module.exports.findOneAndUpdate = (where, data, options = {}) => {
  console.log(data,'data')
  return new Promise((resolve, reject) => {
    homeFiletr.findOneAndUpdate(
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


