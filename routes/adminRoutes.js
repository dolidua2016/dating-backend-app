const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const upload  = require('../helpers/uploadFiles');


let storageBroadcast = multer.diskStorage({
    destination: function (req, file, cb) {
        const path = `uploads/broadcast`;
        fs.mkdirSync(path, {recursive: true});
        cb(null, path);
    },
    filename: function (req, file, cb) {
        cb(null, 'image' + Date.now() + path.extname(file.originalname))
    }
})

let uploadBroadcastImage = multer({ storage: storageBroadcast });
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
    cb(null, `photos-${baseName}-${uniqueSuffix}${ext}`);
    //cb(null, 'photos-' + Date.now() + path.extname(file.originalname))
  },
});

/**
 * @description Middleware to take the Chat images and store via Multer storeImage setup
 * @type {import('multer').Multer}
 */
let uploadChatImage = multer({ storage: storageChatImage });

/* ############################################ Middlewares ############################################ */
const validateRequest           = require('../middlewares/validateRequest');
const authenticationMiddlewares = require('../middlewares/authenticationMiddleware');

//############################################ Validation Schemas ##########################################################//
const userValidationSchema   = require('../validationSchemas/admin/userValidationSchemas');
const cmsValidationSchema    = require('../validationSchemas/admin/cmsValidationSchemas');
const inboxValidationSchema    = require('../validationSchemas/admin/inboxValidationSchemas');
const authenticationValidationSchema    = require('../validationSchemas/admin/authenticationValidationSchemas');
const broadcastValidationSchemas      = require('../validationSchemas/admin/broadcastValidationSchemas');

//########################################### Controller ################################################################//
const subscriptionController    = require('../controllers/admins/subscriptionController');
const userController            = require('../controllers/admins/userController');
const cmsController             = require('../controllers/admins/cmsController');
const profileController         = require('../controllers/admins/profileController');
const dashboardController       = require('../controllers/admins/dashboardController');
const inboxController           = require('../controllers/admins/inboxController');
const statisticsController      = require('../controllers/admins/statisticsController');
const broadcastController       = require('../controllers/admins/broadcastController');
const countryController         = require('../controllers/admins/countryControllers');
const appleSubscriptiosController = require('../controllers/admins/appleSubscriptiosController');
const transactionController     = require('../controllers/admins/transactionController')
const exportUserAnalyticsController = require('../controllers/admins/exportUserAnalyticsControllers');

//############################################ Subscription ###################################################################//
router.post('/subscription-add', subscriptionController.addSubscription); //Add Subscription
router.get('/fetch-all-in-app-purchase-list', appleSubscriptiosController.fetchInAppPurchaseList)// In-App purchase list fetch

//############################################ User ###################################################################//
router.get('/user-list', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(userValidationSchema.userListSchema, 'query'), userController.userList); //User List
router.put('/user-enable-disable', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(userValidationSchema.userEnableDisableSchema, 'body'), userController.userEnableDisable); //User Enable Disable
router.put('/user-delete', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(userValidationSchema.userDeleteSchema, 'body'), userController.userDelete); //User Delete
router.get('/user-details', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(userValidationSchema.userDetailsSchema, 'query'), userController.userDetails); //User Details
router.post('/user-image-report', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(userValidationSchema.userImageReportSchema, 'body'), userController.userImageReport); //User Image Report
router.put('/user-ejamaat-image-accept', authenticationMiddlewares.authenticateRequestAdminAPI, userController.userEjamaatImageAccept)
router.get('/user-match-details', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(userValidationSchema.userMatchSchemaSchema, 'query'), userController.userMatchDetails); //User Details
router.get('/fetch-user-last-login', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(userValidationSchema.userLastLoginSchema, 'query'), userController.userLastLogin); //User Details

//############################################ Cms ###################################################################//
router.get('/cms-fetch', validateRequest.validate(cmsValidationSchema.cmsFetchSchema, 'query'), cmsController.cmsFetch); //Cms Fetch // authenticationMiddlewares.authenticateRequestAdminAPI,
router.put('/cms-update', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(cmsValidationSchema.cmsUpdateSchema, 'body'), cmsController.cmsUpdate); //Cms Update

//############################################ Profile ###################################################################//
router.get('/profile-details', authenticationMiddlewares.authenticateRequestAdminAPI, profileController.profileDetails); //Profile Details
router.post('/login', validateRequest.validate(authenticationValidationSchema.loginSchema, 'body'), profileController.login); //Login


//############################################ Dashboard ###################################################################//
router.get('/dashboard', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(cmsValidationSchema.dashboardSchema, 'query'), dashboardController.dashboard); //Dashboard
router.get('/fetch-dashboard', authenticationMiddlewares.authenticateRequestAdminAPI, dashboardController.fetchDashBoardData)
//############################################ Inbox ###################################################################//
router.get('/inbox-list', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(inboxValidationSchema.inboxListSchema,'query'), inboxController.inboxList); //Inbox List
router.get('/inbox-read-message', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(inboxValidationSchema.inboxReadMessageSchema,'query'), inboxController.inboxReadMessage); //Inbox Read Message
router.get(
  '/fetch-conversation-list',
  authenticationMiddlewares.authenticateRequestAdminAPI,
  inboxController.chatConversationList,
);
router.post('/chat-image-upload', uploadChatImage.single('image'), inboxController.chatImageUpload);

//############################################ Statistics ###################################################################//
router.get('/statistics', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(cmsValidationSchema.statisticsSchema, 'query'), statisticsController.statistics); //Dashboard
router.get('/registration-statistics', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.registrationStatistics); //Registration Statistics
router.get('/search-registration-step', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.searchRegistrationStatistics); //Search Registration Statistics
router.get('/general-statistics', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.generalStatistics); //General Statistics
router.get('/registration-user-filter-list', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.registrationUserFilterList); //Registration User Filter List
router.get('/repeated-user-list', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.repeatedUserList); //Repeated User List
router.get('/repeated-user-times', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.repeatedUserTimeList); //Repeated User Time List
router.get('/match-user-list', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.matchUserList); //Repeated User List
router.get('/match-users', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.matchedUsers); //Matched User
router.get('/chat-statistics', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.chatStats); // Chat statistics
router.get('/chat-users', authenticationMiddlewares.authenticateRequestAdminAPI, statisticsController.chatUser); // Chat user

//################################### Broadcast ################################################//
router.get('/broadcast-user-list', authenticationMiddlewares.authenticateRequestAdminAPI, broadcastController.fetchUserList);
router.post('/broadcast-image-upload', authenticationMiddlewares.authenticateRequestAdminAPI, uploadBroadcastImage.single('image'), broadcastController.uploadImage)
router.post('/broadcast-create', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(broadcastValidationSchemas.createBroadcast, "body"), broadcastController.broadcastCreate) //Broadcast Create
router.get('/broadcast-list', authenticationMiddlewares.authenticateRequestAdminAPI, broadcastController.broadcastList)
router.put('/broadcast-delete', authenticationMiddlewares.authenticateRequestAdminAPI, validateRequest.validate(broadcastValidationSchemas.deleteBroadcast, "body"), broadcastController.broadcastDelete)

//################################### Transaction ##################################################//
router.get('/transaction-list', authenticationMiddlewares.authenticateRequestAdminAPI, transactionController.fetchTransactionList);

router.get('/country-list', countryController.countryList);
router.get('/state-list', countryController.stateList);
router.get('/export-user-analytics', exportUserAnalyticsController.exportUserAnalytics);

//#################################### Chat ##################################################//

   module.exports = router;
