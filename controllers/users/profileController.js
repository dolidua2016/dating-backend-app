/*!
 * commonController.js
 * Containing all the controller actions related to `User`
 * Author: Doli Dua
 * Date: 2th Dec, 2024`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const userRepo = require('../../repositories/userRepo');
const countriesRepo = require('../../repositories/countriesRepo');
const stateRepo = require('../../repositories/stateRepo');
const userPictureRepo = require('../../repositories/userPictureRepo');
const aboutSuggestionsRepo = require('../../repositories/aboutSuggestionsRepo');
const wrapItUpRepo = require('../../repositories/wrapItUpRepo');
const userWrapItUpRepo = require('../../repositories/userWrapItUpRepo');
const interestRepo = require('../../repositories/interestRepo');
const userInterestRepo = require('../../repositories/userInterestRepo');
const personalityTraitRepo = require('../../repositories/personalityTraitsRepo');
const userPersonalityTraitsRepo = require('../../repositories/userPersonalityTraitRepo');
const questionRepo = require('../../repositories/questionRepo')
const userQuestionAnswersRepo = require('../../repositories/userQuestionAnswerRepo')
const saftyTipsRepo = require('../../repositories/saftyTipsRepo');
const userPersonalityTraitRepo = require('../../repositories/userPersonalityTraitRepo');
const userPassesRepo = require("../../repositories/userPassesRepo");
const userFavoritesRepo = require("../../repositories/userFavoritesRepo");
const userLikeRepo = require("../../repositories/userLikeRepo");
const userBlockRepo = require("../../repositories/userBlockRepo");
const userReportRepo = require("../../repositories/userReportRepo");
const userImageReportRepo = require('../../repositories/userImageReportRepo');
const inboxRepo = require('../../repositories/inboxRepo');
const userAccountDeleteReason = require('../../repositories/userAccountDeleteReasonRepo');
//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages')

// ################################ Helper ################################ //
const { sendPushNotificationsForSingleUser } = require('../../helpers/notificationFunctions');
const { notifyMatch, heightToInches } = require('../../helpers/commonFunctions');
const { userValidated } = require('../../helpers/userValidateFunctions');
const {forgotPasswordEmailTamplate, deleteAccountEmailTemplate} = require('../../helpers/emailTamplateFunction');

// ################################ Service #######################################//
const {
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
    
} = require('../../services/userProfileService');
const { updateProfileNotification } = require('../../services/notificationService');

const {imageVerfication , selfieImageVerificationNotification, profileImageVerfication} = require('../../services/aiService');
const {ensureStateExists} = require('../../services/authService')
const {handleMetrics} = require('../../services/UserFeedMetricsV2Service');

//################################# Npm Package #################################//
require("dotenv").config();
const mongoose = require('mongoose');
const cron = require('node-cron');
const moment = require('moment');
const {response} = require("express");
const deleteReasonsRepo = require('../../repositories/deleteReasonRepo')


/*
|------------------------------------------------ 
| API name          :  basicDetailsAdd
| Response          :  Respective response message in JSON format
| Logic             :  Add Basic Details
| Request URL       :  BASE_URL/api/add-basic-information
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Controller for add Basic details
 * @author Doli Dua
 * @param {Request} req
 * @param {Response} res
 */
