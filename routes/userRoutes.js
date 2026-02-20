const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = require('../helpers/uploadFiles');

let storagePost = multer.diskStorage({
  destination: function (req, file, cb) {
    let fileName = file.originalname.split('.');
    const path = `uploads/${fileName[0]}`;
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `video-${baseName}-${req.headers.userId}-${uniqueSuffix}${ext}`);
    // cb(null, 'video' + Date.now + path.extname(file.originalname))
  },
});

let uploadProfileImage = multer({ storage: storagePost });

/**
 *
 * @copyright ©COPYRIGHT 2025
 * @license MIT
 *
 * @description Configure and setup multer for store Images in the disk
 * @since 1.0.0
 * @version 1.0.0
 *
 */
let storagePictures = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = 'uploads/photos';
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `photos-${baseName}-${req.headers.userId}-${uniqueSuffix}${ext}`);

    // cb(null, 'photos-' + (file.originalname) + '-' + Date.now() + path.extname(file.originalname))
  },
});

/**
 * @description method to take the images and store via multer disc storage
 * @type {import('multer').Multer}
 */
let uploadPicture = multer({ storage: storagePictures });

/**
 * @description Multer Configuration for store the chat images
 * @type {DiskStorage}
 */
let storageChatImage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = 'uploads/chatimages';
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `photos-${baseName}-${req.headers.userId}-${uniqueSuffix}${ext}`);
    //cb(null, 'photos-' + Date.now() + path.extname(file.originalname))
  },
});

/**
 * @description Middleware to take the Chat images and store via Multer storeImage setup
 * @type {import('multer').Multer}
 */
let uploadChatImage = multer({ storage: storageChatImage });

/**
 * @description Multer storage configuration for Store Selfie images
 * @type {import('multer').StorageEngine}
 */
let storageSelfieImage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = 'uploads/selfieimages';
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `photos-${baseName}-${req.headers.userId}-${uniqueSuffix}${ext}`);
    //cb(null, 'photos-' + Date.now() + path.extname(file.originalname))
  },
});

/**
 * @description Middleware to handle Incoming images and store Selfie images via Multer selfieImage Configuration
 * @type {import('multer').Multer}
 */
let uploadSelfieImage = multer({ storage: storageSelfieImage });

/**
 * @description Multer storage Configuration for store Ejamaat Card image in disc
 * @type {DiskStorage}
 */
let storageEjamaatImage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = 'uploads/ejamaatimages';
    fs.mkdirSync(path, { recursive: true });
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `photos-${baseName}-${req.headers.userId}-${uniqueSuffix}${ext}`);
    //cb(null, 'photos-' + Date.now() + path.extname(file.originalname))
  },
});

/**
 * @description Middleware to handle Incoming images and Ejamaat images via Multer storageEjamaatImage Configuration
 * @type {import('multer').Multer}
 */
let uploadEjamaatImage = multer({ storage: storageEjamaatImage });

//########################################### Controllers ################################################################//
const commonController = require('../controllers/users/commonController');
const authController = require('../controllers/users/authController');
const profileController = require('../controllers/users/profileController');
const subscriptionController = require('../controllers/users/subscriptionController');
const notificationController = require('../controllers/users/notificationController');
const exploreController = require('../controllers/users/exploreController');
const cmsController = require('../controllers/users/cmsController');
const contactUsController = require('../controllers/users/contactUsController');
const chatController = require('../controllers/users/chatController');
const reportController = require('../controllers/users/reportController');
const homeController = require('../controllers/users/homeController');

//############################################ Validation Schemas ##########################################################//
const authValidationSchemas = require('../validationSchemas/users/authValidationSchemas');
const profileValidationSchema = require('../validationSchemas/users/profileValidationSchema');
const chatValidationSchemas = require('../validationSchemas/users/chatValidationSchemas');

/* ############################################ Middlewares ############################################ */
const validateRequest = require('../middlewares/validateRequest');
const authenticationMiddlewares = require('../middlewares/authenticationMiddleware');

//############################################ Country And State ###################################################################//
router.get('/country-list', commonController.countryList);
router.get('/state-list/:countryId', commonController.stateList);
router.get('/auto-complete-search', commonController.autoCompleteSearch);

