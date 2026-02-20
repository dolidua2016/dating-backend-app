const userFavoritesRepo = require('../repositories/userFavoritesRepo');
const userLikeRepo = require('../repositories/userLikeRepo');
const userReportRepo = require('../repositories/userReportRepo');
const countriesRepo = require('../repositories/countriesRepo');
const commonFunctions = require('../helpers/commonFunctions');
const userPassesRepo = require('../repositories/userPassesRepo');
const inboxRepo = require('../repositories/inboxRepo');
const userBlockRepo = require("../repositories/userBlockRepo");
const userPersonalityTraitRepo = require ("../repositories/userPersonalityTraitRepo");
const userInterestRepo = require("../repositories/userInterestRepo");
const userWrapItUpRepo = require("../repositories/userWrapItUpRepo");
const userQuestionAnswerRepo = require('../repositories/userQuestionAnswerRepo');
const userPictureRepo = require("../repositories/userPictureRepo")

const { buildBasicDetails, buildWrapDetails, buildGallery } = require('../services/userProfileService');

const moment = require('moment');
const mongoose = require('mongoose');

const buildInterestDetails = (element) => {
  return element.userInterestsDetails
    .map((detail) => {
      const interets = detail.interestsDetails.reduce((result, interest) => {
        const matchedType = interest.types.find((type) => type._id === detail.typeId);
        if (matchedType) {
          result = {
            _id: interest._id,
            categoryName: interest.categoryName,
            matchedType: [matchedType],
          };
        }
        return result;
      }, null); // Default initial value for result

      return { interets };
    })
    .reduce((acc, item) => {
      const { _id, categoryName, matchedType } = item.interets;

      // Check if the category already exists in the accumulator
      let existingCategory = acc.find((entry) => entry.categoryName === categoryName);

      if (existingCategory) {
        // Add matchedType values to the existing category
        existingCategory.matchedType.push(...matchedType);
      } else {
        // Add a new entry for the category
        acc.push({
          _id,
          categoryName,
          matchedType: [...matchedType],
        });
      }

      return acc;
    }, []);
};

const buildPersonality = (element) => {
  return element.userPersonalityTraitsDetails
    .map((detail) => {
      const wrapitups = detail.personalityTraitsDetails.reduce((result, personality) => {
        const categoryTypes = personality.categoryTypes.find((type) => type._id === detail.categoryTypesId);

        if (categoryTypes) {
          categoryTypes.number = detail.number; // attach number
          result = { categoryTypes };
        }

        return result;
      }, null);

      return wrapitups;
    })
    .filter(Boolean) // remove nulls
    .map((m) => m.categoryTypes);
};

const buildQuestionAnswer = (element) => {
  return element.questionAnswers
    .map((detail) => {
      const questions = detail.questions.reduce((result, question) => {
        if (question) {
          let answer = detail.answer;
          result = {
            ...question,
            answer,
          };
        }
        return result;
      }, null);
      return { questions };
    })
    .map((m) => m.questions);
};

const calculateAge = (dob) => {
  const diff = new Date() - new Date(dob);
  return new Date(diff).getUTCFullYear() - 1970;
};

const findAgeRange = (age, ageRanges) => ageRanges.find((range) => age >= range.startAge && age <= range.endAge);

const buildQuery = (findUser, minDate, maxDate, ids, agePriorityData) => ({
  gender: findUser.lookingFor,
  dateOfBirth: {
    $gte: findUser.gender === 'Male' ? agePriorityData.secondaryMinDOB : agePriorityData.primaryMinDOB,
    $lte: findUser.gender === 'Male' ? agePriorityData.primaryMaxDOB : agePriorityData.secondaryMaxDOB,
  },
  isActived: 1,
  isDeleted: 0,
  steps: { $gte: 13 },
  _id: ids,
  isVisible: true,
  deactivateAccount: { $ne: 1 },
});

