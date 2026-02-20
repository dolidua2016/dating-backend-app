/*!
 * dashboardController.js
 * Containing all the controller actions related to `Dashboard`
 * Author: Sukla Manna
 * Date: 18th July, 2025`
 * MIT Licensed
 */


// ################################ Repositories ################################ //
const userRepo = require('../../repositories/userRepo');
const userSubscriptionDetailsRepo = require('../../repositories/userSubscriptionDetailRepo');
const adminRepo = require('../../repositories/adminRepo');
const imageReportRepo = require('../../repositories/imageReportRepo')
// ################################ Service ##################################//
const { getCountData, reportUser, inboxHelpData } = require('../../services/dashboardService')


//################################ Response Message ###########################//
const responseMessages = require('../../responseMessages');

//################################ Packages ###########################//
const moment = require('moment'); 

// Function For Fetch Dashboard Date Wise Data
const getDashboardStatsByType = async (type, startDate, totalDaysInMonth) => {
    const result = [];

    for (let i = 0; i < totalDaysInMonth; i++) {
        const dayStart = moment.utc(startDate).add(i, 'days').startOf('day');
        const dayEnd = moment.utc(startDate).add(i, 'days').endOf('day');
        const date = dayStart.format("YYYY-MM-DD");
        const day = dayStart.format("DD");

        if (type === "newUserRegistration") {
            const newUsers = await userRepo.findAll({
                steps: { $gte: 11 },
                createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
                isDeleted: 0
            });

            result.push({ date, day, total: newUsers.length });

        } else if (type === "newSubscribeUser") {
            const subscriptions = await userSubscriptionDetailsRepo.findAll({
                startDate: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() }
            });

            const uniqueUserIds = new Set(subscriptions.map(sub => String(sub.userId)));

            result.push({ date, day, total: uniqueUserIds.size });

        } else if (type === "newNotSubscribeUser") {
            const users = await userRepo.findAll({
                steps: { $gte: 11 },
                isSubcription: false,
                createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() },
                isDeleted: 0
            });

            result.push({ date, day, total: users.length });

        } else if (type === "totalIncome") {
            const subscriptions = await userSubscriptionDetailsRepo.findAll({
                startDate: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() }
            });

            const totalRevenue = subscriptions.reduce((sum, s) => sum + parseFloat(s.planPrice || 0), 0);

            result.push({ date, day, total: totalRevenue.toFixed(2) });
        }
    }

    return result;
};

/*
|------------------------------------------------ 
| API name          :  dashboard
| Response          :  Respective response message in JSON format
| Logic             :  Cms Fetch
| Request URL       :  BASE_URL/admin/dashboard
| Request method    :  GET
| Author            :  Sukla Manna
|------------------------------------------------
*/

module.exports.dashboard = (req, res) => {
    (async () => {
        let purpose = "Dashboard Data";
        try {
            const query = req.query;
            const type = query.type;

            const now = moment.utc();
            const year = query.year ? parseInt(query.year) : now.year();
            const month = query.month ? parseInt(query.month) : now.month();

            const startDate = moment.utc({ year, month, day: 1 }).startOf('day');
            const endDate = moment.utc(startDate).endOf('month');
            const totalDaysInMonth = endDate.date();
            let userId = req.headers.userId;


            const adminDetails = await adminRepo.findOne({ _id: userId, isActived: 1, isDeleted: 0 });
            if (!adminDetails) {
                return res.status(404).send({
                    status: 404,
                    msg: responseMessages.adminDetailsNotFound,
                    data: {},
                    purpose: purpose
                })
            }

            const allTypes = [
                "newUserRegistration",
                "newSubscribeUser",
                "newNotSubscribeUser",
                "totalIncome"
            ];

            const typesToFetch = !type || type.trim() === "" ? allTypes : [type];

            let newUserRegistration = [];
            let newUserSubscription = [];
            let newUserNoSubscription = [];
            let totalIncome = [];

            for (const type of typesToFetch) {
                const stats = await getDashboardStatsByType(type, startDate, totalDaysInMonth);

                if (type === "newUserRegistration") newUserRegistration = stats;
                if (type === "newSubscribeUser") newUserSubscription = stats;
                if (type === "newNotSubscribeUser") newUserNoSubscription = stats;
                if (type === "totalIncome") totalIncome = stats;
            }

            return res.status(200).send({
                status: 200,
                msg: responseMessages.dashboard,
                data: {
                    newUserRegistration,
                    newUserSubscriptions: newUserSubscription,
                    newUserNoSubscription,
                    totalIncome
                },
                purpose,
            });

        } catch (err) {
            console.log("Dashboard Data Error : ", err);
            return res.status(500).send({
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
| API name          :  fetchDashBoardData
| Response          :  Respective response message in JSON format
| Logic             :  fetch DashBoard Data
| Request URL       :  BASE_URL/admin/fetch-dashboard
| Request method    :  GET
| Author            :  Doli Dua
|------------------------------------------------
*/

module.exports.fetchDashBoardData = (req, res) => {
    (async () => {
        let purpose = "Fetch Dashboard Data";
        try {
            const imageReports = await imageReportRepo.findAll({});
            const userId = req.headers.userId
            const [
                countData,
                reportData,
                inboxData
            ] = await Promise.all([
                getCountData(),
                reportUser(),
                inboxHelpData(userId),
            ])

            return res.status(200).send({
                status: 200,
                msg: responseMessages.dashboard,
                data: {
                    countData,
                    reportData,
                    inboxData,
                    imageReports
                },
                purpose,
            });

        } catch (err) {
            console.log("Dashboard Data Error : ", err);
            return res.status(500).send({
                status: 500,
                msg: responseMessages.serverError,
                data: {},
                purpose
            });
        }
    })();
};

//fetchDashBoardData