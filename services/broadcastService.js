const moment = require('moment');
const {heightToInches} = require('../helpers/commonFunctions')
module.exports.filterList = async() => {
    const filterList = [
        {'Age':[
            {name: '18-30 year', value: '18-30' },
            {name: '31-40 year', value: '31-40' },
            {name: '41-50 year', value: '41-50'},
            {name: '51-60 year', value: '51-60' },
            {name: '61 above',   value: '61 above' },
            ]
        },
        {'Location':[]},
        {'Marital Status':[
            {name: 'Never married',value: 'Never married'},
            {name: 'Divorced', value: 'Divorced'},
            {name: 'Widowed', value:'Widowed'}, 
            {name: 'Prefer not to say', value: 'Prefer not to say'}]},
        {'Height': [
            {name: '4” - 5”', value: '4-5'}, 
            {name: '5” 1’ - 5” 5', value: '5.1-5.5'},
            {name: '5” 6’ - 6”', value: '5.6-6'},
            {name: '6” 1’ - 6” 5’', value: '6.1-6.5'},
            {name: '6” 6’ - 7”', value: '6.6-7'},
            {name: '7” above', value: '7 above'},
        ]},
        {
            "Religious": [
                {name: 'Not Practicing',value:'Not Practicing'},
                {name: 'Moderately Practicing',value:'Moderately Practicing'},
                {name: 'Practicing',value:'Practicing'},
                {name: 'Very Practicing',value:'Very Practicing'},
                {name: 'Prefer not to say',value:'Prefer not to say'},

            ]
        },
        {
            "Looking to get married": [
                {name: '0-2 years (Jaldi che)',value:'0-2 years (Jaldi che)'},
                {name: '2-4 years (Time che)',value:'2-4 years (Time che)'},
                {name: 'Not sure (Khabar nathi)',value:'Not sure (Khabar nathi)'},
            ]
        },
        {
            "Have kids": [
                {name: 'Yes',value:'Yes'},
                {name: 'No',value:'No'},
                {name: 'Prefer not to say',value:'Prefer not to say'},
            ]
        },
        {
            "Want kids": [
                {name: 'Yes',value:'Yes'},
                {name: 'No',value:'No'},
                {name: 'Prefer not to say',value:'Prefer not to say'},
            ]
        }
    ]
    return filterList;
}



module.exports.filterCondition = async (filter) => {

  const where = { $and: [] };
  if (!filter) return where;

  const handleArrayFilter = (key, field) => {

    const arr = filter[key]?.split(',').map(x => x.trim()).filter(Boolean);

    if (arr.length) where.$and.push({ [field]: { $in: arr } });

    
    
  };

  const handleRangeFilter = (key, field, converter) => {
    const ranges = filter[key]?.split(',').map(x => x.trim()).filter(Boolean);
    if (!ranges?.length) return;

    const conditions = ranges.map(range => {
      if (range.includes('-')) {
        const [min, max] = range.split('-').map(converter);
        return { [field]: { $lte: min, $gte: max } };
      } else if (range.includes('above')) {
        const min = parseInt(range, 10);
        return { [field]: { $lte: converter(min) } };
      }
    }).filter(Boolean);

    if (conditions.length) {
      where.$and.push({ $or: conditions });
    }
  };

  for (const key of Object.keys(filter)) {
    switch (key) {
      case 'Age':
        handleRangeFilter(key, 'dateOfBirth', years => moment.utc().subtract(years, 'years').toDate());
        break;
      case 'Height':
        handleRangeFilter(key, 'heightInInches', val => heightToInches(val));
        break;
      case 'Location':
        handleArrayFilter(key, 'state');
        break;
      case 'Marital Status':
        handleArrayFilter(key, 'maritalStatus');
        break;
      case 'Religious':
        handleArrayFilter(key, 'religious');
        break;
      case 'Looking to get married':
        handleArrayFilter(key, 'married');
        break;
      case 'Have kids':
        handleArrayFilter(key, 'kids');
        break;
      case 'Want kids':
        handleArrayFilter(key, 'wantKids');
        break;
      default:
        break;
    }
  }

  return where;
};