const homeBuildQuery = (findUser, minDate, maxDate, ids, agePriorityData, filter) => ({
  gender: findUser.lookingFor,
  dateOfBirth: {
    $gte: findUser.gender === 'Male' ? agePriorityData.secondaryMinDOB : agePriorityData.primaryMinDOB,
    $lte: findUser.gender === 'Male' ? agePriorityData.primaryMaxDOB : agePriorityData.secondaryMaxDOB,
  },
  isActived: 1,
  isDeleted: 0,
  steps: { $gte: 13 },
  _id: ids,
  isVisible: true,
  deactivateAccount: { $ne: 1 }, // TODO New added for filter out deactivated accounts
  ...filter
});

function getPriorityAgeRange(gender, age, dateOfBirth, maritalStatus, searchAgeRange = '') {
  let priorityData = {};

  if (!searchAgeRange) {
    if (gender === 'Female') {
      let maxAllowedAge = maritalStatus === 'Never married' ? age + 7 : age + 10;
      let minAllowedAge = maritalStatus === 'Never married' ? age - 3 : age - 10;
      priorityData = {
        gender: 'male',
        primary: { minAge: age, maxAge: maxAllowedAge },
        secondary: { minAge: minAllowedAge, maxAge: age },
      };
    } else {
      let maxAllowedAge = maritalStatus === 'Never married' ? age + 3 : age + 10;
      let minAllowedAge = maritalStatus === 'Never married' ? age - 7 : age - 10;
      priorityData = {
        gender: 'female',
        primary: { minAge: minAllowedAge, maxAge: age },
        secondary: { minAge: age, maxAge: maxAllowedAge },
      };
    }
  } else {
    let [minAgeStr, maxAgeStr] = searchAgeRange.split('-');
    minAgeStr = Number(minAgeStr);
    maxAgeStr = Number(maxAgeStr); 

    if (gender === 'Female') {
      priorityData = {
        gender: 'male',
        primary: { minAge: minAgeStr, maxAge: maxAgeStr }, 
        secondary: { minAge: minAgeStr, maxAge: maxAgeStr },
      };
    } else {
      priorityData = {
        gender: 'female',
        primary: { minAge: minAgeStr, maxAge: maxAgeStr }, 
        secondary: { minAge: minAgeStr, maxAge: maxAgeStr }, 
      };
    }
  }


  // Convert Age → DOB Ranges
  const primaryMinDOB = ageToDOB(priorityData.primary.maxAge, dateOfBirth);
  const primaryMaxDOB = ageToDOB(priorityData.primary.minAge, dateOfBirth);

  const secondaryMinDOB = ageToDOB(priorityData.secondary.maxAge, dateOfBirth);
  const secondaryMaxDOB = ageToDOB(priorityData.secondary.minAge, dateOfBirth);
  const ageRange = {
    minAge: priorityData.gender === 'female' ? priorityData.primary.minAge : priorityData.secondary.minAge,
    maxAge: priorityData.gender === 'female' ? priorityData.secondary.maxAge :  priorityData.primary.maxAge ,
  };
  console.log(ageRange,'ageRange===== 185')
  if(ageRange.minAge <= 19) ageRange.minAge = 20; // Minimum age limit
  
  
  return { primaryMinDOB, primaryMaxDOB, secondaryMinDOB, secondaryMaxDOB, ageRange };
}

function ageToDOB(age, userDateOfBirth) {
  const original = new Date(userDateOfBirth); // user real DOB

  const year = new Date().getFullYear() - age;

  // Keep month & date same
  return new Date(year, original.getMonth(), original.getDate());
}

const checkAndMarkSave = (userInterestList, interestList) => {

  const userMap = userInterestList.reduce((map, interest) => {
    map[`${interest.interestId}_${interest.typeId}`] = true;
    return map;
  }, {});
  return interestList.map((item) => ({
    ...item,
    matchedType: item.matchedType.map((type) => ({
      ...type,
      isSaved: !!userMap[`${item._id}_${type._id}`],
    })),
  }));
};

const checkPersonalitySave = (userPersonalityList, personalityList) => {
  const userMap = userPersonalityList.reduce((map, p) => {
    map[p.categoryTypesId] = true;
    return map;
  }, {});
  return personalityList.map((item) => ({
    ...item,
    isSaved: !!userMap[item._id],
  }));
};

