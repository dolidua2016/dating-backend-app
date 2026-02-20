require('dotenv').config();
module.exports = {
    allowMimeType: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4', 'image/svg'],
    photos_url:'/uploads/photos',
    // passCode_for_password: 'kqGidxZGmumqYDFS0YcfNg6fxXK8',
    passCode_for_password:  process.env.PASS_CODE,
    chat_image_url:'/uploads/chatimages',
    broadcast_image_url:'/uploads/broadcast',
    selfie_image_url:'/uploads/selfieimages',
    ejamaat_image_url:'/uploads/ejamaatimages',
    
    jwtAccessTokenOptions: {
        secret: 'bohra#@2024',
        options: {
            algorithm: 'HS256',
            expiresIn: '30d',
            audience: 'aud:bohra',
        }
    },
    jwtRefreshTokenOptions: {
        secret: 'bohra#@2024',
        options: {
            algorithm: 'HS256',
            expiresIn: '35d',
            audience: 'aud:bohra',
        }
    },
}