//############################################ Authentication   ###################################################################//
router.post(
  '/registration',
  validateRequest.validate(authValidationSchemas.registerSchema, 'body'),
  authController.userRegister,
);


router.post(
  '/otp-verify',
  validateRequest.validate(authValidationSchemas.OTPVerifySchema, 'body'),
  authController.OTPverification,
);
router.post(
  '/forgot-password',
  validateRequest.validate(authValidationSchemas.forgotPasswordSchema, 'body'),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  validateRequest.validate(authValidationSchemas.resetPasswordSchema, 'body'),
  authController.resetPassword,
);
router.post(
  '/login-email',
  validateRequest.validate(authValidationSchemas.loginWithEmailSchema, 'body'),
  authController.userLoginWithEmail,
);

//############################################ Profile ################################################################
router.post(
  '/add-basic-information',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.basicDetailsAddSchema, 'body'),
  profileController.basicDetailsAdd,
);
router.get('/get-basic-details', authenticationMiddlewares.authenticateRequestAPI, profileController.fetchBasicDetails);
router.put(
  '/add-address',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.AddAddressSchema, 'body'),
  profileController.adressAdd,
);
router.put('/add-who-are-you', authenticationMiddlewares.authenticateRequestAPI, profileController.addWhoAreYou);
router.get(
  '/fetch-wrap-it-up-list',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.fetchWrapItUpList,
);
router.post(
  '/update-wrap-it-up',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.addWrapItUpSchema, 'body'),
  profileController.AddWrapItUpList,
); //addWrapItUpSchema
router.post(
  '/photos-upload',
  authenticationMiddlewares.authenticateRequestAPI,
  uploadPicture.array('images'),
  profileController.uploadPhotos,
);
router.post(
  '/add-photos',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.addPhotosSchema, 'body'),
  profileController.addPhotos,
);
router.get('/fetch-photos', authenticationMiddlewares.authenticateRequestAPI, profileController.listPhotos);
router.post(
  '/add-about',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.addAboutSchema, 'body'),
  profileController.addAbout,
);
router.get('/fetch-about', authenticationMiddlewares.authenticateRequestAPI, profileController.aboutFetch);
router.get('/fetch-questions', authenticationMiddlewares.authenticateRequestAPI, profileController.fetchQuestions);
router.post(
  '/add-questions-answers',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.addQuestionsAnswerSchema, 'body'),
  profileController.addQuestionsAnswers,
);
router.get('/user-interest-list', authenticationMiddlewares.authenticateRequestAPI, profileController.userInterestList);
router.post('/user-interest-add', authenticationMiddlewares.authenticateRequestAPI, profileController.userInterestAdd);
router.get(
  '/personality-traits-list',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.personalityTraitsList,
);
router.post(
  '/personality-traits-add',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.personalityTraitsAdd,
);
router.post('/accept-terms', authenticationMiddlewares.authenticateRequestAPI, profileController.acceptTerms); //addWrapItUpSchema
router.get('/fetch-safety-tips', profileController.saftyTipsFetch);

router.put('/logout', authenticationMiddlewares.authenticateRequestAPI, profileController.logout);
router.put('/delete-account', authenticationMiddlewares.authenticateRequestAPI, profileController.deleteAccount);
router.get(
  '/delete-reasons',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.fetchDeleteReasonList,
);
router.post(
  '/deactivate-account',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.deactivateAccount,
);
router.post('/privacy-lock', authenticationMiddlewares.authenticateRequestAPI, profileController.privacyLockOnAccount);
router.get(
  '/fetch-profile-details',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.profileDetailsFetch,
);
router.put(
  '/update-profile',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.profileUpdateSchema, 'body'),
  profileController.profileUpdate,
); //
router.get(
  '/fetch-other-profile-details/:_id',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.otherProfileDetailsFetch,
);

router.get(
  '/fetch-congratulation-data',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.getCongratulation,
);
router.post('/go-to-home', authenticationMiddlewares.authenticateRequestAPI, profileController.goToHome);
router.post(
  '/email-verify',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.emailVerifySchema, 'body'),
  profileController.emailVerify,
);
router.post(
  '/verify-email-otp',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.otpVerifySchema, 'body'),
  profileController.verifyEmailOtp,
);

router.get(
  '/varification-image',
  authenticationMiddlewares.authenticateRequestAPI,
  profileController.varificationImageFetch,
);

