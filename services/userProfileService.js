const userRepo = require('../repositories/userRepo');
const responseMessages = require('../responseMessages');
const userWrapItUpRepo = require('../repositories/userWrapItUpRepo');
const userQuestionAnswersRepo = require('../repositories/userQuestionAnswerRepo');
const moment = require('moment-timezone');
const timezone = 'ASIA/KOLKATA';

function sendResponse(res, status, msg, purpose, data = {}) {
  return res.send({ status, msg, data, purpose });
}

// Handle name update
async function handleNameUpdate(body, findUser, updateData, response) {
  if (!body.firstName || !body.lastName) return response;

  updateData.firstName = body.firstName;
  updateData.lastName = body.lastName;
  if (findUser.firstName === '') updateData.steps = 1;
  return findUser.firstName === '' ? responseMessages.nameAdd : responseMessages.nameUpdate;
}

// Handle date of birthday update
async function handleDobUpdate(body, findUser, updateData, response, monthArray) {
  const dob = body.dateOfBirth;
  if (!(dob?.day && dob?.month && dob?.year)) return response;

  const monthNumber = monthArray.findIndex((m) => m.toLowerCase() === dob.month.toLowerCase());
  updateData.dob = `${monthNumber + 1}/${dob.day}/${dob.year}`;
  updateData.dateOfBirth = new Date(updateData.dob);

  if (findUser.dob === '') updateData.steps = 2;
  return findUser.dob === '' ? responseMessages.dobAdd : responseMessages.dobUpdate;
}

//Handle email update
async function handleEmailUpdate(res, body, findUser, updateData, response, userId) {
  if (!body.email) return response;

  const findEmail = await userRepo.findOne({ email: body.email, isDeleted: 0 });
  if (findEmail && findEmail?._id != userId) {
    return sendResponse(res, 409, responseMessages.exitEmail, 'Profile Update');
  }

  if (findUser.email !== body.email) updateData.emailVerified = 0;

  updateData.email = body.email;
  if (findUser.email === '') updateData.steps = 3;
  return findUser.email === '' ? responseMessages.emailAdd : responseMessages.emailUpdate;
}

//Handle phone update
async function handlePhoneUpdate(res, body, findUser, updateData, response, userId) {
  if (!body.phone) return response;
  if (body.phone && !body.countryId) {
    return sendResponse(res, 422, responseMessages.countryValidate, 'Profile Update');
  }
  const findPhone = await userRepo.findOne({ phone: body.phone, isDeleted: 0 });
  if (findPhone && findPhone?._id != userId) {
    return sendResponse(res, 409, responseMessages.exitPhone, 'Profile Update');
  }
  updateData.phone = body.phone;
  updateData.telephoneCountry = body.countryId;
  if (findUser.phone === '') updateData.steps = 3;
  return findUser.phone === '' ? responseMessages.phoneAdd : responseMessages.phoneUpdate;
}

/**
 * Service: Match and Mark Save
 * - Get the userWrapItUps and all wrap it ups.
 *    - If User wrapItUp is Chose from wrapIt ups then add save status in Boolean format
 * @param fetchAllWrapItUp
 * @param findUserWrapItUp
 * @author Doli Dua
 * @example
 * [
 *    {
 *      "_id": "675035003a6463b44f5ae275",
 *      "question": "Education",
 *      "types": [
 *          {
 *            "name": "High school",
 *            "isActived": 1,
 *            "_id": "675035003a6463b44f5ae276",
 *            "isSaved": false
 *          },
 *          {
 *            "name": "Post grad",
 *            "isActived": 1,
 *            "_id": "675035003a6463b44f5ae278",
 *            "isSaved": true
 *          },
 *      ]
 *   }
 * ]
 */
function matchAndMarkSave(fetchAllWrapItUp, findUserWrapItUp) {
  /** **Build a lookup map from user saved data**
    * @Purpose: Converts a user saved list into a fast lookup object
    * @KeyFormat: WrapItUpId_typeId
   */
  const userWrapItUpMap = findUserWrapItUp.reduce((map, wrap) => {
    map[`${wrap.WrapItUpId}_${wrap.typeId}`] = true;
    return map;
  }, {});

  // Loop through all WrapItUp items Creates a new array
  return fetchAllWrapItUp.map((item) => {
    // Loop through each type inside WrapItUp
    const updatedTypes = item.types.map((type) => {
      // Create a match key and mark saved
      const matchKey = `${item._id}_${type._id}`;
      return { ...type, isSaved: !!userWrapItUpMap[matchKey] };
    });
    return { ...item, types: updatedTypes };
  });
}

