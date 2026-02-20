const DeleteReasons = require("../models/deleteReasons");

module.exports.create = (data) => {
    return new Promise((resolve, reject) => {
        let ReportsData = new DeleteReasons(data);
        ReportsData.save()
            .then((result) => {
                result =JSON.parse(JSON.stringify(result));
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
        DeleteReasons.find(where)
            .then((result) => {
                result =JSON.parse(JSON.stringify(result));
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
        DeleteReasons.findOne(where)
            .then((result) => {
                result =JSON.parse(JSON.stringify(result));
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
        DeleteReasons.count(where)
            .then((result) => {
                result =JSON.parse(JSON.stringify(result));
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
        DeleteReasons.updateOne(where, data)
            .then((result) => {
                resolve(result);
            })
            .catch((error) => {
                reject(new Error(error));
            });
    });
};