const cleanUserObject = (element) => {
  const keysToDelete = [
    '_id',
    'firstName',
    'lastName',
    'email',
    'profileImage',
    'phone',
    'otp',
    'otpExpireTime',
    'countryId',
    'city',
    'location',
    'address',
    'gender',
    'lookingFor',
    'dob',
    'age',
    'height',
    'education',
    'profession',
    'maritalStatus',
    'married',
    'religious',
    'kids',
    'about',
    'steps',
    'registrationStatus',
    'accessToken',
    'token',
    'notificationAllow',
    'isSubcription',
    'isOnline',
    'socketId',
    'isActived',
    'isDeleted',
    'createdAt',
    'updatedAt',
    '__v',
    'deviceType',
    'dateOfBirth',
    'maritalStatusOrder',
    'marriedOrder',
    'religiousOrder',
    'userwrapitupsDetails',
    'photos',
    'userInterestsDetails',
    'userPersonalityTraitsDetails',
  ];
  keysToDelete.forEach((key) => delete element[key]);
};

function getDateRange(user) {
  const ageRanges = [
    { startAge: 18, endAge: 25, maxOrminAge: 10 },
    { startAge: 26, endAge: 35, maxOrminAge: 10 },
    { startAge: 36, endAge: 45, maxOrminAge: 10 },
    { startAge: 46, endAge: 55, maxOrminAge: 10 },
    { startAge: 56, endAge: 100, maxOrminAge: 10 },
  ];
  const myAge = calculateAge(user.dateOfBirth);
  const selectedRange = findAgeRange(myAge, ageRanges);
  return {
    age: myAge,
    minDate: moment(user.dateOfBirth).subtract(selectedRange.maxOrminAge, 'year').toDate(),
    maxDate: moment(user.dateOfBirth).add(selectedRange.maxOrminAge, 'year').toDate(),
  };
}

function buildExcludeIds(blocked, liked, passed, userId) {
  return [
    ...blocked.map((b) => mongoose.Types.ObjectId.createFromHexString(b.toUserId.toString())),
    ...liked.map((b) => mongoose.Types.ObjectId.createFromHexString(b.toUserId.toString())),
    ...passed.map((b) => mongoose.Types.ObjectId.createFromHexString(b.toUserId.toString())),
    mongoose.Types.ObjectId.createFromHexString(userId),
  ];
}

function buildIncludeIds(fullDayLikes, fullDayPasses) {
  return [
    ...fullDayLikes.map((b) => mongoose.Types.ObjectId.createFromHexString(b.toUserId.toString())),
    ...fullDayPasses.map((b) => mongoose.Types.ObjectId.createFromHexString(b.toUserId.toString())),
  ];
}

function applyPreferenceMappings(user, data) {
  const mappings = {
    maritalStatus: {
      'Never married': ['Never married', 'Divorced', 'Widowed', 'Prefer Not To Say'],
      Divorced: ['Divorced', 'Widowed', 'Never married', 'Prefer Not To Say'],
      Widowed: ['Widowed', 'Divorced', 'Never married', 'Prefer Not To Say'],
    },
    married: {
      '0-2 years (Jaldi che)': ['0-2 years (Jaldi che)', '2-4 years (Time che)', 'Not sure (Khabar nathi)'],
      '2-4 years (Time che)': ['2-4 years (Time che)', '0-2 years (Jaldi che)', 'Not sure (Khabar nathi)'],
    },
    religious: {
      'Not Practicing': [
        'Not Practicing',
        'Moderately Practicing',
        'Practicing',
        'Very Practicing',
        'Prefer Not To Say',
      ],
      'Moderately Practicing': [
        'Moderately Practicing',
        'Practicing',
        'Very Practicing',
        'Not Practicing',
        'Prefer Not To Say',
      ],
      'Very Practicing': [
        'Very Practicing',
        'Practicing',
        'Moderately Practicing',
        'Not Practicing',
        'Prefer Not To Say',
      ],
      Practicing: ['Practicing', 'Very Practicing', 'Moderately Practicing', 'Not Practicing', 'Prefer Not To Say'],
    },
  };
  for (const key in mappings) {
    if (mappings[key][user[key]]) {
      data[`${key}Mapping`] = mappings[key][user[key]];
    }
  }
}