function extractUserUpdates(result, updateData) {
  for (const item of result) {
    const type = item.types.find((m) => m.isSaved);
    switch (item.question) {
      case 'Education':
        updateData.education = type?.name;
        break;
      case 'What is your marital status?':
        updateData.maritalStatus = type?.name;
        break;
      case 'When are you looking to get married?':
        updateData.married = type?.name;
        break;
      case 'How religious are you ?':
        updateData.religious = type?.name;
        break;
      case 'Do you have Kids?':
        updateData.kids = type?.name ?? '';
        break;
      case 'Do you want Kids?':
        updateData.wantKids = type?.name ?? '';
        break;
    }
  }
}

async function upsertWrapItUpAnswers(userId, answers) {
  for (const item of answers) {
    const existing = await userWrapItUpRepo.findOne({
      userId,
      WrapItUpId: item.wrapItUpQuestionId,
      isDeleted: 0,
    });

    if (!existing) {
      await userWrapItUpRepo.create({
        userId,
        WrapItUpId: item.wrapItUpQuestionId,
        typeId: item.typeId,
      });
    } else {
      await userWrapItUpRepo.update(
        { userId, WrapItUpId: item.wrapItUpQuestionId, isDeleted: 0 },
        { typeId: item.typeId },
      );
    }
  }
}

async function processAnswers(userId, answers) {
  for (const answer of answers) {
    const findAnswer = await userQuestionAnswersRepo.findOne({
      userId,
      questionId: answer.questionId,
      isDeleted: 0,
    });

    if (findAnswer) {
      if (answer.answer) {
        await userQuestionAnswersRepo.update({ _id: findAnswer._id, isDeleted: 0 }, { answer: answer.answer });
      } else {
        await userQuestionAnswersRepo.update({ _id: findAnswer._id, isDeleted: 0 }, { isDeleted: 1 });
      }
    } else if (answer.answer) {
      await userQuestionAnswersRepo.create({
        userId,
        questionId: answer.questionId,
        answer: answer.answer,
      });
    }
  }
}

function matchAndMarkInterestSave(interestList, userInterestList) {
  const userWrapItUpMap = userInterestList.reduce((map, wrap) => {
    map[`${wrap.interestId}_${wrap.typeId}`] = true;
    return map;
  }, {});

  return interestList.map((item) => {
    const updatedTypes = item.types.map((type) => {
      const matchKey = `${item._id}_${type._id}`;
      return {
        ...type,
        icon: process.env.HOST_URL + type.icon,
        isSaved: !!userWrapItUpMap[matchKey],
      };
    });

    return { ...item, types: updatedTypes };
  });
}

function matchAndMarkPersonalitySave(personalityTraitsList, userPersonalityTraitsList) {
  const userWrapItUpMap = userPersonalityTraitsList.reduce((map, wrap) => {
    map[`${wrap.personalityTraitId}_${wrap.categoryTypesId}`] = wrap.number;
    return map;
  }, {});

  return personalityTraitsList.map((item) => {
    const updatedTypes = item.categoryTypes.map((type) => {
      const matchKey = `${item._id}_${type._id}`;

      return { ...type, number: userWrapItUpMap[matchKey] || 0 };
    });

    return { ...item, categoryTypes: updatedTypes };
  });
}

const buildWrapDetails = (element) =>
  element.userwrapitupsDetails.map((detail) => {
    const wrapitups = detail.wrapitupsDetails.reduce((result, wrap) => {
      const matchedType = wrap.types.find((type) => type._id === detail.typeId);
      return matchedType ? { question: wrap.question, matchedType } : result;
    }, null);
    return { wrapitups };
  });

const getWrapValue = (wrapDetails, question, exclude = 'Prefer not to say') => {
  const match = wrapDetails?.find((m) => m?.wrapitups?.question === question)?.wrapitups?.matchedType?.name;
  return match && match !== exclude ? match : null;
};

//Converted height
function convertHeight(decimalHeight) {
  const feet = Math.floor(decimalHeight);
  const inches = Math.round((decimalHeight - feet) * 12);
  return `${feet}'${inches}"`;
}

