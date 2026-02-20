const {sendMail} = require('./emailFunction');
const emailTemplateFunction = async (
  email,
  subject,
  icon,
  messageOne,
  messageTwo,
  messageThree,
  
) => {

    const messageHtml = `
    <!-- Main Text -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:8px 24px;">
      ${
        messageOne
          ? messageOne
          : ""
      }
      ${
        messageTwo
          ? messageTwo
          : ""
      }
      ${
        messageThree
          ? messageThree
          : ""
      }
    </td>
  </tr>
</table>

<!-- End Main Text -->`;


    const htmlData = `<html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>FindABohra Notification</title>
        <style>
          @media only screen and (max-width:600px) {
            .container { width: 100% !important; }
            h2 { font-size: 18px !important; }
            p { font-size: 15px !important; }
            .cta { padding: 10px 24px !important; font-size: 15px !important; }
          }
        </style>
      </head>
      <body style="margin:0; padding:0; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;">
          <tr>
            <td align="center" style="padding:40px 16px;">

              <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0"
                style="max-width:600px; background:linear-gradient(135deg, #8F4485 0%, #8F4485 18%, #ffffff 18%, #ffffff 82%, #8F4485 82%, #8F4485 100%);
                overflow:hidden; text-align:center; border-radius:12px;">

                <tr>
                  <td>
                    <table width="100%">
                      <tr>
                        <td align="center" style="padding:40px 16px 12px 16px;">
                          <img src=${process.env.HOST_URL + '/uploads/emailimages/logo.png'} alt="FindABohra Logo" width="140" style="display:block; margin:auto;">
                        </td>
                      </tr>
                    </table>

                    <table width="100%">
                      <tr>
                        <td align="center" style="padding:8px 16px;">
                          <img src="${icon}" alt="Icon" width="200" style="display:block; margin:auto;">
                        </td>
                      </tr>
                    </table>

                    <table width="100%">
                      <tr>
                        <td align="center" style="padding:8px 24px;">
                          ${messageHtml}
                        </td>
                      </tr>
                    </table>

                    

                    <table width="100%">
                      <tr>
                        <td align="center" style="padding:16px; font-size:12px; color:#fff; background:#67295F;">
                          © ${new Date().getFullYear()} <strong>FindABohra</strong>. All rights reserved.
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`

    await sendMail({email, subject, htmlData})
  return true;
};



const forgotPasswordEmailTamplate = async (otp,email,subject,name) => {

  console.log(name,'name')
  const htmlData = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FindABohra Notification</title>
  <style>
    /* Responsive adjustments */
    @media only screen and (max-width:600px) {
      .container {
        width: 100% !important;
      }
      h2 {
        font-size: 18px !important;
      }
      p {
        font-size: 15px !important;
      }
      .cta {
        padding: 10px 24px !important;
        font-size: 15px !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif;">

  <!-- Outer white wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; background:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card with diagonal background -->
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0"
               style="max-width:600px; width:100%; background:linear-gradient(135deg, #8F4485 0%, #8F4485 18%, #ffffff 18%, #ffffff 82%, #8F4485 82%, #8F4485 100%);
                      overflow:hidden; text-align:center; mso-border-alt:none;">
          
          <tr>
            <td>
              
              <!-- Logo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:40px 16px 12px 16px;">
                    <img src=${process.env.HOST_URL + '/uploads/emailimages/logo.png'} width="140" style="display:block; margin:auto; border:0; outline:none;">
                  </td>
                </tr>
              </table>

              <!-- Icon -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:8px 16px;">
                    <img src=${process.env.HOST_URL + '/uploads/emailimages/messageImage.png'} alt="Update Icon" width="150" style="display:block; margin:auto; border:0; outline:none;">
                  </td>
                </tr>
              </table>

              <!-- Main Text -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:8px 24px;">
                    <p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Hi ${name},</p>
                    <p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Please use verification code to <br />verify your email:</p>
                    <h2 style="margin:8px 0 0 0; color:#67295F; font-size:25px; line-height:26px;">${otp}</h2>
                    <p style="margin:8px 0 0 0; color:#333; font-size:25px; line-height:30px;">Thanks for your time!</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:24px 16px 40px 16px;">

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:16px; font-size:12px; color:#fff; line-height:18px; background: #67295F;">
                    © 2025 <strong>FindABohra</strong>. All rights reserved.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`

await sendMail({email, subject, htmlData})
}    

const deleteAccountEmailTemplate = async (email,subject,user) => {
 const htmlData = `
  <h2 style="color:#67295F; margin-bottom:12px;">
   Found someone on FAB (Mashallah 🎉)
  </h2>

  <p style="color:#333; line-height:1.6; margin-bottom:12px;">
    A user has deleted their FindABohra account after selecting 
    <strong>"Found Someone"</strong> as the reason.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0; font-size:15px;">
    <tr>
      <td style="padding:6px 0;"><strong>User ID:</strong></td>
      <td style="padding:6px 0;">${user._id}</td>
    </tr>
     <tr>
      <td style="padding:6px 0;"><strong>User Name:</strong></td>
      <td style="padding:6px 0;">${user.firstName} ${user.lastName}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><strong>Email:</strong></td>
      <td style="padding:6px 0;">${user.email}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;"><strong>Deleted On:</strong></td>
      <td style="padding:6px 0;">${new Date().toLocaleString("en-IN")}</td>
    </tr>
  </table>

  <p style="color:#555; font-size:14px;">
    This indicates a successful match through the FindABohra platform.
    Thank you for being part of a meaningful journey.
  </p>
`;

 await sendMail({email, subject, htmlData})

}

module.exports = {
  emailTemplateFunction,
  forgotPasswordEmailTamplate,
  deleteAccountEmailTemplate
};
