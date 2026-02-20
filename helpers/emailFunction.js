
// const nodemailer = require('nodemailer');

// const transportOptions = {
//   host: process.env.MAIL_HOST,
//   port: process.env.MAIL_HOST,
//   auth: {
//     user: process.env.MAIL_USERNAME, // 'apikey', //
//     pass: process.env.MAIL_PASSWORD,
//   },
// };


// module.exports.sendMail = (messageData) => {
//   return new Promise((resolve, reject) => {
//     const mailTransport = nodemailer.createTransport(transportOptions);
//     const message = {
//       from: `${process.env.MAIL_FROM}<${process.env.MAIL_FROM_ADDRESS}>`, // Sender address
//       to: messageData.email, // List of recipients
//       subject: messageData.subject, // Subject line
//       html: messageData.htmlData, // Html text body
//     };

//     if (messageData?.attachments )
//       message.attachments = messageData?.attachments;
   
 
//     mailTransport.sendMail(message, function (err, info) {
//       if (err) {
//         console.log("MAIL ERROR : ", err);
//         reject(err);
//       } else {
//         console.log("INFO : ", info);
//         resolve(true);
//       }
//     });
//   });
// };

const nodemailer = require("nodemailer");

module.exports.sendMail = (messageData) => {
  return new Promise((resolve, reject) => {

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.MAIL_PASSWORD,
      },
    });

    const message = {
      from: `"${process.env.MAIL_FROM}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: messageData.email,
      subject: messageData.subject,
      html: messageData.htmlData,
    };

    if (messageData?.attachments?.length) {
      message.attachments = messageData.attachments;
    }

    transporter.sendMail(message, (err, info) => {
      if (err) {
        console.error("MAIL ERROR:", err);
        return reject(err);
      }

      console.log("MAIL SENT:", info.response);
      resolve(info);
    });
  });
};
