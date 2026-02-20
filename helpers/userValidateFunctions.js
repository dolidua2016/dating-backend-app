const responseMessage = require('../responseMessages')

/**
 * ### Method to Validate User.
 * - If userDetails not found, 'Then send User not Found'
 * - If User Blocked then sends 'Action not allowed. Account blocked.'
 * - Otherwise, Good to go. 👍
 * @param userDetails
 * @return {Promise<{status: boolean, message: string}|{status: boolean, message: string, statusCode: number}>}
 */
module.exports.userValidated = async(userDetails) => { 
    if(!userDetails){
         return {status: true, message: responseMessage.userNotFound , statusCode: 404}
    }
    else if(userDetails.isBlocked === 1){
        return {status: true, message: 'Action not allowed. Account blocked.' , statusCode: 404}
    }
    return {status : false, message: ''}
}