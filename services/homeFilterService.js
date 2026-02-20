const homeFilterRepo = require('../repositories/homeFilterRepo');
const wrapItUpRepo = require("../repositories/wrapItUpRepo");
const { getDateRange, getPriorityAgeRange } = require("./homeService");
const { heightToInches } = require('../helpers/commonFunctions');
const userRepo = require('../repositories/userRepo');

const visibleStateInCountry = ['664cacf9d0961f832fd51d34'];

function countryIdsParse(countryIds) {
    if (!countryIds) return [];
    
    try {
        let raw = countryIds;
        // single quote → double quote
        raw = raw.replace(/'/g, '"');
        console.log(raw,'raw')
        // key quote ( _id: → "_id": )
        raw = raw.replace(/(\w+):/g, '"$1":');
        console.log(raw,'raw 19')
        const parsed = JSON.parse(`[${raw}]`);
        return parsed[0] || [];
    } catch (error) {
        console.error('countryIdsParse error:', error);
        return [];
    }
}

function convertQuestionToKey(question) {
    const map = {
        "Education": "education",
        "How religious are you ?": "religious",
        "What is your marital status?": "maritalStatus",
        "When are you looking to get married?": "married",
        "Do you have Kids?": "kids",
        "Do you want Kids?": "wantKids"
    };
    return map[question] || null;
}

function convertKeyToQuestion(key) {
    const map = {
        "education": "Education",
        "religious": "How religious are you ?",
        "maritalStatus": "What is your marital status?",
        "married": "When are you looking to get married?",
        "kids": "Do you have Kids?",
        "wantKids": "Do you want Kids?"
    };
    return map[key] || null;
}

async function homeFilterData(user, page) {
    console.log(user,'user======= 53')
    const [userFilter, wrapQuestions, ] = await Promise.all([
        homeFilterRepo.findOne({ userId: user._id, isDeleted: 0 }),
        wrapItUpRepo.findAll({ isDeleted: 0, isActived: 1 }),
    ]);

      const filterCountryIds = userFilter?.countryIds?.map(c => c._id)

     const country = await userRepo.userCountryStateList({
            isDeleted: 0, 
            isActived: 1, 
            steps: {$gte: 13}, 
            isBlocked: 0, 
            goToHome: true, 
            isVisible: true, 
            state: { $nin: [null, "", " ", "N/A"] },
            gender: {$ne: user.gender},
            _id: {$ne: user._id}
        }, Number(page), 4, -1, filterCountryIds );

   
    let ageRange = null;
    let defaultAgeRange = null;
    let heightRange = null;

    // Calculate age range if not exists
    if (!userFilter?.ageRange || !userFilter?.defaultAgeRange) {
        const { age } = getDateRange(user);
        const agePriorityData = getPriorityAgeRange(
            user.gender,
            age,
            user.dateOfBirth,
            user?.maritalStatus,
        );
        
        ageRange = agePriorityData.ageRange;
        defaultAgeRange = agePriorityData.ageRange;
        
        await homeFilterRepo.findOneAndUpdate(
            { userId: user._id },
            { 
                $set: { 
                    defaultAgeRange: `${agePriorityData.ageRange?.minAge}-${agePriorityData.ageRange?.maxAge}` 
                } 
            },
            { upsert: true }
        );
    }
    

     const itsVerified = userFilter?.itsVerified  ||  false;    
    

    // Parse default age range from userFilter
    if (userFilter?.defaultAgeRange) {
        const age = userFilter.defaultAgeRange.split('-');
        if (age.length === 2) {
            defaultAgeRange = {
                minAge: Number(age[0]),
                maxAge: Number(age[1])
            };
        }
    }

    // Parse current age range from userFilter
    if (userFilter?.ageRange) {
        const range = userFilter.ageRange.split('-');
        if (range.length === 2) {
            ageRange = {
                minAge: Number(range[0]),
                maxAge: Number(range[1])
            };
        }
    }

    // Parse height range from userFilter
    if (userFilter?.heightRange) {
        const height = userFilter.heightRange.split('-');
        if (height.length === 2) {
            heightRange = {
                minHeight: Number(height[0]),
                maxHeight: Number(height[1])
            };
        }
    }

    // Map wrap questions with user selections
    const result = wrapQuestions.map(q => {
        const key = convertQuestionToKey(q.question);
        const selectedValues = userFilter?.[key] || [];
        
        return {
            ...q._doc || q,
            types: q.types.map(t => ({
                ...t._doc || t,
                isSelected: (selectedValues.includes(t._id.toString()) ) // && user?.isSubcription
            }))
        };
    });

    // Parse user filter countries
    const userFilterCountry = userFilter?.countryIds || [];
    
    const countryList = country.countries.map(c => {
        const filterCountry = userFilterCountry.filter(uc => uc._id === c.countryId);
        const selectedCountry = filterCountry.map(fc => fc._id);
        const selectedState = filterCountry.length > 0 ? (filterCountry[0].states || []) : [];
        
        return {
            ...c,
            countryFlag: process.env.HOST_URL + c.countryFlag,
            isStateVisible: visibleStateInCountry.includes(c.countryId),
            isSelected: selectedCountry.includes(c.countryId),
            states: c.states.map(s => ({
                ...s,
                isSelected: selectedState.includes(s.name)
            }))
        };
    });

    // Build filter object from result
    const filterObj = Object.fromEntries(
        result
            .map(r => [convertQuestionToKey(r.question), r.types])
            .filter(([key]) => key !== null)
    );

    const response = {
        filter: filterObj,
        ageRange: ageRange,
        defaultAgeRange: defaultAgeRange,
        heightRange: heightRange,
        isSubcription: user?.isSubcription,
        itsVerified: itsVerified,
        country: {
            countryList, 
            totalCountries: country.totalCountries
        },
        selectedCountry: userFilterCountry
    };

    return response;
}

async function homeFilterQuery(queryParam, userId, isSubcription, searchAgeRange, heightRange) {
    const countryIds = countryIdsParse(queryParam?.countryIds);
    
    const [wrapQuestions, userFilter] = await Promise.all([
        wrapItUpRepo.findAll({ isDeleted: 0, isActived: 1 }),
        homeFilterRepo.findOne({ userId: userId, isDeleted: 0 })
    ]);

    let filterResult = {};
    
    // Check if this is first time load (no filter params from app)
    const isFirstTimeLoad = !queryParam || Object.keys(queryParam).length === 0 || 
                            (!queryParam.filter && !queryParam.countryIds && !searchAgeRange && !heightRange && !queryParam.itsVerified);

    // Determine which data to use
    let finalCountryIds = countryIds;
    let finalAgeRange = searchAgeRange;
    let finalHeightRange = heightRange;
    let finalFilter = queryParam?.filter || {};
    let itsVerified = false;

    // If first time load, use saved userFilter data
    if (isFirstTimeLoad && userFilter) {
        finalCountryIds = userFilter.countryIds || [];
        finalAgeRange = userFilter.ageRange;
        finalHeightRange = userFilter.heightRange;
        itsVerified = userFilter?.itsVerified || false;

    } else if (queryParam) {
        // Use data from app
        finalCountryIds = countryIds;
        finalAgeRange = searchAgeRange || userFilter?.ageRange;
        finalHeightRange = heightRange;
        finalFilter = queryParam.filter || {};
        itsVerified = queryParam?.itsVerified || false;

    }
    
    // Handle country and state filtering
    if (finalCountryIds && finalCountryIds.length > 0) {
        console.log('condition true ==========================231')
        const orConditions = [];
        
        finalCountryIds.forEach(country => {
            if (country.states && country.states.length > 0) {
                // If state selected → filter by state
                orConditions.push({
                    countryId: country._id,
                    state: { $in: country.states }
                });
            } else {
                // If no state selected → full country
                orConditions.push({ countryId: country._id });
            }
        });

        if (orConditions.length > 0) {
            filterResult.$or = orConditions;
        }
    }

    // Handle height filtering
    if (finalHeightRange) { //isSubcription && 
        const height = finalHeightRange.split('-');
        
        if (height.length === 2 && height[0] && height[1]) {
            const minHeight = heightToInches(height[0]);
            const maxHeight = heightToInches(height[1]);
            
            filterResult.heightInInches = {
                $gte: minHeight,
                $lte: maxHeight
            };
        }
    }

    // Handle other filters (education, religious, etc.)
    //if (isSubcription) {
        if (!isFirstTimeLoad && Object.keys(finalFilter).length > 0) {
            // Use filter from app request
            Object.entries(finalFilter).forEach(([key, value]) => {
                const changeKey = convertKeyToQuestion(key);
                const selectedIds = value ? value.split(',').map(v => v.trim()) : [];

                if (selectedIds.length === 0) return;

                const matchedQuestion = wrapQuestions.find(q => q.question === changeKey);

                if (matchedQuestion) {
                    const selectedNames = matchedQuestion.types
                        .filter(t => selectedIds.includes(t._id.toString()))
                        .map(t => t.name);

                    if (selectedNames.length > 0) {
                        filterResult[key] = { $in: selectedNames };
                    }
                }
            });
        } else if (isFirstTimeLoad && userFilter) {
            // Use saved filters from database (first time load)
            const filterKeys = ['education', 'religious', 'maritalStatus', 'married', 'kids', 'wantKids'];
            
            filterKeys.forEach(key => {
                const selectedIds = userFilter[key];
                
                if (Array.isArray(selectedIds) && selectedIds.length > 0) {
                    const changeKey = convertKeyToQuestion(key);
                    const matchedQuestion = wrapQuestions.find(q => q.question === changeKey);

                    if (matchedQuestion) {
                        const selectedNames = matchedQuestion.types
                            .filter(t => selectedIds.includes(t._id.toString()))
                            .map(t => t.name);

                        if (selectedNames.length > 0) {
                            filterResult[key] = { $in: selectedNames };
                        }
                    }
                }
            });
        }
    //}

    //
    if(itsVerified) {
        filterResult.ejamaatImageVerificationStatus = 'completed';
    }


    
    // Save filter query to database (only if data is sent from app)
    if (!isFirstTimeLoad) {
        await addHomeFilterQuery(queryParam, userId, isSubcription, finalAgeRange, finalHeightRange, finalCountryIds, itsVerified);
    }


    return {
        filter: filterResult,
        searchAgeRange: finalAgeRange
    };
}

async function addHomeFilterQuery(queryParam, userId, isSubcription, searchAgeRange, heightRange, countryIds, itsVerified) {
    const filter = queryParam?.filter || {};
    const saveData = {};
    const unsetData = {};

    // Save age range
    if (searchAgeRange) {
        saveData.ageRange = searchAgeRange;
    }

    // Save height range
    if (heightRange) {
        saveData.heightRange = heightRange;
    } else {
        // If heightRange is explicitly null/undefined, remove it from database
        unsetData.heightRange = "";
    }
    
    //Its verfied upadate
    saveData.itsVerified = itsVerified;     
  

    // Save country IDs
    if (countryIds && countryIds.length > 0) {
        saveData.countryIds = countryIds;
    } else if (queryParam?.countryIds === '' || queryParam?.countryIds === null) {
        // If countryIds is explicitly empty, remove it from database
        unsetData.countryIds = "";
    }

    // Handle other filters
    const filterKeys = ['education', 'religious', 'maritalStatus', 'married', 'kids', 'wantKids'];
    
    if (Object.keys(filter).length > 0) {
        // Process each filter key
        filterKeys.forEach(key => {
            if (filter.hasOwnProperty(key)) {
                const value = filter[key];
                const selectedIds = value ? value.split(',').map(v => v.trim()) : [];
                
                if (selectedIds.length > 0) {
                    saveData[key] = selectedIds;
                } else {
                    // If filter key exists but empty, remove it
                    unsetData[key] = "";
                }
            }
        });
    } else if (queryParam && queryParam.hasOwnProperty('filter')) {
        // If filter object is explicitly sent as empty, clear all filters
        filterKeys.forEach(key => {
            unsetData[key] = "";
        });
    }

    // Build update query
    const updateQuery = {};
    
    if (Object.keys(saveData).length > 0) {
        updateQuery.$set = saveData;
    }
    
    if (Object.keys(unsetData).length > 0) {
        updateQuery.$unset = unsetData;
    }

    // Update database only if there's something to update
    if (Object.keys(updateQuery).length > 0) {
        await homeFilterRepo.findOneAndUpdate(
            { userId },
            updateQuery,
            { upsert: true }
        );
    }
}

async function homeCountryFilterData(user, page, search) {
    console.log(page,'page')
    const userFilter  = await  homeFilterRepo.findOne({ userId: user._id, isDeleted: 0 });
    const filterCountryIds = userFilter?.countryIds?.map(c => c._id)

    const country = await userRepo.userCountryStateList({
            isDeleted: 0, 
            isActived: 1, 
            steps: {$gte: 13}, 
            isBlocked: 0, 
            goToHome: true, 
            isVisible: true, 
            state: { $nin: [null, "", " ", "N/A"] },
            gender: {$ne: user.gender},
            _id: {$ne: user._id}
        }, Number(page), 4, -1, filterCountryIds ,search);

    // Parse user filter countries
    const userFilterCountry = userFilter?.countryIds || [];
    
    const countryList = country.countries.map(c => {
        const filterCountry = userFilterCountry.filter(uc => uc._id === c.countryId);
        const selectedCountry = filterCountry.map(fc => fc._id);
        const selectedState = filterCountry.length > 0 ? (filterCountry[0].states || []) : [];
        
        return {
            ...c,
            countryFlag: process.env.HOST_URL + c.countryFlag,
            isStateVisible: visibleStateInCountry.includes(c.countryId),
            isSelected: selectedCountry.includes(c.countryId),
            states: c.states.map(s => ({
                ...s,
                isSelected: selectedState.includes(s.name)
            }))
        };
    });


    const response = {
        isSubcription: user?.isSubcription,
        country: {
            countryList, 
            totalCountries: country.totalCountries
        },
    };

    return response;
}

async function filterStatus(userId){
    const userFilter = await homeFilterRepo.findOne({ userId: userId, isDeleted: 0 });
    if(userFilter && (userFilter?.education.length > 0 || userFilter?.kids.length > 0 || userFilter?.maritalStatus.length > 0 || userFilter?.married.length > 0 || userFilter?.religious.length > 0 || userFilter?.wantKids.length > 0 || userFilter?.countryIds.length > 0 || userFilter?.itsVerified || userFilter?.heightRange)){
        return true;
    }else if(userFilter && userFilter?.ageRange && userFilter?.ageRange !== userFilter?.defaultAgeRange){
        return true;
    }else return false;

}

module.exports = {
    homeFilterData,
    homeFilterQuery,
    homeCountryFilterData,
    filterStatus
};