// Build Basic Details
const buildBasicDetails = (element, countries, wrapDetails, type) => ({
  _id: element._id,
  name: element.firstName + ' ' + element.lastName,
  firstName: element?.firstName ?? '',
  lastName: element?.lastName ?? '',
  email: element?.email,
  profileImage: element?.profileImage ? process.env.HOST_URL + element?.profileImage : '',
  phone: element?.phone && countries ? countries?.telephoneCode + ' ' + element?.phone : element?.phone || '',
  countryId: element?.countryId ?? '',
  countryName: countries ? countries?.countryName : '',
  city: element.city,
  state: element.state,
  location: element.location,
  address: element.address,
  gender: element.gender,
  lookingFor: element.lookingFor,
  dob: element.dob,
  height: String(element?.height || '').trim() === '4.0' && type !== 'myprofile' ? '' : element?.height,
  profession: element.profession,
  ejamaatImage: element?.ejamaatImage ? process.env.HOST_URL + element?.ejamaatImage : '',
  selfieImage: element?.selfieImage ? process.env.HOST_URL + element?.selfieImage : '',
  ejamaatImageVerificationStatus: element?.ejamaatImageVerificationStatus || 'notStarted',
  imageVerificationStatus: element?.imageVerificationStatus || 'notStarted',
  selfieImageVerificationStatus: element?.selfieImageVerificationStatus || 'notStarted',
  verifyBadge: element?.verifyBadge ?? 0,
  emailVerified: element?.emailVerified ?? 0,
  education: getWrapValue(wrapDetails, 'Education'),
  religious: getWrapValue(wrapDetails, 'How religious are you ?'),
  maritalStatus: getWrapValue(wrapDetails, 'What is your marital status?'),
  getMarried: (
    getWrapValue(wrapDetails, 'When are you looking to get married?', 'Not sure (Khabar nathi)') || ''
  )?.split('(')[0],
  haveKids:
    getWrapValue(wrapDetails, 'Do you have Kids?') == null
      ? null
      : type === 'home'
      ? 'Have kids?\n' + getWrapValue(wrapDetails, 'Do you have Kids?')
      : '' + getWrapValue(wrapDetails, 'Do you have Kids?'),
  wantKids:
    getWrapValue(wrapDetails, 'Do you want Kids?') == null
      ? null
      : type === 'home'
      ? 'Want kids?\n' + getWrapValue(wrapDetails, 'Do you want Kids?')
      : '' + getWrapValue(wrapDetails, 'Do you want Kids?'),
  steps: element?.steps,
  lastLogin: element?.lastLogin,
  isVisible: element?.isVisible,
  isBlocked: element?.isBlocked,
  convertHeight: element?.height ? convertHeight(element?.height) : element?.height,
  isActived: element?.isActived,
  deactivateAccount: element?.deactivateAccount || 0, //? This is for Check the account is activated or not
  privacyLocked: element?.privacyLocked || 0, //? This is for Check the Privacy locked is enabled or not
  deactivateAccountAt: element?.deactivateAccountAt || null,
  createdAt: element?.createdAt, //? This is for check when the user is Registered
});

const buildProfileQuestions = (element) =>
  element.questionAnswers.map((detail) =>
    detail.questions.reduce((result, question) => (question ? { ...question, answer: detail.answer } : result), null),
  );

const buildInterests = (element) => {
  const reduced = element.userInterestsDetails
    .map((detail) => {
      const interets = detail.interestsDetails.reduce((result, interest) => {
        const matchedType = interest.types.find((type) => type._id === detail.typeId);
        return matchedType
          ? {
              _id: interest._id,
              categoryName: interest.categoryName,
              matchedType: [matchedType],
            }
          : result;
      }, null);
      return { interets };
    })
    .reduce((acc, item) => {
      if (!item?.interets) return acc;
      const { _id, categoryName, matchedType } = item.interets;
      const existing = acc.find((e) => e.categoryName === categoryName);
      if (existing) existing.matchedType.push(...matchedType);
      else acc.push({ _id, categoryName, matchedType: [...matchedType] });
      return acc;
    }, [])
    .sort((a, b) => (a._id > b._id ? 1 : -1));

  return reduced;
};