router.post(
  '/upload-selfie-verification-images',
  authenticationMiddlewares.authenticateRequestAPI,
  uploadSelfieImage.single('selfieImage'),
  profileController.uploadVerificationImages,
);
router.post(
  '/upload-ejamaat-verification-images',
  authenticationMiddlewares.authenticateRequestAPI,
  uploadEjamaatImage.single('ejamaatImage'),
  profileController.uploadEjamaatVerificationImages,
);
router.post(
  '/profile-upload',
  authenticationMiddlewares.authenticateRequestAPI,
  uploadPicture.array('images'),
  profileController.uploadProfileImage,
);

//router.post('/check-image-verification', authenticationMiddlewares.authenticateRequestAPI,  profileController.checkImageVerification);

//############################################### Notification ###################################################################//
router.post(
  '/allow-notification',
  authenticationMiddlewares.authenticateRequestAPI,
  notificationController.allowNotification,
);
router.get(
  '/notification-list',
  authenticationMiddlewares.authenticateRequestAPI,
  notificationController.notificationList,
);

//############################################### Subscription #######################################################################//
router.get('/fetch-subscription-list', authenticationMiddlewares.authenticateRequestAPI,subscriptionController.fetchAllSubscriptionList);
router.post('/add-subscription', authenticationMiddlewares.authenticateRequestAPI,subscriptionController.addSubscription);
router.post("/verify-subscription",authenticationMiddlewares.authenticateRequestAPI, subscriptionController.verificationSubscription);
router.post('/apple-notification', subscriptionController.appleNotification);
router.post('/google-notification', subscriptionController.androidNotification);
router.get('/transaction-list', authenticationMiddlewares.authenticateRequestAPI,subscriptionController.transactionList)

//################################################## Explore  #################################################################################//
router.get(
  '/fetch-likes-data',
  authenticationMiddlewares.authenticateRequestAPI,
  exploreController.fetchExplorePageData,
);
router.get(
  '/fetch-favorite-user-list',
  authenticationMiddlewares.authenticateRequestAPI,
  exploreController.fetchFavoriteUserList,
);
router.get('/block-list', authenticationMiddlewares.authenticateRequestAPI, exploreController.fetchBlockUserList);

//#################################################### CMS ##################################################################################//
router.get('/cms', cmsController.fetchCms);

//#################################################### Contact Us ##################################################################################//
router.get(
  '/fetch-contact-us',
  authenticationMiddlewares.authenticateRequestAPI,
  contactUsController.fetchContactUsData,
);
router.post(
  '/submit-contact-us',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.addContactUsSchema, 'body'),
  contactUsController.addContactUs,
);

//##################################################### Inbox #########################################################################//
router.get(
  '/chat-inbox-list',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(chatValidationSchemas.chatInboxListSchema, 'query'),
  chatController.inboxList,
); //
router.get(
  '/fetch-conversation-list',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(chatValidationSchemas.chatConversationListSchema, 'query'),
  chatController.chatConversationList,
);
router.put('/chat-continue', authenticationMiddlewares.authenticateRequestAPI, chatController.chatContinue);
router.post('/chat-image-upload', uploadChatImage.single('image'), chatController.chatImageUpload);

//#################################################### Report   ########################################################################//
router.get('/fetch-report-data', authenticationMiddlewares.authenticateRequestAPI, reportController.reportList);
router.post(
  '/submit-report',
  authenticationMiddlewares.authenticateRequestAPI,
  validateRequest.validate(profileValidationSchema.reportSubmitSchema, 'body'),
  reportController.reposrtSubmit,
); //reportSubmitSchema

//################################### Master Data Add #############################################################################//

router.get('/get-app-version', commonController.appVersionFetch);

//############################################ HOME ################################################################
 
router.get('/home-page', authenticationMiddlewares.authenticateRequestAPI, homeController.homePageData);
router.post('/test-email', notificationController.testEmail);
router.get('/calculate-metrics', homeController.calculateMetrics);
router.get('/home-page-filter', authenticationMiddlewares.authenticateRequestAPI, homeController.fetchHomePageFilter)
router.get('/home-page-filter-countrylist', authenticationMiddlewares.authenticateRequestAPI, homeController.fetchHomePageFilterCountryList)
module.exports = router;
