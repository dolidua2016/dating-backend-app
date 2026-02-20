const jwt = require('jsonwebtoken');
const responseMessages = require('../responseMessages')

// ################################ Repositories ################################ //
const userRepo = require('../repositories/userRepo');
// ################################ Globals ################################ //
const jwtOptionsAccess = global.constants?.jwtAccessTokenOptions;



async function checkAuthIo(socket, next) {
    const error = new Error();
    try {
         const token = socket?.handshake?.headers?.authorization?.split(" ")[1] ?? undefined;
        const decodedToken = jwt.verify(accessToken, jwtOptionsAccess.secret);
        if (moment(decodedToken.validTill).toDate() > moment.now()) {
            const userToken = await userRepo.findOne({
                where: {
                    userId: decodedToken.userId,
                    userToken: token,
                },
            });
            if (userToken) {
                const user = await userRepo.findByPk(decodedToken.userId);
                if (user) {
                    if (!user.isActive) {
                        Object.assign(error, {
                            status: 403,
                            message: "Your Account Has Been Disabled By The Administrator",
                        });
                    }
                    socket.userData = user;
                    socket.token = token;
                } else {
                    Object.assign(error, {
                        status: 401,
                        message: "Invalid User Account Or Token",
                    });
                }
                return next();
            } else {
                Object.assign(error, {
                    status: 401,
                    message: "Token Has Been Expired",
                });
            }
        } else {
            await UserToken.destroy({
                where: {
                    userId: decodedToken.userId,
                    userToken: token,
                },
            });
            Object.assign(error, {
                status: 401,
                message: "Token Has Been Expired",
            });
        }
    } catch (error) {
        Object.assign(error, {
            data: {
                status: 401,
                error: error.message,
            },
            message: "Unauthenticated",
        });
        return next(error);
    }
    return next(error);
}

module.exports = checkAuthIo;
