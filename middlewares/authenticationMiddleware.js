const jwt = require('jsonwebtoken');
const responseMessages = require('../responseMessages')

// ################################ Repositories ################################ //
const userRepo = require('../repositories/userRepo');
const adminRepo = require('../repositories/adminRepo');
const userLoginActivityRepo = require('../repositories/userLoginActivityRepo');

const {handleLastLoginVisit } = require('../services/UserFeedMetricsV2Service')

// ################################ Globals ################################ //
const jwtOptionsAccess = global.constants.jwtAccessTokenOptions;


//User Authentication
module.exports.authenticateRequestAPI = async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            let accessToken = req.headers.authorization.split(' ')[1];
            const lastLogin = req.headers?.lastlogin;
            const token      = req.headers?.token
            jwt.verify(accessToken, jwtOptionsAccess.secret, async (err, decodedToken) => {
                if (err) {
                    return res.status(200).json({
                        status: 401,
                        msg: responseMessages.authFailure,
                    })
                }
                else {
                    let userCount = await userRepo.findOne({ _id: decodedToken.user_id, isDeleted: 0, accessToken: accessToken });

                    if (userCount) {
                        req.headers.userId = decodedToken.user_id;
                        if (lastLogin) {
                            const newLogin = new Date(lastLogin);
                            const oldLogin = userCount?.lastLogin ? new Date(userCount.lastLogin) : null;

                            if (!oldLogin || newLogin.getTime() !== oldLogin.getTime()) {
                                const now = new Date();
                                const dayStart = new Date(
                                newLogin.getUTCFullYear(),
                                newLogin.getUTCMonth(),
                                newLogin.getUTCDate()
                                );
                                await userRepo.update(
                                    { _id: decodedToken.user_id },
                                    { $set: { lastLogin: newLogin } }
                                );

                                const findExitingUser = await userLoginActivityRepo.findOne( {
                                        userId: decodedToken.user_id,
                                });
                                if(!findExitingUser){
                                     await userLoginActivityRepo.create(
                                       {
                                        userId: decodedToken.user_id,
                                            appOpenHistory: {
                                                date: dayStart,
                                                times: [now]
                                            }
                                        })
                               
                                }else{
                                    let findExitingData = await userLoginActivityRepo.findOne(
                                {
                                        userId: decodedToken.user_id,
                                        "appOpenHistory.date": dayStart,
                                });
                                if(findExitingData){
                                await userLoginActivityRepo.update(
                                    {
                                        userId: decodedToken.user_id,
                                        "appOpenHistory.date": dayStart,
                                    },
                                    {
                                        $push: {  "appOpenHistory.$.times": now  }
                                    }
                                );
                                }else{
                                await userLoginActivityRepo.update(
                                    {
                                        userId: decodedToken.user_id,
                                    },
                                   {
                                        $push: {
                                            appOpenHistory: {
                                                date: dayStart,
                                                times: [now]
                                            }
                                        }
                                    }
                                );

                                }
                                }
                                handleLastLoginVisit(newLogin, decodedToken.user_id)
                            }

                        }
                       
                        if(token || userCount?.token){                         
                            await userRepo.update(
                                    { _id: decodedToken.user_id },
                                    { $set: { token: token } }
                            );
                        }


                        next();
                    }
                    else {
                        return res.status(200).json({
                            status: 401,
                            msg: responseMessages.authFailure,
                        })
                    }
                }
            });
        }
        else {
            return res.status(200).json({
                status: 401,
                msg: responseMessages.authRequired
            })
        }
    }
    catch (e) {
        console.log("Middleware Error : ", e);
        res.json({
            status: 500,
            message: responseMessages.serverError,
        })
    }
}

//Admin Authentication
module.exports.authenticateRequestAdminAPI = async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            let accessToken = req.headers.authorization.split(' ')[1];
            jwt.verify(accessToken, jwtOptionsAccess.secret, async (err, decodedToken) => {
                if (err) {
                    return res.status(200).json({
                        status: 401,
                        msg: responseMessages.authFailure,
                    })
                }
                else {
                    const adminCount = await adminRepo.findOne({
                            _id: decodedToken.user_id,
                            tokens: accessToken 
                        });
                        console.log(adminCount,'adminCount')
                    if (adminCount) {
                        req.headers.userId = decodedToken.user_id;
                        next();
                    }
                    else {
                        return res.status(200).json({
                            status: 401,
                            msg: responseMessages.authFailure,
                        })
                    }
                }
            });
        }
        else {
            return res.status(200).json({
                status: 401,
                msg: responseMessages.authRequired
            })
        }
    }
    catch (e) {
        console.log("Middleware Error : ", e);
        res.status(500).json({
            status: 500,
            message: responseMessages.serverError,
        })
    }
}