const buildPersonalityTraits = (element) =>
  element.userPersonalityTraitsDetails.map((detail) => {
    const wrapitups = detail.personalityTraitsDetails.reduce((result, personality) => {
      const categoryTypes = personality.categoryTypes.find((type) => type._id === detail.categoryTypesId);
      return categoryTypes ? { categoryTypes } : result;
    }, null);
    return wrapitups?.categoryTypes;
  });

const buildGallery = (element) =>
  element.photos.map((photo) => ({
    _id: photo._id,
    userId: photo.userId,
    index: photo.index,
    image: photo.image,
    isActived: photo.isActived,
    isDeleted: photo.isDeleted,
    createdAt: photo.createdAt,
    updatedAt: photo.updatedAt,
    __v: photo.__v,
    isReport: photo?.reports?.length > 0,
    imageVerificationStatus: photo?.imageVerificationStatus,
  }));

function checkAndMarkSave(userInterestList, interestList) {
  const userWrapItUpMap = userInterestList.reduce((map, interest) => {
    map[`${interest.interestId}_${interest.typeId}`] = true;
    return map;
  }, {});

  return interestList.map((item) => {
    const updatedTypes = item.matchedType.map((type) => {
      const matchKey = `${item._id}_${type._id}`;
      return { ...type, isSaved: !!userWrapItUpMap[matchKey] };
    });
    return { ...item, matchedType: updatedTypes };
  });
}

function checkPersonalitySave(userPersonalityList, personalityList) {
  const userWrapItUpMap = userPersonalityList.reduce((map, personality) => {
    map[`${personality.categoryTypesId}`] = true;
    return map;
  }, {});
  return personalityList.map((item) => {
    const matchKey = item._id;
    return { ...item, isSaved: !!userWrapItUpMap[matchKey] };
  });
}

function checkScanStatus(userDetails, userPictures) {
  let imageScanned = false;
  let picturePageError = false;
  let selfiePageError = false;
  let ejamaatPageError = false;

  if (
    userDetails?.imageVerificationStatus === 'scanned' ||
    userDetails?.selfieImageVerificationStatus === 'scanned' ||
    (Array.isArray(userPictures) && userPictures.some((pic) => pic?.imageVerificationStatus === 'scanned'))
  ) {
    imageScanned = true;
  }

  if (
    userDetails?.imageVerificationStatus === 'error' ||
    (Array.isArray(userPictures) && userPictures.some((pic) => pic?.imageVerificationStatus === 'error'))
  ) {
    picturePageError = true;
  }

  if (userDetails?.selfieImageVerificationStatus === 'error' || userDetails?.selfieImage === '') {
    selfiePageError = true;
  }
  if (userDetails?.ejamaatImageVerificationStatus === 'error') {
    ejamaatPageError = true;
  }
  return { imageScanned, picturePageError, selfiePageError, ejamaatPageError };
}

const updateUserProfileVisibleStatus = async (userDetails, userPictures) => {
  if (
    userDetails?.imageVerificationStatus === 'error' ||
    userDetails?.selfieImageVerificationStatus === 'notStarted' ||
    userDetails?.selfieImageVerificationStatus === 'scanned' ||
    userDetails?.selfieImageVerificationStatus === 'error' ||
    userPictures?.filter((picture) => picture.imageVerificationStatus === 'completed').length < 1
  ) {
    await userRepo.update({ _id: userDetails._id, isDeleted: 0 }, { isVisible: false });
  } else {
    await userRepo.update({ _id: userDetails._id, isDeleted: 0 }, { isVisible: true });
  }
};

function convertToUserTime(utcDate) {
  return moment(utcDate).tz(timezone).format('hh:mm A');
}
function convertToUserDate(utcDate) {
  return moment(utcDate).tz(timezone).format('YYYY-MM-DD');
}