module.exports.basicDetailsAdd = (req, res) => {
    (async () => {
        let purpose = "User Basic Details Add or Update";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            const updateData = {};
            let response;

            const monthArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

            // Find User
            let findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            // Validate User
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message, //There was a typo in message word
                    data: {},
                    purpose: purpose
                });
            }

            // Handle updates
            response = await handleNameUpdate(body, findUser, updateData, response);
            response = await handleDobUpdate(body, findUser, updateData, response, monthArray);

            response = await handleEmailUpdate(res, body, findUser, updateData, response, userId);
            response = await handlePhoneUpdate(res, body, findUser, updateData, response, userId);
            console.log(response, 'response')
            if (response !== undefined) {
                await userRepo.update({ _id: userId }, updateData);
                return res.send({
                    status: 200,
                    msg: response,
                    data: {},
                    purpose: purpose
                })
            }

        }
        catch (err) {
            console.log("User Login Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  fetchBasicDetails
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Basic Details
| Request URL       :  BASE_URL/api/get-basic-details
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * @description Controller to get Basic Details of the user
 * @param {Request} req
 * @param {Response} res
 * @author Doli Dua
 * @since 1.0.0
 * @version 1.0.0
 */
module.exports.fetchBasicDetails = (req, res) => {
    (async () => {
        let purpose = "User Basic Details";
        try {
            let userId = req.headers.userId;

            const monthArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            // Find User Details
            let findUser = await userRepo.findBasicDetails({ _id: userId });
            if (!findUser) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose: purpose
                });
            }

            // add Day, Month and Year separately to the userDetails for App end requirements In DB DOB are saved in [Month-Day-Year] format
            const dateOfBirth = findUser?.dob?.split('/') || [];
            findUser.day = dateOfBirth[1] || '0';
            findUser.year = dateOfBirth[2] || '0';
            findUser.month = monthArray[parseInt(dateOfBirth[0], 10) - 1] || '';
            findUser.stateId = findUser?.stateId || {};

            // Remove sensitive or unnecessary fields
            const fieldsToRemove = [
                "accessToken", "token", "isDeleted", "createdAt",
                "updatedAt", "deviceType", "otp", "otpExpireTime"
            ];
            fieldsToRemove.forEach(field => delete findUser[field]);

            // Construct the Metadata of User like gender to I am A and Looking for data with the Gender type
            const whoAreYouData = {
                iAmA: ['Male', 'Female'],
                lookingFor: ['Male', 'Female']
            }

            return res.send({
                status: 200,
                msg: responseMessages.fetchBasicDetials,
                data: findUser,
                metadata: whoAreYouData,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("User Basic Details Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  adressAdd
| Response          :  Respective response message in JSON format
| Logic             :  Adress Added
| Request URL       :  BASE_URL/api/add-address
| Request method    :  PUT
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Address add controller
 * @param {Request} req
 * @param {Response} res
 */
module.exports.adressAdd = (req, res) => {
    (async () => {
        let purpose = "Address Added";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            let updateData = { city: body.city };
            let findState;

            // Get the user basic details
            const findUser = await userRepo.findBasicDetails({ _id: userId });
            // Validate the user
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            // Find out the country by using user given country
            const findCountry = (await countriesRepo.findAll({
                countryName: {'$regex': body.country},
                isActived: 1
            })).map(m => {
                if ((m.countryName).toLowerCase() === (body.country).toLowerCase()) {
                    return {...m};
                }
                return null; // Return null if no match
            }).filter(Boolean); // Remove null values from the result

            // After finding the country find state
            if (findCountry.length > 0) {
                updateData.countryId = findCountry[0]._id;
                findState = (await stateRepo.findAll({
                    stateName: {'$regex': body.state},
                    isActived: 1,
                    countryId: updateData.countryId
                })).map(m => {
                    if ((m.stateName).toLowerCase() === (body.state).toLowerCase()) {
                        return {...m};
                    }
                    return null; // Return null if no match
                }).filter(Boolean); // Remove null values from the result

                if (findState.length > 0) updateData.stateId = findState[0]._id
            }


            // Now update the User details with the updated one
            await userRepo.update({ _id: userId }, updateData);
            updateProfileNotification(findUser)

            return res.send({
                status: 200,
                msg: responseMessages.addressAddSuccess,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Address Added Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------ 
| API name          :  addWhoAreYou
| Response          :  Respective response message in JSON format
| Logic             :  Add Who Are You And Looking For
| Request URL       :  BASE_URL/api/add-who-are-you
| Request method    :  PUT
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Add And update Who are You
 * @param {Request} req
 * @param {Response} res
 * @author Doli Dua
 * @since 1.0.0
 * @version 1.0.0
 */
module.exports.addWhoAreYou = (req, res) => {
    (async () => {
        let purpose = "Add Who Are You";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            // Find user and check user is non-deleted
            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const monthArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            // Generate Update data using user requested body
            // In that object there is an check that, If User change  the gender to male then its automatically swich the privacy lock to False
            let updateData = {
                gender: body.gender,
                lookingFor: body.lookingFor,
                ...(body.gender === 'Male' && findUser?.privacyLocked === 1 ? {privacyLocked: 0} : {}),
            }

            // If a user doesn't add gender, then user steps updated to step 4
            if (findUser.gender == '' || findUser.lookingFor == '') updateData.steps = 4;

            // Update the User details with new adds
            await userRepo.update({ _id: userId }, updateData)

            // Again find user
            const findUsers = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const dateOfBirth = findUsers?.dob?.split('/') || [];
            findUsers.day = dateOfBirth[1] || '0';
            findUsers.year = dateOfBirth[2] || '0';
            findUsers.month = monthArray[parseInt(dateOfBirth[0], 10) - 1] || '';
            findUsers.stateId = findUsers?.stateId || {};

            // Remove sensitive or unnecessary fields
            const fieldsToRemove = [
                "accessToken", "token", "isDeleted", "createdAt",
                "updatedAt", "deviceType", "otp", "otpExpireTime"
            ];
            fieldsToRemove.forEach(field => delete findUsers[field]);
            // Send Profile update notification to Mathed persons
            updateProfileNotification(findUser)

            return res.send({
                status: 200,
                msg: responseMessages.whoAreYouAddSuccess,
                data: findUsers,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Add Who Are You Added Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  fetchWrapItUpList
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Wrap It Up List 
| Request URL       :  BASE_URL/api/fetch-wrap-it-up-list
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Controller for fetching User Wrap it up details
 * @param {Request} req
 * @param {Response} res
 * @author Doli Dua
 * @since 1.0.0
 * @version 1.0.0
 */
module.exports.fetchWrapItUpList = (req, res) => {
    (async () => {
        let purpose = "Fetch Wrap It Up List";
        try {
            let userId = req.headers.userId;
            // get user details
            let findUser = await userRepo.findBasicDetails({ _id: userId });
            if (!findUser) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose: purpose
                });
            }

            // Fetch the User Wrap it Ups and All wrapItUps
            const [findUserWrapItUp, fetchAllWrapItUp] = await Promise.all([
                userWrapItUpRepo.findAll({userId, isActived: 1, isDeleted: 0}),
                wrapItUpRepo.findAll({isActived: 1, isDeleted: 0})
            ]);

            // Result of User WrapItUp details. If User Selected some items or not also include here
            const result = matchAndMarkSave(fetchAllWrapItUp, findUserWrapItUp);
            // Add Height and profession Of the user for the response
            const basicData = {
                height: findUser?.height ?? '',
                profession: findUser?.profession ?? ''
            }

            return res.send({
                status: 200,
                msg: "Wrap it up list fetched successfully",
                data: { basicData: basicData, wrapItUpList: result },
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Wrap it up list fetched Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  AddWrapItUpList
| Response          :  Respective response message in JSON format
| Logic             :  Add Wrap It Up List 
| Request URL       :  BASE_URL/api/update-wrap-it-up
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/
/**
 * Controller: User choose or add/remove their WrapItUp details
 * @param {Request} req
 * @param {Response} res
 * @constructor
 */
module.exports.AddWrapItUpList = (req, res) => {
    (async () => {
        const purpose = "Add Wrap It Up";
        try {
            const userId = req.headers.userId;
            const body = req.body;

            const [findAllUserWrapItUpData, findUser] = await Promise.all([
                userWrapItUpRepo.findAll({ userId, isDeleted: 0 }),
                userRepo.findOne({ _id: userId, isDeleted: 0 })
            ]);

            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose
                });
            }

            const wrapItUpQuestionId = body.wrapItUpAnswerArray.map(m => m.wrapItUpQuestionId);
            console.log(body.wrapItUpAnswerArray,'body.wrapItUpAnswerArray====')
            // Insert or update answers
            await upsertWrapItUpAnswers(userId, body.wrapItUpAnswerArray);

            // Soft delete removed ones
            await userWrapItUpRepo.updateMany(
                { userId, WrapItUpId: { $nin: wrapItUpQuestionId }, isDeleted: 0 },
                { isDeleted: 1 }
            );

            const updateData = {
                height: body.height,
                heightInInches: heightToInches(body.height),
                profession: body.profession
            };

            const [findUserWrapItUp, fetchAllWrapItUp] = await Promise.all([
                userWrapItUpRepo.findAll({ userId, isActived: 1, isDeleted: 0 }),
                wrapItUpRepo.findAll({ isActived: 1, isDeleted: 0 })
            ]);

            const result = matchAndMarkSave(fetchAllWrapItUp, findUserWrapItUp);

            extractUserUpdates(result, updateData);

            if (findAllUserWrapItUpData.length === 0) {
                updateData.steps = 5;
            }

            await userRepo.update({ _id: userId }, updateData);
            updateProfileNotification(findUser);

            return res.send({
                status: 200,
                msg: responseMessages.addWrapItUpSuccess,
                data: { result },
                purpose
            });
        } catch (err) {
            console.log("Add Wrap It Up Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose
            });
        }
    })();
};


/*
|------------------------------------------------ 
| API name          :  uploadPhotos
| Response          :  Respective response message in JSON format
| Logic             :  Upload Photos 
| Request URL       :  BASE_URL/api/photos-upload
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.uploadPhotos = (req, res) => {
    (async () => {
        let purpose = "Update Photos";
        try {
            let profileImage = '';
            let images = [];
            if (req.files !== undefined) {
                let files = JSON.parse(JSON.stringify(req.files));
                for (const value of Object.values(files)) {
                    console.log(value, 'value')
                    profileImage = `${global.constants.photos_url}/${value.filename}`;
                    images.push({
                        withBaseUrl: process.env.HOST_URL + profileImage,
                        withoutBasedUrl: profileImage
                    });
                    console.log(images, 'images')
                }
            }

            return res.send({
                status: 200,
                msg: responseMessages.photosUpdate,
                data: images,
                purpose: purpose
            });

        } catch (err) {
            console.log("Update Photos ERROR : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            });
        }
    })();
};


// const fs = require('fs');
// const path = require('path');

// module.exports.uploadPhotos = async (req, res) => {
//     let purpose = "Update Photos";
//     try {
//         let images = [];

//         if (req.files && Object.keys(req.files).length > 0) {
//             const files = Object.values(req.files);

//             for (const value of files) {
//                 const filePath = path.join('uploads/photos', value.filename);

//                 // 🔹 Wait until file fully written
//                 await new Promise(resolve => setTimeout(resolve, 1500));

//                 // 🔹 Check that file is accessible
//                 if (!fs.existsSync(filePath)) {
//                     console.warn(`⚠️ File not ready yet: ${filePath}`);
//                     continue;
//                 }

//                 const profileImage = `${global.constants.photos_url}/${value.filename}`;

//                 images.push({
//                     withBaseUrl: process.env.HOST_URL + profileImage,
//                     withoutBasedUrl: profileImage
//                 });
//             }
//         }
//         console.log(images,'images')
//         // ✅ Only respond after ensuring files are written
//         return res.status(200).send({
//             status: 200,
//             msg: responseMessages.photosUpdate,
//             data: images,
//             purpose
//         });

//     } catch (err) {
//         console.error("❌ Update Photos ERROR:", err);
//         return res.status(500).send({
//             status: 500,
//             msg: responseMessages.serverError,
//             data: {},
//             purpose
//         });
//     }
// };


/*
|------------------------------------------------ 
| API name          :  addPhotos
| Response          :  Respective response message in JSON format
| Logic             :  Add Photos 
| Request URL       :  BASE_URL/api/add-photos
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.addPhotos = (req, res) => {
    (async () => {
        let purpose = "Add Photos";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            let {privacyLocked} = req.body; //! Change to destructure
            let photos = body.photos;
            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const indexId = body.photos.map(m => m.index);
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            if(findUser?.gender === 'Male' && body?.privacyLocked === 1){
                return res.send({
                    status: 422,
                    msg: "Privacy lock can't set for Male",
                    data: {},
                    purpose: purpose
                })
            }

            if(body.imageVerificationStatus === 'error' || (body.photos.some(pic => pic?.imageVerificationStatus === 'error'))){
                 return res.send({
                        status: 404,
                        msg: 'Please change error images',
                        data: {},
                        purpose: purpose
                    })
            }
            
           // if (photos) {

                if (photos.length < 1) {
                    return res.send({
                        status: 404,
                        msg: responseMessages.photosAddMinimum,
                        data: {},
                        purpose: purpose
                    })
                }


                for (let photo of photos) {
                    let data = {
                        userId: userId,
                        index: photo.index,
                        image: photo.image,
                        imageVerificationStatus: photo.imageVerificationStatus || 'notStarted'
                    }
                    let findPhotos = await userPictureRepo.findOne({ userId: userId, index: photo.index, isDeleted: 0 });
                    if (findPhotos) {
                        await userPictureRepo.update({ _id: findPhotos._id }, { image: photo.image, imageVerificationStatus: photo.imageVerificationStatus || 'notStarted' });
                    }
                    else await userPictureRepo.create(data);

                    await userImageReportRepo.update({type: 'picture', userId: userId,isDeleted: 0, }, {isDeleted: 1})

                }
                await userRepo.update({ _id: userId }, { profileImage: body.profileImage, imageVerificationStatus: body.imageVerificationStatus, privacyLocked: privacyLocked })
                await userPictureRepo.updateMany({ userId: userId, index: { $nin: indexId }, isDeleted: 0 }, { isDeleted: 1 });
           

            if (findUser.profileImage == '') {
                await userRepo.update({ _id: userId }, { steps: 6 })
            }

            updateProfileNotification(findUser);
             
            let imageData = {};

            if(findUser.steps >= 11){
                
                await imageVerfication(photos, userId,body.profileImage, body?.imageVerificationStatus);
                let userDetails = await userRepo.findOne({ _id: userId, isDeleted: 0, isActived: 1 });
                let userPictures = await userPictureRepo.findAllWithImage({ userId: mongoose.Types.ObjectId.createFromHexString(userId), isDeleted: 0 });
                updateUserProfileVisibleStatus(userDetails, userPictures)
                imageData = {
                       // profileImage: userDetails?.profileImage ? `${process.env.HOST_URL}${ userDetails?.profileImage}` : "",
                        imageVerificationStatus: userDetails?.imageVerificationStatus || 'notStarted',
                        photos: userPictures,
                        photoSuggesions :[
                                    {
                                        title: "No sunglasses",
                                        description: "Remember, your face is the main attraction here! Sunglasses are for the beach, not for hiding who you are. Show us those eyes!"
                                    },
                                    {
                                        title: "Keep it Real, Not Reel",
                                        description: "Sure, that time you swam with sharks was epic! But let's keep the Photoshopping to a minimum. Be real, be you."
                                    },
                                    {
                                        title: "Let's Keep It PG-13",
                                        description: `This is a "find love" app, not a "find trouble" app. So let's keep things classy - you'll thank us later.`
                                    },
                                    {
                                        title: "Group Shots Galore? Maybe Not",
                                        description: `Your match wants to see you, not your entire thaal-sharing squad.` //`If we need to play "Where's Waldo" to find you in the picture, try a solo shot. It's not about the gang, it's about you!`
                                    },
                                    {
                                        title: "Mirror Selfies, Sparingly",
                                        description: `They're classic, but not too many, please. And double-check that there are no toothpaste stains on the mirror - it's the little things.`
                                    }
                    ]
                    }
           
            }else{
                imageVerfication(photos, userId,body.profileImage, body?.imageVerificationStatus);
            }

            
            return res.send({
                status: 200,
                msg: responseMessages.photosAddSuccess,
                data: { profileImage: process.env.HOST_URL + body.profileImage, ...imageData },
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Add Photos Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  photosList
| Response          :  Respective response message in JSON format
| Logic             :  Photos List
| Request URL       :  BASE_URL/api/photos
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/
module.exports.listPhotos = (req, res) => {
    (async () => {
        let purpose = "Photos List";
        try {
            let userId = req.headers.userId;
            let userDetails = await userRepo.findOne({ _id: userId, isDeleted: 0, isActived: 1 });
            let userPictures = await userPictureRepo.findAllWithImage({ userId: mongoose.Types.ObjectId.createFromHexString(userId), isDeleted: 0 });
            let photoSuggesions = [
                {
                    title: "No sunglasses",
                    description: "Remember, your face is the main attraction here! Sunglasses are for the beach, not for hiding who you are. Show us those eyes!"
                },
                {
                    title: "Keep it Real, Not Reel",
                    description: "Sure, that time you swam with sharks was epic! But let's keep the Photoshopping to a minimum. Be real, be you."
                },
                {
                    title: "Let's Keep It PG-13",
                    description: `This is a "find love" app, not a "find trouble" app. So let's keep things classy - you'll thank us later.`
                },
                {
                    title: "Group Shots Galore? Maybe Not",
                    description: `Your match wants to see you, not your entire thaal-sharing squad.` //`If we need to play "Where's Waldo" to find you in the picture, try a solo shot. It's not about the gang, it's about you!`
                },
                {
                    title: "Mirror Selfies, Sparingly",
                    description: `They're classic, but not too many, please. And double-check that there are no toothpaste stains on the mirror - it's the little things.`
                }
            ]

            updateUserProfileVisibleStatus(userDetails, userPictures)

            return res.send({
                status: 200,
                msg: responseMessages.photosListSuccess,
                data: {
                    profileImage: userDetails?.profileImage ? `${process.env.HOST_URL}${userDetails?.profileImage}` : "",
                    imageVerificationStatus: userDetails?.imageVerificationStatus || 'notStarted',
                    photos: userPictures,
                    photoSuggesions: photoSuggesions,
                    privacyLocked: userDetails?.privacyLocked || 0,
                    gender: userDetails?.gender
                },
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Photos List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  addAbout
| Response          :  Respective response message in JSON format
| Logic             :  Add About 
| Request URL       :  BASE_URL/api/add-about
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.addAbout = (req, res) => {
    (async () => {
        let purpose = "Add About Description";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });

            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }
            let update = { about: body.description }
            if (findUser.about == '') update.steps = 9
            await userRepo.update({ _id: userId }, update)

            updateProfileNotification(findUser)
            return res.send({
                status: 200,
                msg: responseMessages.aboutAddSuccess,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Add About Description Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  aboutFetch
| Response          :  Respective response message in JSON format
| Logic             :  About Fetch 
| Request URL       :  BASE_URL/api/fetch-about
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.aboutFetch = (req, res) => {
    (async () => {
        let purpose = "Fetch About";
        try {
            let userId = req.headers.userId;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            let aboutSuggestions = await aboutSuggestionsRepo.findAll({ isDeleted: 0 })

            return res.send({
                status: 200,
                msg: responseMessages.fetchAboutSuggestions,
                data: {
                    aboutDescription: findUser ? findUser?.about : "",
                    suggestions: aboutSuggestions
                },
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Fetch About Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------ 
| API name          :  fetchQuestions
| Response          :  Respective response message in JSON format
| Logic             :  Fetch Questions List
| Request URL       :  BASE_URL/api/fetch-questions
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.fetchQuestions = (req, res) => {
    (async () => {
        let purpose = "Fetch Questions";
        try {
            let userId = req.headers.userId;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });

            if (!findUser) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose: purpose
                });
            }

            let questionsList = await questionRepo.findAllWithAnswers({ isDeleted: 0, isActived: 1 }, { userID: userId })

            let list = [];
            questionsList.forEach(element => {
                list.push({
                    _id: element?._id,
                    question: element?.question,
                    placeholder: element.placeholder,
                    answer: element?.answer_details?.answer ?? ''
                })
            })

            return res.send({
                status: 200,
                msg: responseMessages.fetchquestions,
                data: list,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Fetch Questions Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  addQuestionsAnswers
| Response          :  Respective response message in JSON format
| Logic             :  Add Questions Answers
| Request URL       :  BASE_URL/api/add-questions-answers
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.addQuestionsAnswers = (req, res) => {
    (async () => {
        const purpose = "Add Questions Answers";
        try {
            const userId = req.headers.userId;
            const body = req.body;
            const answers = body.answers;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose
                });
            }

            const findAllUserQuestionAnswer = await userQuestionAnswersRepo.findAll({
                userId,
                isActived: 1,
                isDeleted: 0
            });

            if (body.type === "add") {
                await processAnswers(userId, answers);
            }

            const shouldUpdateSteps =
                (findAllUserQuestionAnswer?.length === 0 || body.type === "skip") &&
                findUser.steps < 10;

            if (shouldUpdateSteps) {
                await userRepo.update({ _id: userId }, { steps: 10 });
            }

            updateProfileNotification(findUser);

            return res.send({
                status: 200,
                msg: responseMessages.addAnswersSuccess,
                data: {},
                purpose
            });
        } catch (err) {
            console.log("Add Questions Answers Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose
            });
        }
    })();
};


/*
|------------------------------------------------ 
| API name          :  userInterestList
| Response          :  Respective response message in JSON format
| Logic             :  User Interest List
| Request URL       :  BASE_URL/api/user-interest-list
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.userInterestList = (req, res) => {
    (async () => {
        let purpose = "User Interest List";
        try {
            let userId = req.headers.userId;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });

            if (!findUser) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose: purpose
                });
            }


            const [interestList, userInterestList] = await Promise.all([
                interestRepo.findAll({ isDeleted: 0, isActived: 1 }),
                userInterestRepo.findAll({ isDeleted: 0, isActived: 1, userId: userId })
            ]);

            const result = matchAndMarkInterestSave(interestList, userInterestList);



            return res.send({
                status: 200,
                msg: responseMessages.interestList,
                data: result, userInterestList,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("User Interest List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  userInterestAdd
| Response          :  Respective response message in JSON format
| Logic             :  Add User Interest
| Request URL       :  BASE_URL/api/user-interest-add
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.userInterestAdd = (req, res) => {
    (async () => {
        let purpose = "User Interest Add";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            let interest = body.interest;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });

            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            let findAllUserInterest = await userInterestRepo.findAll({ userId: userId, isDeleted: 0, isActived: 1 });
            let interestId = findAllUserInterest.map(m => m.interestId);
            let bodyInterestId = interest.map(m => m.interestId);
            let deletedAddedId = interestId.filter(f => !bodyInterestId.includes(f));
            let uniqueInterestId = bodyInterestId.filter(f => !interestId.includes(f));
            let alreadyInterestId = bodyInterestId.filter(f => interestId.includes(f));



            if (alreadyInterestId.length > 0) {
                alreadyInterestId.forEach(async element => {
                    let bodyTypeId = interest.filter(f => f.interestId === element).flatMap(m => m.typeId);
                    let typeId = findAllUserInterest.filter(f => f.interestId === element).map(m => m.typeId);


                    let uniqueTypeId = bodyTypeId.filter(f => !typeId.includes(f));
                    let deleteTypeId = typeId.filter(f => !bodyTypeId.includes(f));
                    if (uniqueTypeId.length > 0) {
                        let createData = [];
                        uniqueTypeId.forEach(item => {
                            createData.push({
                                userId: userId,
                                interestId: element,
                                typeId: item,
                            });

                        });
                        await userInterestRepo.insertMany(createData);
                    }
                    if (deleteTypeId.length > 0) await userInterestRepo.updateMany({ userId: userId, interestId: element, typeId: { $in: deleteTypeId } }, { isDeleted: '1' });

                })
            }

            if (uniqueInterestId.length > 0) {
                uniqueInterestId.forEach(async element => {
                    let bodyTypeId = interest.filter(f => f.interestId === element).flatMap(m => m.typeId);
                    if (bodyTypeId.length > 0) {
                        let createData = [];
                        bodyTypeId.forEach(item => {
                            createData.push({
                                userId: userId,
                                interestId: element,
                                typeId: item,
                            });

                        });
                        await userInterestRepo.insertMany(createData);
                    }


                })
            }

            if (deletedAddedId.length > 0) {
                await userInterestRepo.updateMany({ userId: userId, interestId: { $in: deletedAddedId } }, { isDeleted: '1' });
            }


            if (findAllUserInterest.length == 0 && findUser.steps < 11) {
                await userRepo.update({ _id: userId }, { steps: 11 })
            }

            updateProfileNotification(findUser)

            return res.send({
                status: 200,
                msg: responseMessages.interestAdd,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("User Interest Add Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  personalityTraitsList
| Response          :  Respective response message in JSON format
| Logic             :  Personality Traits List
| Request URL       :  BASE_URL/api/personality-traits-list
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.personalityTraitsList = (req, res) => {
    (async () => {
        let purpose = "Personality Traits List";
        try {
            let userId = req.headers.userId;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });

            if (!findUser) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose: purpose
                });
            }

            const [personalityTraitsList, userPersonalityTraitsList] = await Promise.all([
                personalityTraitRepo.findAll({ isDeleted: 0, isActived: 1 }),
                userPersonalityTraitsRepo.findAll({ isDeleted: 0, isActived: 1, userId: userId })
            ]);

            const result = matchAndMarkPersonalitySave(personalityTraitsList, userPersonalityTraitsList);

            return res.send({
                status: 200,
                msg: responseMessages.personalityTraitsList,
                data: result,
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Personality Traits List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  personalityTraitsAdd
| Response          :  Respective response message in JSON format
| Logic             :  Add Personality Traits
| Request URL       :  BASE_URL/api/personality-traits-add
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.personalityTraitsAdd = (req, res) => {
    (async () => {
        let purpose = "Personality Traits Add";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            let personality = body.personality;
            let personalityTraitsIds = personality.map(m => m.personalityTraitId);

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });

            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            let findAllUserPersonalityTraits = await userPersonalityTraitsRepo.findAll({ userId: userId, isDeleted: 0, isActived: 1 });
            let userPersonalityTraitsIds = findAllUserPersonalityTraits.map(m => m.personalityTraitId);
            const uniquePersonality = userPersonalityTraitsIds.filter(item => !personalityTraitsIds.includes(item));

            if (uniquePersonality) {
                for (let e of uniquePersonality) {
                    await userPersonalityTraitsRepo.update({ personalityTraitId: e, userId: userId }, { isDeleted: 1 });
                }
            }

            personality.forEach(async element => {
                let createData = {
                    userId: userId,
                    personalityTraitId: element.personalityTraitId,
                    categoryTypesId: element.categoryTypesId,
                    number: element.number
                }
                let findUserPersonalityTraits = await userPersonalityTraitsRepo.findOne({ userId: userId, personalityTraitId: element.personalityTraitId, isDeleted: 0, isActived: 1 });
                if (findUserPersonalityTraits) await userPersonalityTraitsRepo.update({ _id: findUserPersonalityTraits._id, isDeleted: 0 }, { categoryTypesId: element.categoryTypesId, number: element.number })
                else await userPersonalityTraitsRepo.create(createData);
            })

            if (findAllUserPersonalityTraits.length == 0) {
                await userRepo.update({ _id: userId }, { steps: 12 })
            }

            updateProfileNotification(findUser)


            return res.send({
                status: 200,
                msg: responseMessages.personalityTraitsAdd,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Personality Traits Add Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  acceptTerms
| Response          :  Respective response message in JSON format
| Logic             :  Accept Terms
| Request URL       :  BASE_URL/api/accept-terms
| Request method    :  POST
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.acceptTerms = (req, res) => {
    (async () => {
        let purpose = "Accept Terms Add";
        try {
            let userId = req.headers.userId;
            let body = req.body;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            if (body.termAccept == "true") {
                await userRepo.update({ _id: userId }, { steps: 13 });
                handleMetrics({userId, createdAt: findUser.createdAt, lastLogin: findUser.lastLogin, gender: findUser.gender })

                return res.send({
                    status: 200,
                    msg: responseMessages.acceptTerms,
                    data: {},
                    purpose: purpose
                })

            } else {

                return res.send({
                    status: 404,
                    msg: responseMessages.acceptTermsFailed,
                    data: {},
                    purpose: purpose
                })

            }

        }
        catch (err) {
            console.log("Accept Terms Add Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  saftyTipsFetch
| Response          :  Respective response message in JSON format
| Logic             :  Safty Tips Fetch
| Request URL       :  BASE_URL/api/fetch-safety-tips
| Request method    :  GET
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.saftyTipsFetch = (req, res) => {
    (async () => {
        let purpose = "Safety Tips Fetch";
        try {


            let FindAllSaftyTips = await saftyTipsRepo.findAll({ isActived: 1, isDeleted: 0 });
            FindAllSaftyTips = FindAllSaftyTips.map(m => { return { ...m, icon: process.env.HOST_URL + m.icon } })
            return res.send({
                status: 200,
                msg: responseMessages.acceptTerms,
                data: FindAllSaftyTips,
                purpose: purpose
            })



        }
        catch (err) {
            console.log("Safety Tips Fetch Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  logout
| Response          :  Respective response message in JSON format
| Logic             :  Logout User
| Request URL       :  BASE_URL/api/logout
| Request method    :  PUT
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.logout = (req, res) => {
    (async () => {
        let purpose = "Logout User";
        try {
            let userId = req.headers.userId;
            await userRepo.update({ _id: userId }, { accessToken: '', token: '' })

            return res.send({
                status: 200,
                msg: responseMessages.logoutSucess,
                data: {},
                purpose: purpose
            })



        }
        catch (err) {
            console.log("Logout User Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------
| API name          :  reportList
| Response          :  Respective response message in JSON format
| Logic             :  Fetch delete reason list
| Request URL       :  BASE_URL/api/fetch-delete-reason-list
| Request method    :  GET
| Author            :  Pritam Paul
| Date              :  04-Dec-2025
|------------------------------------------------
*/
/**
 * @description Fetch delete reason list
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @Date 04-dec-2025
 * @author Pritam Paul
 */
module.exports.fetchDeleteReasonList = (req, res) => {
    (async () => {
        let purpose = "Fetch Delete reason List";
        try {

            let getAllDeleteReasons = await deleteReasonsRepo.findAll({isDeleted: 0, isActived: 1})

            return res.send({
                status: 200,
                msg: responseMessages.reportFetch,
                data: getAllDeleteReasons,
                purpose: purpose
            })
        } catch (err) {
            console.log("Fetch Report List Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------ 
| API name          :  deleteAccount
| Response          :  Respective response message in JSON format
| Logic             :  Delete Account
| Request URL       :  BASE_URL/api/delete-account
| Request method    :  PUT
| Author            :  DOLI DUA
|------------------------------------------------
*/
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @modifiesOn 04-Dec-2025
 */
module.exports.deleteAccount = (req, res) => {
    (async () => {
        let purpose = "Delete Account";
        try {
            let userId = req.headers.userId;
            let {reason, deleteReasonId} = req.body

            if(!reason || !reason.trim()){
                return res.send({
                    status: 422,
                    msg: "Delete reason is required",
                    data: {},
                    purpose: purpose
                })
            }

            //User Validation
            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            // Save User Account Delete Reasons
            if(deleteReasonId.length > 0){
                for(const id of deleteReasonId){
                    const reasonExists = await userAccountDeleteReason.findOne({userId: userId, deleteReasonId: id,  isDeleted: 0, isActived: 1}); 
                    if(!reasonExists){
                       await userAccountDeleteReason.create({
                            userId: userId,
                            deleteReasonId: id
                       })   
                    }   
                }

            }

            // Delete Account Email Notification to Admin when a user finds a match via FindABohra
            if(deleteReasonId.includes('6931625d058d0b9643879506')){
                 deleteAccountEmailTemplate('dolidua2023@gmail.com','Account Deletion: User Found Someone', findUser);
            }

            // Deactivate and soft delete the user account
            await userRepo.update({_id: userId}, {
                isDeleted: 1,
                isActived: 0,
                deletedBy: 'User',
                deleteReason: reason.trim(),
                deletedAt: new Date()
            })

            return res.send({
                status: 200,
                msg: responseMessages.deleteAccountSucess,
                data: {},
                purpose: purpose
            })



        }
        catch (err) {
            console.log("Delete Account Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------
| API name          :  deactivate account
| Response          :  Respective response message in JSON format
| Logic             :  deactivate Account
| Request URL       :  BASE_URL/api/deactivate-account
| Request method    :  POST
| Author            :  PRITAM PAUL
|------------------------------------------------
*/
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @date 04-dec-2025
 * @routes BASE_URL/api/deactivate-user
 * @httpMethod POST
 * @author Pritam Paul
 * @description This is for Deactivate the user account from their own
 */
module.exports.deactivateAccount = (req,res)=>{
    (async () => {
        let purpose = "Activate or Deactivate Account";
        try {
            let userId = req.headers.userId;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }
            let update =  {
                deactivateAccount: findUser?.deactivateAccount === 1 ? 0 : 1,
                deactivateAccountAt: null
            }
            
            if(findUser?.deactivateAccount === 0) update.deactivateAccountAt = new Date();
            // Account deactivation data
            await userRepo.update({_id: userId}, update)
            return res.send({
                status: 200,
                msg: findUser?.deactivateAccount === 1 ? responseMessages.activationSuccess :responseMessages.deactivationSuccess,
                data: {...update},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("Deactivate/Activate Account Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------
| API name          :  privacy-lock
| Response          :  Respective response message in JSON format
| Logic             :  Privacy Lock
| Request URL       :  BASE_URL/api/privacy-lock
| Request method    :  POST
| Author            :  PRITAM PAUL
|------------------------------------------------
*/
/** ✅
 * @description This API will help to Lock the privacy of a Profile [Only for female]
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @date 05-dec-2025
 * @routes BASE_URL/api/privacy-lock
 * @httpMethod POST
 * @author Pritam Paul
 */
module.exports.privacyLockOnAccount = (req,res)=>{
    (async () => {
        let purpose = "Privacy Lock";
        try {
            let userId = req.headers.userId;

            const findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const validate = await userValidated(findUser);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }

            //? Check The account is owned by male or female. If Female then ok
            if(findUser.gender !== 'Female'){
                return res.send({
                    status: 422,
                    msg: responseMessages.privacyLockedFailed,
                    data: {},
                    purpose: purpose
                })
            }

            console.log("Find user data ==============================",findUser);
            let update = {privacyLocked: findUser?.privacyLocked === 1 ? 0 : 1}
            
            // Account Privacy Locked
            await userRepo.update(
                {_id: userId, gender: {$eq: 'Female'}},
                update
            )

            return res.send({
                status: 200,
                msg: findUser?.privacyLocked === 1 ? responseMessages.privacyUnlockedSuccess :responseMessages.privacyLockedSuccess,
                data: {},
                purpose: purpose
            })
        }
        catch (err) {
            console.log("PRIVACY LOCK & UNLOCK Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  profileDetailsFetch
| Response          :  Respective response message in JSON format
| Logic             :  Profile Details Fetch
| Request URL       :  BASE_URL/api/fetch-profile-details
| Request method    :  GET
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.profileDetailsFetch = (req, res) => {
    (async () => {
        const purpose = "Fetch Profile Details";
        try {
            const userId = req.headers.userId;
            const userDetails = await userRepo.profileDetails({
                _id: mongoose.Types.ObjectId.createFromHexString(userId)
            });

            if (!userDetails?.length) {
                return res.send({
                    status: 404,
                    msg: "User not found",
                    data: {},
                    purpose
                });
            }

            const countries = userDetails[0].countryId ? await countriesRepo.findOne({ _id: userDetails[0].countryId }) : null;

            const whoAreYouData = {
                iAmA: ["Male", "Female"],
                lookingFor: ["Male", "Female"],
            };

            const element = userDetails[0];
            const wrapDetails = buildWrapDetails(element);

            const details = {
                basicDetails: buildBasicDetails(element, countries, wrapDetails,'myprofile'),
                aboutDetails: element.about,
                profileTextQuestions: { questionAnswers: buildProfileQuestions(element) },
                interestDetails: { userInterestsDetails: buildInterests(element) },
                personalityTraitsDetails: { userPersonalityTraitsDetails: buildPersonalityTraits(element) },
                gallery: buildGallery(element),
            };

            return res.send({
                status: 200,
                msg: responseMessages.profileDetails,
                data: details,
                whoAreYouData,
                userDetails,
                purpose
            });

        } catch (err) {
            console.log("Fetch Profile Details Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: "Fetch Profile Details"
            });
        }
    })();
};


/*
|------------------------------------------------ 
| API name          :  profileUpdate
| Response          :  Respective response message in JSON format
| Logic             :  Profile Update
| Request URL       :  BASE_URL/api/update-profile
| Request method    :  PUT
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.profileUpdate = (req, res) => {
    (async () => {
        let purpose = "Profile Update";
        try {
            let userId = req.headers.userId;
            let body = req.body;
            let updateData = {}

            let userDetails = await userRepo.findOne({ _id: userId, isDeleted: 0 });
            const validate = await userValidated(userDetails);
            if (validate.status) {
                return res.send({
                    status: validate.statusCode,
                    msg: validate.message,
                    data: {},
                    purpose: purpose
                });
            }
            let findExitEmail = await userRepo.findOne({ email: body?.email?.toLowerCase(), isDeleted: 0 });
            if(findExitEmail && userDetails?._id !== findExitEmail._id){
            return res.send({
                status: 404,
                msg: 'Email already registered',
                data: {},
                purpose: purpose
            })
        }

            if (body.country && body.address && body.city) {
                const countryDetails = (await countriesRepo.findAll({ countryName: { '$regex': body.country }, isActived: 1 })).map(m => {
                    if ((m.countryName).toLowerCase() === (body.country).toLowerCase()) { return { ...m }; }
                    return null; // Return null if no match
                }).filter(Boolean); // Remove null values from the result

                if (countryDetails.length > 0) {
                    updateData.countryId = countryDetails[0]._id;
                }
                updateData.address = body.address;
               
                if(!countryDetails.length && body.state ){
                      await ensureStateExists(countryDetails[0]?._id, body.state);
                
                  }
            }
            console.log(body,'body=========')
            if (body.long && body.lat) {
                updateData.location = {
                    type: "Point",
                    coordinates: [
                        parseFloat(body.long),
                        parseFloat(body.lat),
                    ],
                };
            }

            if (body.gender) { updateData.gender = body.gender; }
            if (body.lookingFor) { updateData.lookingFor = body.lookingFor; }
            if (body.profileImage) { updateData.profileImage = body.profileImage; }
            if(body.email) { updateData.email = body.email.toLowerCase(); }
            
             updateData.city = body.city;
             updateData.state = body.state;
             
            await userRepo.update({ _id: userId }, updateData);
            let imageData = {}
            
            
             updateProfileNotification(userDetails);
            return res.send({
                status: 200,
                msg: responseMessages.profileUpdate,
                data: imageData,
                purpose: purpose
            })

        }
        catch (err) {
            console.log("Profile Update Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------ 
| API name          :  otherProfileDetailsFetch
| Response          :  Respective response message in JSON format
| Logic             :  Other User Profile Details Fetch
| Request URL       :  BASE_URL/api/fetch-other-profile-details
| Request method    :  GET
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.otherProfileDetailsFetch = (req, res) => {
    (async () => {
        const purpose = "Fetch Profile Details";
        try {
            const userId = req.headers.userId;
            const otherUserId = req.params._id;

             let findUser = await userRepo.findOne({ _id: userId, isDeleted: 0 });

            // TODO:  New add: ----> check User is activated or deactivated ✅
            const userDetails = await userRepo.profileDetails(
                { _id: mongoose.Types.ObjectId.createFromHexString(otherUserId), isDeleted: 0, deactivateAccount: {$ne: 1} },
                { userId: mongoose.Types.ObjectId.createFromHexString(userId) }
            );

            if (!userDetails.length) {
                return res.send({ status: 404, msg: "User details not found", data: {}, purpose });
            }

            const findUserDetails = await userInterestRepo.findAll({ userId, isDeleted: 0 });
            const findUserPersonalityDetails = await userPersonalityTraitRepo.findAll({ userId, isDeleted: 0 });

            const day = 1;
            const twentyFourHoursAgo = new Date(Date.now() - day * 24 * 60 * 60 * 1000);

            const element = userDetails[0];
            let details = {};

            // Report, block, passes, likes
            const [userProfileReport, blockedUser, blockedMe] = await Promise.all([
                userReportRepo.findOne({ toUserId: otherUserId, fromUserId: userId, isDeleted: 0, reportType: "image", reason: element.profileImage }),
                userBlockRepo.findOne({ toUserId: otherUserId, fromUserId: userId, isActived: 1, isDeleted: 0 }),
                userBlockRepo.findOne({ fromUserId: otherUserId, toUserId: userId, isActived: 1, isDeleted: 0 })
            ]);

            // createdAt: { $gte: twentyFourHoursAgo } }
            details.isPassed = !!(await userPassesRepo.findOne({ toUserId: otherUserId, fromUserId: userId, isDeleted: 0, isActived: 1 }));
            details.isLiked = !!(await userLikeRepo.findOne({ toUserId: otherUserId, fromUserId: userId, isDeleted: 0, isActived: 1 }));
            details.isFavourite = !!(await userLikeRepo.findOne({ toUserId: otherUserId, fromUserId: userId, isDeleted: 0, isActived: 1 }));
            details.blocked = !!(blockedUser || blockedMe);
            details.isReport = !!userProfileReport;
            const isMatched = !!(await inboxRepo.findOne({$or:[{firstUserId: mongoose.Types.ObjectId.createFromHexString(userId),secondUserId: mongoose.Types.ObjectId.createFromHexString(otherUserId) }, {firstUserId: mongoose.Types.ObjectId.createFromHexString(otherUserId),secondUserId: mongoose.Types.ObjectId.createFromHexString(userId)}],isActived: 1, isDeleted: 0}))
            //
            // Notification (simplified)
            const notificationMessage = `👀${element?.firstName} ${element?.lastName} just viewed your profile! Check them out.`;
            await notifyMatch(userDetails._id, findUserDetails._id, "userProfile", "Profile View Notification", notificationMessage, findUserDetails._id);
            const countries = userDetails[0].countryId  ? await countriesRepo.findOne({ _id: userDetails[0].countryId }) : null;

            // Build details
            const wrapDetails = await buildWrapDetails(element);
            details.basicDetails = buildBasicDetails(element, countries, wrapDetails,'home')
            details.basicDetails.privacyLocked = (details.basicDetails.privacyLocked === 0 || isMatched) ? 0 : 1;
            details.aboutDetails = element.about;
            details.profileTextQuestions = { questionAnswers: buildProfileQuestions(element) };

            const interests = buildInterests(element);
            const markedInterests = checkAndMarkSave(findUserDetails, interests);
            details.interestDetail = [...new Set(markedInterests.flatMap(c => c.matchedType))]
                .sort((a, b) => b.isSaved - a.isSaved)
                .map(item => ({ ...item, icon: process.env.HOST_URL + item.icon }));

            const personality = buildPersonalityTraits(element);
            details.personalityTraitsDetails = { userPersonalityTraitsDetails: checkPersonalitySave(findUserPersonalityDetails, personality) };

            details.gallery = buildGallery(element);
            details.gallery = details.gallery.filter(fil => fil.imageVerificationStatus === 'completed')
            return res.send({status: 200, msg: responseMessages.profileDetails, data: details,
                 metadata: {
                    deactivateAccount: findUser.deactivateAccount,
                    deactivateAccountAt: findUser.deactivateAccountAt
            }
                , purpose});

        } catch (err) {
            console.log("Fetch Profile Details Error : ", err);
            return res.send({ status: 500, msg: responseMessages.serverError, data: {}, purpose });
        }
    })();
};


/*
|------------------------------------------------ 
| API name          :  getCongratulation
| Response          :  Respective response message in JSON format
| Logic             :  Fetch congratulation data 
| Request URL       :  BASE_URL/api/fetch-congratulation-data
| Request method    :  GET
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.getCongratulation = (req, res) => {
    (async () => {
        let purpose = "Congratulation Data Fetch";
        try {
            const userID = req.headers.userId;

            //const ifScanned = req.query.ifScanned || false;
            const [userDetails, userPictures] = await Promise.all([ 
                userRepo.findOne({ _id: userID, isDeleted: 0 } ),
                userPictureRepo.findAll({ userId: userID, isDeleted: 0 } )
            ]);

            const scanData = checkScanStatus(userDetails, userPictures);
             updateUserProfileVisibleStatus(userDetails, userPictures)
            let data = {
                title: 'You’re in! 💖',
                subTitle: 'Thanks for completing your profile — your FAB journey has officially begun!',
                description: '',
                showIosButton: true,
                showAndroidButton: true,
                scanData
            }

    
                // --- Handle scanData errors ---
                if (
                scanData.picturePageError ||
                scanData.selfiePageError 
                ) {
                 data = {
                    ...data,
                    title: "Image Verification Needed 📸",
                    subTitle: "There’s an issue with your photo.",
                    description: "Please upload a clear, well-lit picture of just your face so we can verify your profile."
                    };
                }

            return res.send({
                status: 200,
                msg: 'Data fetched successfully',
                data: data,
                purpose: purpose
            })

        }
        catch (err) {
            console.log("Congratulation Data Fetch Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  goToHome
| Response          :  Respective response message in JSON format
| Logic             :  Go To Home 
| Request URL       :  BASE_URL/api/go-to-home
| Request method    :  POST
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.goToHome = async (req, res) => {

    let purpose = "Go to home";
    try {
        const userID = req.headers.userId;

        await userRepo.update({ _id: userID, isDeleted: 0 }, { goToHome: true })

        return res.send({
            status: 200,
            msg: 'Update go to home status',
            data: {},
            purpose: purpose
        })

    }
    catch (err) {
        console.log("Go to home Error : ", err);
        return res.send({
            status: 500,
            msg: responseMessages.serverError,
            data: {},
            purpose: purpose
        })
    }
}

/*
|------------------------------------------------ 
| API name          :  emailVerify
| Response          :  Respective response message in JSON format
| Logic             :  Go To Home 
| Request URL       :  BASE_URL/api/go-to-home
| Request method    :  POST
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.emailVerify = async (req, res) => {
    let purpose = "Email Verify";
    try {
        const userID = req.headers.userId;
        const { email } = req.body;
        const userDetails = await userRepo.findOne({ email: email.toLowerCase(), isDeleted: 0 });
        if(userDetails && userID !== userDetails._id){
            return res.send({
                status: 404,
                msg: 'Email already registered',
                data: {},
                purpose: purpose
            })
        }

        // Generate OTP
        const otpValue = Math.floor(100000 + Math.random() * 900000);   // 123456; //
        const otpExpireTime = moment().utc().add(5, "minutes");
       
        await forgotPasswordEmailTamplate(otpValue,email,'We sent you an OTP to your email address' , userDetails?.firstName);
        await userRepo.update({ _id: userID, isDeleted: 0 }, { otpExpireTime: otpExpireTime, otp: otpValue, email: email.toLowerCase(), emailVerified: 0 })  


        return res.send({
            status: 200,
            msg: responseMessages.otpSendMessgae,
            data: {},
            purpose: purpose
        })

    }
    catch (err) {
        console.log("Email Verify Error : ", err);
        return res.send({
            status: 500,
            msg: responseMessages.serverError,
            data: {},
            purpose: purpose
        })
    }
}

/*
|------------------------------------------------ 
| API name          :  verifyEmailOtp
| Response          :  Respective response message in JSON format
| Logic             :  Verify Email OTP
| Request URL       :  BASE_URL/api/verify-email-otp
| Request method    :  POST
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.verifyEmailOtp = (req, res) => {
    (async () => {
        let purpose = "Email OTP Verification";
        try { 
            let body = req.body;
            let TimeNow = moment().utc();
            let findUser = await userRepo.findOne({email: body.email.toLowerCase(), isDeleted: 0});
       
            if(!findUser){ 
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                    purpose: purpose
                })
            }
            if (findUser.otp != body.otp) {
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidOTP,
                    data: {},
                    purpose: purpose
                });
            }
            if (!moment(findUser.otpExpireTime).isSameOrAfter(TimeNow)) {
                return res.send({
                    status: 409,
                    msg: responseMessages.expireCode,
                    data: {},
                    purpose: purpose
                });
            }   
              let updateData = {otp: '', otpExpireTime: '', emailVerified: 1};
              if (findUser.steps < 3 ) updateData.steps = 3;
              await userRepo.update({email: body.email.toLowerCase(), isDeleted: 0},updateData)
              

                return res.send({
                    status: 200,
                    msg: responseMessages.otpVerified,
                    data: {},
                    purpose: purpose
                })
        }
        catch (err) {
            console.log("Email OTP Verification Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------ 
| API name          :  varificationImageFetch
| Response          :  Respective response message in JSON format
| Logic             :  Varification Image Fetch
| Request URL       :  BASE_URL/api/varification-image
| Request method    :  GET
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.varificationImageFetch = (req, res) => {
    (async () => {
        let purpose = "Verification Image Fetch";
        try { 
            let userId = req.headers.userId;
            
            let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
       
            if(!findUser){ 
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                    purpose: purpose
                })
            }
          
            const data = {
                selfieImage: findUser.selfieImage ? process.env.HOST_URL + findUser.selfieImage : '',
                selfieImageWithOutBaseUrl: findUser.selfieImage ? findUser.selfieImage : '',
                selfieImageVerificationStatus: findUser.selfieImageVerificationStatus || 'notStarted',
                ejamaatImage: findUser?.ejamaatImage ? process.env.HOST_URL + findUser?.ejamaatImage : '',
                ejamaatImageWithOutBaseUrl: findUser?.ejamaatImage ? findUser?.ejamaatImage : '',
                ejamaatImageVerificationStatus: findUser.ejamaatImageVerificationStatus || 'notStarted',
                steps: findUser.steps,
                deactivateAccount: findUser.deactivateAccount || 0,
                deactivateAccountAt: findUser.deactivateAccountAt || null,
                privacyLocked: findUser.privacyLocked || 0,
            }

            const metadata = [
                { title: 'No sunglasses', desc: 'Remember, your face is the main attraction here! Sunglasses are for the beach, not for hiding who you are. Show us those eyes!' },
                { title: 'Keep it Real, Not Reel', desc: `Sure, that time you swam with sharks was epic! But let's keep the Photoshopping to a minimum. Be real, be you.` },
            ]

                return res.send({
                    status: 200,
                    msg: responseMessages.fetchVerficationImage,
                    data: data,
                    metadata: metadata,
                    purpose: purpose
                })
        }
        catch (err) {
            console.log("Email OTP Verification Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  varificationImageFetch
| Response          :  Respective response message in JSON format
| Logic             :  Varification Image 
| Request URL       :  BASE_URL/api/varification-image
| Request method    :  GET
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.uploadVerificationImages = (req, res) => {
    (async () => {
        let purpose = "Upload Selfie Verification Image";
        try { 
            let userId = req.headers.userId;

            let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
            
            if(!findUser){ 
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                    purpose: purpose
                })
            }
            let selfieImage = '';
            let selfieImageBaseUrl = '';
            let selfieData = {}
            if (req.file !== undefined) {
                let files = req.file;
               
                    selfieImage = `${global.constants.selfie_image_url}/${files.filename}`;
                    selfieImageBaseUrl = process.env.HOST_URL + selfieImage;
                    let updateData = { selfieImage: selfieImage }
                    if (findUser.steps < 7 && findUser.selfieImage === '') updateData.steps = 7;
                    else if (findUser.steps > 7 && findUser.selfieImage === '') updateData.steps = findUser.steps + 1;

                    if(findUser?.verifyBadge < 1) updateData.verifyBadge = 1;

                    await userRepo.update({ _id: userId, isDeleted: 0 }, updateData);
                    
                    if(findUser.steps >=11 ){
                        await selfieImageVerificationNotification(userId,selfieImage, req.body.selfieImageVerificationStatus)
                        let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
                        selfieData = {
                            selfieImage: findUser.selfieImage ? process.env.HOST_URL + findUser.selfieImage : '',
                            selfieImageWithOutBaseUrl: findUser.selfieImage ? findUser.selfieImage : '',
                            selfieImageVerificationStatus: findUser.selfieImageVerificationStatus || 'notStarted',
                        }
                    
                    }else{
                         selfieImageVerificationNotification(userId,selfieImage, req.body.selfieImageVerificationStatus)
                    }
                  await userImageReportRepo.update({type: 'selfie', userId: userId, isDeleted: 0}, {isDeleted: 1})
                    
            }

                return res.send({
                    status: 200,
                    msg: responseMessages.uploadVerificationImage,
                    data: {selfieImage, selfieImageBaseUrl, selfieData},
                    purpose: purpose
                })
        }
        catch (err) {
            console.log("Upload Selfie Verification Image Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}


/*
|------------------------------------------------ 
| API name          :  uploadEjamaatVerificationImages
| Response          :  Respective response message in JSON format
| Logic             :  Varification e-jamaat Image Fetch
| Request URL       :  BASE_URL/api/varification-image
| Request method    :  GET
| Author            :  DOLI DUA
|------------------------------------------------
*/

module.exports.uploadEjamaatVerificationImages = (req, res) => {
    (async () => {
        let purpose = "Upload E-jamaat Verification Image";
        try { 
            let userId = req.headers.userId;

            let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
            
            if(!findUser){ 
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                    purpose: purpose
                })
            }
            let eJamaatImage = '';
            let eJamaatImageBaseUrl = '';

            if (req.file !== undefined) {
                let files = req.file;
               
                    eJamaatImage = `${global.constants.ejamaat_image_url}/${files.filename}`;
                    eJamaatImageBaseUrl = process.env.HOST_URL + eJamaatImage;
                    let updateData = { ejamaatImage: eJamaatImage , ejamaatImageVerificationStatus: 'notStarted'}
                    if (findUser.steps < 8 && findUser.eJamaatImage === '') updateData.steps = 8;
                    else if (findUser.steps > 8 && findUser.eJamaatImage === '' ) updateData.steps = findUser.steps + 1;

                    // if(findUser?.verifyBadge == 1) updateData.verifyBadge = 2;
                    await userRepo.update({ _id: userId, isDeleted: 0 }, updateData);
                    await userImageReportRepo.update({type: 'ejamaat', userId: userId, isDeleted: 0}, {isDeleted: 1})

            }else{
                 let updateData = {}
                    if (findUser.steps < 7 ) updateData.steps = 7;
                    else if (findUser.steps <= 12 && findUser.steps >=6 ) updateData.steps = findUser.steps + 1;

                    await userRepo.update({ _id: userId, isDeleted: 0 }, updateData);
            }
            

                return res.send({
                    status: 200,
                    msg: responseMessages.uploadVerificationImage,
                    data: {eJamaatImage, eJamaatImageBaseUrl },
                    purpose: purpose
                })
        }
        catch (err) {
            console.log("Email OTP Verification Error : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            })
        }
    })()
}

/*
|------------------------------------------------ 
| API name          :  uploadPhotos
| Response          :  Respective response message in JSON format
| Logic             :  Upload profile iamge 
| Request URL       :  BASE_URL/api/profile-upload
| Request method    :  POST
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.uploadProfileImage = (req, res) => {
    (async () => {
        let purpose = "Update Profile Image";
        try {
            let profileImage = '';
            let images = [];
            const userId = req.headers.userId;

            let findUser = await userRepo.findOne({_id: userId, isDeleted: 0});
            if(!findUser){ 
                return res.send({
                    status: 409,
                    msg: responseMessages.invalidUser,
                    data: {},
                    purpose: purpose
                })
            }

            if (req.files !== undefined) {
                let files = JSON.parse(JSON.stringify(req.files));
                for (const value of Object.values(files)) {
                    profileImage = `${global.constants.photos_url}/${value.filename}`;
                   

                const imageVerificationStatus = await profileImageVerfication([], userId, profileImage, 'notStarted');
                 images.push({
                        withBaseUrl: process.env.HOST_URL + profileImage,
                        withoutBasedUrl: profileImage,
                        imageVerificationStatus: imageVerificationStatus
                    });

                 if(imageVerificationStatus === 'error'){
                    return res.send({
                        status: 409,
                        msg: responseMessages.uploadPhotoError,
                        data: images,
                        purpose: purpose
                    });
                 }
                 return res.send({
                        status: 200,
                        msg: responseMessages.photosUpdate,
                        data: images,
                        purpose: purpose
                 });
                }
            }            
        } catch (err) {
            console.log("Update Photos ERROR : ", err);
            return res.send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose: purpose
            });
        }
    })();
};

