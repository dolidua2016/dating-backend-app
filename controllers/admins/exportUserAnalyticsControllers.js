// const { google } = require('googleapis');
// const userRepo = require('../../repositories/userRepo');


// module.exports.exportUserAnalytics = async (req, res) => {
//   try {
//     const BATCH_SIZE = 500;
//     let page = 1;
//     let hasMore = true;
//     let totalExported = 0;

//     // Sheet config
//     const spreadsheetId = process.env.GOOGLE_SHEET_ID;
//     const sheetName = 'Sheet1';

//     // 🔹 Optional: header add (only once)
//     await appendRowsToSheet({
//       spreadsheetId,
//       sheetName,
//       rows: [[
//         'First Name',
//         'Last Name',
//         'Email',
//         'Country',
//         'City',
//         'Age',
//         'Gender',
//         'Likes Given',
//         'Likes Received',
//         'Passes Given',
//         'Passes Received',
//         'Account Created',
//         'Last Login'
//       ]]
//     });

//     while (hasMore) {
//       const users = await userRepo.findAllWithPagination(
//         {},
//         { order: {_id: 1}, limit: BATCH_SIZE, offset: (page - 1) * BATCH_SIZE }
//       );

//       if (!users || users.length === 0) {
//         hasMore = false;
//         break;
//       }

//       // 🔹 Transform users → sheet rows
//       const rows = users.map(user => ([
//         user.firstName || '',
//         user.lastName || '',
//         user.email || '',
//         user.country || '',
//         user.city || '',
//         user.age || '',
//         user.gender || '',
//         user.likesGiven || 0,
//         user.likesReceived || 0,
//         user.passesGiven || 0,
//         user.passesReceived || 0,
//         user.createdAt ? new Date(user.createdAt).toISOString() : '',
//         user.lastLogin ? new Date(user.lastLogin).toISOString() : ''
//       ]));

//       // 🔹 Append batch to Google Sheet
//       await appendRowsToSheet({
//         spreadsheetId,
//         sheetName,
//         rows
//       });

//       totalExported += rows.length;
//       page++;
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'User analytics export completed successfully',
//       totalExported
//     });

//   } catch (error) {
//     console.error('exportUserAnalyticsController error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to export user analytics'
//     });
//   }
// };



// async function appendRowsToSheet({
//   spreadsheetId,
//   sheetName,
//   rows
// }) {
//   try {
//     const auth = new google.auth.GoogleAuth({
//       keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
//       scopes: ['https://www.googleapis.com/auth/spreadsheets'],
//     });

//     const sheets = google.sheets({ version: 'v4', auth });

//     const response = await sheets.spreadsheets.values.append({
//       spreadsheetId,
//       range: `${sheetName}!A1`,
//       valueInputOption: 'USER_ENTERED',
//       insertDataOption: 'INSERT_ROWS',
//       requestBody: {
//         values: rows,
//       },
//     });

//     return {
//       success: true,
//       updatedRows: response.data.updates.updatedRows,
//     };

//   } catch (error) {
//     console.error('appendRowsToSheet error:', error.message);
//     throw error;
//   }
// }

const fs = require('fs');
const { Parser } = require('json2csv');
const userRepo = require('../../repositories/userRepo');
const countryRepo = require('../../repositories/countriesRepo');
const userLikeRepo = require('../../repositories/userLikeRepo');
const userPassRepo = require('../../repositories/userPassesRepo');
const mongoose = require('mongoose');
const inboxRepo = require('../../repositories/inboxRepo');

module.exports.exportUserAnalytics = async (req, res) => {
  try {
    const BATCH_SIZE = 1000;
    let page = 1;
    let hasMore = true;
    let allRows = [];

  



    while (hasMore) {
      const users = await userRepo.findAllWithPagination({isDeleted: 0, steps: {$lt: 13}}, { order: {_id: 1}, limit: BATCH_SIZE, offset: (page - 1) * BATCH_SIZE });
      console.log(users.length,'users', page);
      if (!users || users.length === 0) {
        hasMore = false;
        break; 
      }

      // users.forEach(async user => {
        for (const user of users) {
         let country = null;

          if (mongoose.Types.ObjectId.isValid(user.countryId)) {
            country = await countryRepo.findOne({ _id: user.countryId });
          }
          const likesGiven = await userLikeRepo.count({ fromUserId: user._id , isDeleted: 0});
          const likesReceived = await userLikeRepo.count({ toUserId: user._id , isDeleted: 0});
          const passesGiven = await userPassRepo.count({ fromUserId: user._id , isDeleted: 0});
          const passesReceived = await userPassRepo.count({ toUserId: user._id , isDeleted: 0});
          const inboxCount = await inboxRepo.count({$or: [{
                    firstUserId: mongoose.Types.ObjectId.createFromHexString(user._id),
                    },
                    {
                      secondUserId: mongoose.Types.ObjectId.createFromHexString(user._id),
                    },
                  ],
                  isActived: 1,
                  isDeleted: 0,
                });
        allRows.push({
          name: user.firstName + user.lastName ,
          email: user.email,
          isvisible: (user.isVisible && user.isActived === 1 && user.deactivateAccount === 0) ? true : false,
          IsDeactivated : user.deactivateAccount,
          isDeleted: user.isDeleted,
          gender: user.gender,
          country: country?.countryName || 'N/A',
          age: calculateAge(user.dateOfBirth),
          city: user.city,
          likesGiven: likesGiven,
          likesReceived: likesReceived,
          passesGiven: passesGiven,
          passesReceived: passesReceived,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          totalMatches: inboxCount,
          steps: user.steps || 0, 
        });
      }
      
      console.log('Fetched users for page:', page, 'Count:', users.length);
       hasMore = false;
        break; 
      //  page++;
    }

      console.log('Total users fetched for export:', allRows.length, page);
    const parser = new Parser();
    const csv = parser.parse(allRows);

    fs.writeFileSync('./uploads/Algo Analysis - Sheet3.csv', csv);

    return res.status(200).json({
      success: true,
      message: 'CSV file generated successfully',
      filePath: './uploads/Algo Analysis - Sheet3.csv'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};




  function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();

  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  // Birthday not yet happened this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age >= 0 ? age : null;
}