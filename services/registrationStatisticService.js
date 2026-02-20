const userRepo = require('../repositories/userRepo');
const User = require('../models/users');
const moment = require('moment');
const {getStartDay} = require("../helpers/DateTimeHelper");

// Service for Country Wise Registration Statistics
const registrationStatisticCountryWise = async () => {
  const countryWiseUserData = await userRepo.findCountryUsers({});
  const countryList = countryWiseUserData.map((item) => item.countryDetails);
  return { countryWiseUserData, countryList };
};

// Service for Step Wise Statistics
const stepCompleteStatistic = async (where) => {
  const stpesData = await userRepo.findStepUsers(where);
  return stpesData;
};

/**
 * @since 1.0.0
 * @version 1.0.0
 * @author Pritam Paul
 * @implementsOn Dec 18, 2025
 * @service newAccDelAccountRatioStats
 * Count all the New Account registration and account deletion on a month basis, and filter can be done by the Year
 * @param {number} year
 * @return {Promise<Awaited<{monthNo: number, monthName: string, monthInShort: string, "New Registartion": number, "Deleted User": number}>[]>}
 */
const newAccDelAccountRatioStats = async (year = new Date().getFullYear()) => {
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const stats = await User.aggregate([
    {
      $facet: {
        registrations: [
          {
            $match: {
              createdAt: { $gte: startOfYear, $lte: endOfYear },
            },
          },
          {
            $group: {
              _id: { month: { $month: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
        ],
        deletions: [
          {
            $match: {
              isDeleted: 1,
              deletedAt: { $gte: startOfYear, $lte: endOfYear } ,
            },
          },
          {
            $group: {
              _id: { month: { $month: '$deletedAt' } },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const registrations = stats[0].registrations;
  const deletions = stats[0].deletions;

  const result = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;

    const reg = registrations.find((r) => r._id.month === month);
    const del = deletions.find((d) => d._id.month === month);

    return {
      year,
      monthNo: month,
      monthName: months[i],
      monthInShort: months[i].substring(0, 3),
      'New Registration': reg?.count || 0,
      'Deleted User': del?.count || 0,
    };
  });

  return result;
};


/**
 * Current Date
 */
const now = new Date();

/**
 * Date Ranges for filter and build queries
 * @type {{"90days": Date, "60days": Date, "45days": Date, "30days": Date, "15days": Date, "7days": Date}}
 */
const ranges = {
  '90days': getStartDay(now, 90),
  '60days': getStartDay(now, 60),
  '45days': getStartDay(now, 45),
  '30days': getStartDay(now, 30),
  '15days': getStartDay(now, 15),
  '7days' : getStartDay(now, 7),
};

/**
 * Query Builder
 * @author Doli Dua
 */
const buildQuery = (query) => {
  let where = {};

  const now = new Date()

  const startOfTodayUTC = new Date();
  startOfTodayUTC.setUTCHours(0, 0, 0, 0);

  const endOfTodayUTC = new Date();
  endOfTodayUTC.setUTCHours(23, 59, 59, 999);

  if (query.type && query.type !== 'today' && ranges[query.type]) {
    where.createdAt = {
      $gte: ranges[query.type],
      $lt: now,
    };
  }

  if (query.type === 'today') {
    where.createdAt = {
      $gte: startOfTodayUTC,
      $lte: endOfTodayUTC,
    };
  }


  if (query.startDate && query.endDate) {
    where.createdAt = {
      $gte: new Date(query.startDate),
      $lte: new Date(query.endDate),
    };
  }
  if (query.gender) {
    where.gender = query.gender;
  }
  if (query.steps) {
    where.steps = query.steps < 13 ? { $eq: parseInt(query.steps) } : { $gte: parseInt(query.steps) };
  }
  if (query.countryId) {
    where.countryId = query.countryId;
  }
  return where;
};

// Service for Build Query of Repeated Users
const buildRepeatedUserQuery = (query) => {
  let where = {};
  let data = {};
  const page = query.page ? parseInt(query.page) : 1;
  data.limit = 10;
  data.offset = data.limit ? data.limit * (page - 1) : null;
  data.order = { last7Days: -1 };

 // Build dynamic user filter
  const userFilter = {};
  if (query.gender)  userFilter["user.gender"] = query.gender;
  if (query.countryId) userFilter["user.countryId"] = query.countryId; 

  data.userFilter = userFilter;

  if (query.sortField && query.sort){
    data.order = { [query.sortField]: query.sort === 'ASC' ? 1 : -1 };
  }

  return { where, data };
 
}


/**
 * @service monthDayWiseAccDelStats
 * Day-wise new registration vs deleted users for any month
 *
 * @param {number} year  - e.g. 2025
 * @param {number} month - 1 = Jan, 12 = Dec
 * @return {Promise<Array>}
 */
const monthDayWiseAccDelStats = async (
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1
) => {
  // month: 1-12 → JS Date: 0-11
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  console.log(startDate,'startDate====');
  console.log(endDate,'endDate=====');
  // auto number of days (28/29/30/31)
  const daysInMonth = endDate.getUTCDate();
  console.log(daysInMonth,'daysInMonth====')
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [stats] = await User.aggregate([
    {
      $facet: {
        registrations: [
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: {
                day: {
                  $dayOfMonth: {
                    date: "$createdAt",
                    timezone: "UTC"
                  }
                }
              },
              count: { $sum: 1 }
            }
          }
        ],

        deletions: [
          {
            $match: {
              isDeleted: 1,
              deletedAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: {
                day: {
                  $dayOfMonth: {
                    date: "$deletedAt",
                    timezone: "UTC"
                  }
                }
              },
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;

    const reg = stats.registrations.find(r => r._id.day === day);
    const del = stats.deletions.find(d => d._id.day === day);

    return {
      year,
      monthNo: month,
      monthName: monthNames[month - 1],
      day,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      "New Registration": reg?.count || 0,
      "Deleted User": del?.count || 0
    };
  });
};


module.exports = {
  registrationStatisticCountryWise,
  stepCompleteStatistic,
  newAccDelAccountRatioStats,
  buildQuery,
  buildRepeatedUserQuery,
  monthDayWiseAccDelStats
};