async function transformUserList(users, findUser, userId, userInterests, userPersonality, countryId = '') {
  let countries = '';
  if(findUser?.countryId || countryId ){
       countries = await countriesRepo.findOne({ _id: findUser?.countryId || countryId });
  }

  const transformed = await Promise.all(
    users.map(async (u) => {
      u.name = `${u.firstName} ${u.lastName}`;
      u.distance = u.distance?.toString();

      u.isReport = !!(await userReportRepo.findOne({
        toUserId: u._id,
        fromUserId: userId,
        isDeleted: 0,
        reportType: 'image',
        reason: u.profileImage,
      }));
      u.isFavourite = !!(await userFavoritesRepo.findOne({
        fromUserId: userId,
        toUserId: u._id,
        isDeleted: 0,
        isActived: 1,
      }));
      u.isLiked = !!(await userLikeRepo.findOne({ fromUserId: userId, toUserId: u._id, isDeleted: 0, isActived: 1 }));
      u.isLikeMe = !!(await userLikeRepo.findOne({ fromUserId: u._id, toUserId: userId, isDeleted: 0, isActived: 1 }));

      const likedData = await userLikeRepo.findOne({ fromUserId: userId, toUserId: u._id, isDeleted: 0, isActived: 1 });
      console.log(u._id,'u id------')
      const matchedData = await inboxRepo.findOne({
        $or: [
          {
            firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),
            secondUserId: mongoose.Types.ObjectId.createFromHexString(u._id),
          },
          {
            firstUserId: mongoose.Types.ObjectId.createFromHexString(u._id),
            secondUserId: mongoose.Types.ObjectId.createFromHexString(userId),
          },
        ],
        isActived: 1,
        isDeleted: 0,
      });
      const passedData = await userPassesRepo.findOne({
        fromUserId: userId,
        toUserId: u._id,
        isDeleted: 0,
        isActived: 1,
      });

      // Collect all dates in one array
      const activityArray = [
        likedData ? { type: 'like', createdAt: likedData.createdAt } : null,
        matchedData ? { type: 'match', createdAt: matchedData.createdAt } : null,
        passedData ? { type: 'pass', createdAt: passedData.createdAt } : null,
      ];

      const filtered = activityArray.filter((x) => x !== null);
      if (filtered.length > 0) {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        u.lastAction = filtered[0]; //  LATEST ACTION
      }

      u.isLiked = !!likedData; //!!(await userLikeRepo.findOne({ fromUserId: userId, toUserId: u._id, isDeleted: 0, isActived: 1 }));
      u.isMatched = !!matchedData; //!!(await inboxRepo.findOne({$or:[{firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),secondUserId: mongoose.Types.ObjectId.createFromHexString(u._id) }, {firstUserId: mongoose.Types.ObjectId.createFromHexString(u._id),secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)}],isActived: 1, isDeleted: 0, isBlocked: false}));
      u.isPassed = !!passedData; //!!(await userPassesRepo.findOne({ fromUserId: userId, toUserId: u._id, isDeleted: 0, isActived: 1 }));

      u.compatibilityScore = await commonFunctions.calculateCompatibilityScore(userId, u._id);
      u.isRecentlyOnline = u.isOnline ? 1 : 0;

      const wrapDetails = await buildWrapDetails(u);

      u.basicDetails = buildBasicDetails(u, countries, wrapDetails, 'home');
      u.aboutDetails = u.about;
      u.profileTextQuestions = { questionAnswers: buildQuestionAnswer(u) };

      const interestsDetails = await buildInterestDetails(u);
      const interestResult = checkAndMarkSave(userInterests, interestsDetails);
      u.interestDetail = [...new Set(interestResult.flatMap((c) => c.matchedType))].map((ele) => ({
        ...ele,
        icon: process.env.HOST_URL + ele.icon,
      }));

      const personality = await buildPersonality(u);
      u.personalityTraitsDetails = checkPersonalitySave(userPersonality, personality);
      u.privacyLocked = u.isPrivacyLocked === 0 || !!matchedData ? 0 : 1;
      u.deactivateAccountAt = u.deactivateAccountAt || null;
      u.gallery = buildGallery(u);
      cleanUserObject(u);

      return u;
    }),
  );

  return transformed.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}