const buildAppOpenHistory = (appOpenHistory) => {
  if (!appOpenHistory) {
    return {
      todayHistory: [],
      todayTotalCount: 0,
      last7DaysTotalCount: 0,
      last30DaysTotalCount: 0,
      allTotalCount: 0,
    };
  }

  let history = {};

  // TODAY RANGE
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 7 DAYS RANGE
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(todayStart.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // 30 DAYS RANGE
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(todayStart.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // FILTERS
  const todayFilter = appOpenHistory.filter((item) => {
    const d = new Date(item.date);
    return d >= todayStart && d <= todayEnd;
  });

  const last7DaysFilter = appOpenHistory.filter((item) => {
    const d = new Date(item.date);
    return d >= sevenDaysAgo && d <= todayEnd;
  });

  const last30DaysFilter = appOpenHistory.filter((item) => {
    const d = new Date(item.date);
    return d >= thirtyDaysAgo && d <= todayEnd;
  });

  // TOTAL COUNTS (sum of times arrays)
  const todayTotalCount = todayFilter.reduce((sum, item) => sum + item.times.length, 0);
  const last7DaysTotalCount = last7DaysFilter.reduce((sum, item) => sum + item.times.length, 0);
  const last30DaysTotalCount = last30DaysFilter.reduce((sum, item) => sum + item.times.length, 0);
  const allTotalCount = appOpenHistory.reduce((sum, item) => sum + item.times.length, 0);

  // BUILD TODAY HISTORY
  if (todayFilter.length > 0) {
    for (let item of todayFilter) {
      const date = convertToUserDate(item.date);

      let times = [];
      for (let t of item.times) {
        times.push(convertToUserTime(t));
      }

      history = { date, times };
    }

    // history = history.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return {
    todayHistory: history,
    todayTotalCount,
    last7DaysTotalCount,
    last30DaysTotalCount,
    allTotalCount,
  };
};

const buildAppOpenHistoryWithDateRange = (appOpenHistory, startDate, endDate) => {
  if (!appOpenHistory) {
    return {
      todayHistory: [],
      todayTotalCount: 0,
      last7DaysTotalCount: 0,
      last30DaysTotalCount: 0,
      allTotalCount: 0,
    };
  }

  let history = {};

  

  // TODAY RANGE
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 7 DAYS RANGE
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(todayStart.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // 30 DAYS RANGE
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(todayStart.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Date RANGE
  const allCountStartDate = new Date(startDate);
  const allCountEndDate = new Date(endDate);


  
  // FILTERS
  const todayFilter = appOpenHistory.filter((item) => {
    const d = new Date(item.date);
    return d >= todayStart && d <= todayEnd;
  });

  const last7DaysFilter = appOpenHistory.filter((item) => {
    const d = new Date(item.date);
    return d >= sevenDaysAgo && d <= todayEnd;
  });

  const last30DaysFilter = appOpenHistory.filter((item) => {
    const d = new Date(item.date);
    return d >= thirtyDaysAgo && d <= todayEnd;
  });

  const countInDateRange = appOpenHistory.filter((item) => {
    const d = new Date(item.date);
    return d >= allCountStartDate && d <= allCountEndDate;
  });


  
  // TOTAL COUNTS (sum of times arrays)
  const todayTotalCount = todayFilter.reduce((sum, item) => sum + item.times.length, 0);
  const last7DaysTotalCount = last7DaysFilter.reduce((sum, item) => sum + item.times.length, 0);
  const last30DaysTotalCount = last30DaysFilter.reduce((sum, item) => sum + item.times.length, 0);
  const allTotalCount =
    startDate && endDate
      ? countInDateRange.reduce((sum, item) => sum + item.times.length, 0)
      : appOpenHistory.reduce((sum, item) => sum + item.times.length, 0);

  // BUILD TODAY HISTORY
  if (todayFilter.length > 0) {
    for (let item of todayFilter) {
      const date = convertToUserDate(item.date);

      let times = [];
      for (let t of item.times) {
        times.push(convertToUserTime(t));
      }

      history = { date, times };
    }

    // history = history.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return {
    todayHistory: history,
    todayTotalCount,
    last7DaysTotalCount,
    last30DaysTotalCount,
    allTotalCount,
  };
};

module.exports = {
  handleNameUpdate,
  handleDobUpdate,
  handleEmailUpdate,
  handlePhoneUpdate,
  matchAndMarkSave,
  extractUserUpdates,
  upsertWrapItUpAnswers,
  processAnswers,
  matchAndMarkInterestSave,
  matchAndMarkPersonalitySave,
  buildWrapDetails,
  buildBasicDetails,
  buildProfileQuestions,
  buildInterests,
  buildPersonalityTraits,
  buildGallery,
  checkAndMarkSave,
  checkPersonalitySave,
  checkScanStatus,
  updateUserProfileVisibleStatus,
  buildAppOpenHistory,
  buildAppOpenHistoryWithDateRange,
};