async function fetchAllUserRelations(userId, startOfDay, endOfDay, userLimit) {
  const [blockedUsers, likedUsers, passedUsers, todayLikes, todayPasses, includeUser] = await Promise.all([
    userBlockRepo.findAllBlock({ fromUserId: userId, isDeleted: 0 }),
    userLikeRepo.findAll({ fromUserId: userId, isDeleted: 0 }),
    userPassesRepo.findAll({ fromUserId: userId, isDeleted: 0 }),
    userLikeRepo.findAll({
      fromUserId: userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      pageFrom: "home",
    }),
    userPassesRepo.findAll({
      fromUserId: userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      pageFrom: "home",
    }),
    userLikeRepo.findLikeUser({ 
      toUserId: mongoose.Types.ObjectId.createFromHexString(userId), 
      isDeleted: 0 
    },{offset: 0, limit: userLimit})
  ]);

  return { blockedUsers, likedUsers, passedUsers, todayLikes, todayPasses, includeUser };
}
async function transformUserListOptimized(users, findUser, userId, userInterests, userPersonality, countryId = '') {
  if (!users.length) return [];

  const userIds = users.map(u => u._id);
  const userIdStrings = users.map(u => u._id.toString());

  // Fetch country once
  const countries = (findUser?.countryId || countryId)
    ? await countriesRepo.findOne({ _id: findUser?.countryId || countryId })
    : '';

  // BATCH FETCH ALL DATA AT ONCE
  const [
    reportedImages,
    favorites,
    likes,
    likesReceived,
    matches,
    passes,
    compatibilityScores
  ] = await Promise.all([
    userReportRepo.findAll({
      fromUserId: userId,
      toUserId: { $in: userIds },
      isDeleted: 0,
      reportType: 'image'
    }),
    userFavoritesRepo.findAll({
      fromUserId: userId,
      toUserId: { $in: userIds },
      isDeleted: 0,
      isActived: 1
    }),
    userLikeRepo.findAll({
      fromUserId: userId,
      toUserId: { $in: userIds },
      isDeleted: 0,
      isActived: 1
    }),
    userLikeRepo.findAll({
      fromUserId: { $in: userIds },
      toUserId: userId,
      isDeleted: 0,
      isActived: 1
    }),
    inboxRepo.findAll({
      $or: [
        { firstUserId: mongoose.Types.ObjectId.createFromHexString(userId), secondUserId: { $in: userIds } },
        { firstUserId: { $in: userIds }, secondUserId: mongoose.Types.ObjectId.createFromHexString(userId) }
      ],
      isActived: 1,
      isDeleted: 0
    }),
    userPassesRepo.findAll({
      fromUserId: userId,
      toUserId: { $in: userIds },
      isDeleted: 0,
      isActived: 1
    }),
    // Batch calculate compatibility scores
    commonFunctions.calculateCompatibilityScoresBatch(userId, userIds)
  ]);

  // Create lookup maps for O(1) access
  const reportMap = new Map(reportedImages.map(r => [`${r.toUserId}-${r.reason}`, true]));
  const favMap = new Map(favorites.map(f => [f.toUserId.toString(), true]));
  const likeMap = new Map(likes.map(l => [l.toUserId.toString(), l]));
  const likeMeMap = new Map(likesReceived.map(l => [l.fromUserId.toString(), true]));
  const matchMap = new Map();
  matches.forEach(m => {
    matchMap.set(m.firstUserId.toString(), m);
    matchMap.set(m.secondUserId.toString(), m);
  });
  const passMap = new Map(passes.map(p => [p.toUserId.toString(), p]));
  const scoreMap = new Map(compatibilityScores || []);
  // Transform users using cached data
  const transformed = users.map(u => {
    const uIdStr = u._id.toString();

    u.name = `${u.firstName} ${u.lastName}`;
    u.distance = u.distance?.toString();

    u.isReport = reportMap.has(`${u._id}-${u.profileImage}`);
    u.isFavourite = favMap.has(uIdStr);
    u.isLiked = likeMap.has(uIdStr);
    u.isLikeMe = likeMeMap.has(uIdStr);

    const likedData = likeMap.get(uIdStr);
    const matchedData = matchMap.get(uIdStr);
    const passedData = passMap.get(uIdStr);

    // Activity tracking
    const activityArray = [
      likedData ? { type: 'like', createdAt: likedData.createdAt } : null,
      matchedData ? { type: 'match', createdAt: matchedData.createdAt } : null,
      passedData ? { type: 'pass', createdAt: passedData.createdAt } : null,
    ].filter(x => x !== null);

    if (activityArray.length > 0) {
      activityArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      u.lastAction = activityArray[0];
    }

    u.isMatched = !!matchedData;
    u.isPassed = !!passedData;
    u.compatibilityScore = scoreMap.get(uIdStr) || 0;
    u.isRecentlyOnline = u.isOnline ? 1 : 0;

    const wrapDetails = buildWrapDetails(u);
    u.basicDetails = buildBasicDetails(u, countries, wrapDetails, 'home');
    u.aboutDetails = u.about;
    u.profileTextQuestions = { questionAnswers: buildQuestionAnswer(u) };
    // Use data already fetched in aggregation
    const interestsDetails =  buildInterestDetails(u);
    const interestResult = checkAndMarkSave(userInterests, interestsDetails);
    u.interestDetail = [...new Set(interestResult.flatMap(c => c.matchedType))].map(ele => ({
      ...ele,
      icon: process.env.HOST_URL + ele.icon,
    }));

    

    const personality =  buildPersonality(u);
    u.personalityTraitsDetails = checkPersonalitySave(userPersonality, personality);
    u.privacyLocked = u.isPrivacyLocked === 0 || !!matchedData ? 0 : 1;
    u.deactivateAccountAt = u.deactivateAccountAt || null;
    u.gallery = buildGallery(u);

    cleanUserObject(u);
    return u;
  });

  return transformed.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

async function prepareLookupMaps(userId, users) {
    const userIds = users.map(u => u._id);
    const userObjectId = users.map(u => mongoose.Types.ObjectId.createFromHexString(u._id));
    //Sequetial data fetch
    const [reportedImages, likes, likesReceived, matches, passes, compatibilityScores, personalities, interests, wrapitupdetails, questionsAnswer, photos] = await Promise.all([
        userReportRepo.findAll({ fromUserId: userId, toUserId: { $in: userIds }, isDeleted: 0, reportType: 'image' }),
        userLikeRepo.findAll({ fromUserId: userId, toUserId: { $in: userIds }, isDeleted: 0, isActived: 1 }),
        userLikeRepo.findAll({ fromUserId: { $in: userIds }, toUserId: userId, isDeleted: 0, isActived: 1 }),
        inboxRepo.findAll({
            $or: [
                { firstUserId: mongoose.Types.ObjectId.createFromHexString(userId), secondUserId: { $in: userIds } },
                { firstUserId: { $in: userIds }, secondUserId: mongoose.Types.ObjectId.createFromHexString(userId) }
            ],
            isActived: 1, isDeleted: 0
        }),
        userPassesRepo.findAll({ fromUserId: userId, toUserId: { $in: userIds }, isDeleted: 0, isActived: 1 }),
        commonFunctions.calculateCompatibilityScoresBatch(userId, userIds),
        userPersonalityTraitRepo.findAllWithCategories({userId: { $in: userObjectId }, isActived: 1, isDeleted: 0}),
        userInterestRepo.findAllWithTypes({userId: { $in: userObjectId }, isActived: 1, isDeleted: 0}),
        userWrapItUpRepo.findAllWithTypes({userId: { $in: userObjectId }, isActived: 1, isDeleted: 0}),
        userQuestionAnswerRepo.findAllWithAnswer({userId: { $in: userObjectId }, isActived: 1, isDeleted: 0}),
        userPictureRepo.findAllWithAnswer({userId: { $in: userObjectId }, isActived: 1, isDeleted: 0,  imageVerificationStatus: "completed"}),

      ]);
    // Create Map
    const matchMap = new Map();
    matches.forEach(m => {
        matchMap.set(m.firstUserId.toString(), m);
        matchMap.set(m.secondUserId.toString(), m);
    });

    return {
        reportMap: new Map(reportedImages.map(r => [`${r.toUserId}-${r.reason}`, true])),
        likeMap: new Map(likes.map(l => [l.toUserId.toString(), l])),
        likeMeMap: new Map(likesReceived.map(l => [l.fromUserId.toString(), true])),
        passMap: new Map(passes.map(p => [p.toUserId.toString(), p])),
        scoreMap: new Map(compatibilityScores || []),
        matchMap,
        personalityTraitsMap: new Map (personalities.map(p => [p.userId.toString(), p.traits])),
        intersetMap:  new Map (interests.map(p => [p.userId.toString(), p.interests])),
        wrapMap :  new Map (wrapitupdetails.map(p => [p.userId.toString(), p.wrapitup])),
        questionAnswerMap : new Map(questionsAnswer.map(p =>[p.userId.toString(), p.answers] )),
        photoMap: new Map(photos.map(p =>[p.userId.toString(), p.photos] )),
      };

}

async function transformSingleUserSync(u, findUser, countryId, userInterests, userPersonality, maps) {  
  
  const uIdStr = u._id.toString();
   // Fetch country once
  const countries = (findUser?.countryId || countryId)
    ? await countriesRepo.findOne({ _id: findUser?.countryId || countryId })
    : '';
    u.name = `${u.firstName} ${u.lastName}`;
    u.distance = u.distance?.toString();

    
    u.isReport = maps.reportMap.has(`${u._id}-${u.profileImage}`);
    u.isLiked = maps.likeMap.has(uIdStr);
    u.isLikeMe = maps.likeMeMap.has(uIdStr);
    u.isFavourite = false;
    
    u.userPersonalityTraitsDetails = maps.personalityTraitsMap.get(uIdStr);
    u.userInterestsDetails = maps.intersetMap.get(uIdStr) || [];
    u.userwrapitupsDetails = maps.wrapMap.get(uIdStr) ||  [];
    u.questionAnswers = maps.questionAnswerMap.get(uIdStr) || [];
    u.photos = maps.photoMap.get(uIdStr) || [];


    const likedData = maps.likeMap.get(uIdStr);
    const matchedData = maps.matchMap.get(uIdStr);
    const passedData = maps.passMap.get(uIdStr);

    // Activity tracking
    const activityArray = [
        likedData ? { type: 'like', createdAt: likedData.createdAt } : null,
        matchedData ? { type: 'match', createdAt: matchedData.createdAt } : null,
        passedData ? { type: 'pass', createdAt: passedData.createdAt } : null,
    ].filter(Boolean);

    if (activityArray.length > 0) {
        activityArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        u.lastAction = activityArray[0];
    }

    u.isMatched = !!matchedData;
    u.isPassed = !!passedData;
    u.compatibilityScore = maps.scoreMap.get(uIdStr) || 0;
    u.isRecentlyOnline = u.isOnline ? 1 : 0;

  
    const wrapDetails = buildWrapDetails(u);
    u.basicDetails = buildBasicDetails(u, countries, wrapDetails, 'home');
    u.aboutDetails = u.about;
    u.profileTextQuestions = { questionAnswers: buildQuestionAnswer(u) };
    
     const interestsDetails = buildInterestDetails(u);
    const interestResult = checkAndMarkSave(userInterests, interestsDetails);
    u.interestDetail = [...new Set(interestResult.flatMap(c => c.matchedType))].map(ele => ({
        ...ele,
        icon: process.env.HOST_URL + ele.icon,
    }));
    const personality = await buildPersonality(u);
    u.personalityTraitsDetails = checkPersonalitySave(userPersonality, personality);
    u.privacyLocked = u.isPrivacyLocked === 0 || !!matchedData ? 0 : 1;
    u.gallery = buildGallery(u);

    cleanUserObject(u);
    return u;
}
module.exports = {
  buildInterestDetails,
  buildPersonality,
  buildQuestionAnswer,
  calculateAge,
  findAgeRange,
  buildQuery,
  homeBuildQuery, // TODO: ===> New Added
  checkAndMarkSave,
  checkPersonalitySave,
  cleanUserObject,
  getDateRange,
  buildExcludeIds,
  buildIncludeIds,
  applyPreferenceMappings,
  transformUserList,
  getPriorityAgeRange,
  fetchAllUserRelations,
  transformUserListOptimized,
  prepareLookupMaps,
  transformSingleUserSync
};
