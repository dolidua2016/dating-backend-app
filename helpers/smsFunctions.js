TWILIO_ACCOUNT_SID=process.env.TWILIO_ACCOUNT_SID;
TWILIO_AUTH_TOKEN= process.env.TWILIO_AUTH_TOKEN
TWILIO_VERIFY_SID= process.env.TWILIO_VERIFY_SID;


const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// module.exports.createMessage = async (phoneNumber, telephoneCode) => {
//   try {
//     console.log("Sending OTP to:", phoneNumber, "with code:", telephoneCode);
//     const e164Number = telephoneCode.startsWith('+')
//       ? `${telephoneCode}${phoneNumber.replace(/\D/g, '')}`
//       : `+${telephoneCode}${phoneNumber.replace(/\D/g, '')}`;

//       console.log("E164 Number:", e164Number);
//     const verification = await client.verify.v2
//       .services(process.env.TWILIO_VERIFY_SID)
//       .verifications.create({ to: e164Number, channel: 'sms' });

//     console.log("OTP sent:", verification.sid);
//     return true;
//   } catch (error) {
//     console.error("SEND OTP ERROR:", error);
//     throw error;
//   }
// };

// module.exports.verifyOTP = async (phoneNumber, telephoneCode, code) => {
//   try {
//     const e164Number = telephoneCode.startsWith('+')
//       ? `${telephoneCode}${phoneNumber.replace(/\D/g, '')}`
//       : `+${telephoneCode}${phoneNumber.replace(/\D/g, '')}`;
//       console.log(e164Number,'e164Number')
//     const verificationCheck = await client.verify.v2
//       .services(process.env.TWILIO_VERIFY_SID)
//       .verificationChecks.create({ to: e164Number, code });
//       console.log(verificationCheck,'verificationCheck------------')
//     if (verificationCheck.status === 'approved') {
//       console.log("OTP verified successfully");
//       return true;
//     } else {
//       console.log("Invalid OTP");
//       return false;
//     }
//   } catch (error) {
//     console.error("VERIFY OTP ERROR:", error);
//     throw error;
//   }
// };

/**
 * Service to Verify OTP using Twilio
 * @param phoneNumber
 * @param telephoneCode
 * @param code
 * @return {Promise<{success: boolean, message: string, code: null, status: null}|{success: boolean, message: string}>}
 */
module.exports.verifyOTP = async (phoneNumber, telephoneCode, code) => {
  try {
    const e164Number = telephoneCode.startsWith('+')
      ? `${telephoneCode}${phoneNumber.replace(/\D/g, '')}`
      : `+${telephoneCode}${phoneNumber.replace(/\D/g, '')}`;

    console.log(e164Number, 'e164Number');

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: e164Number, code });


    if (verificationCheck.status === 'approved') {
      console.log("✅ OTP verified successfully");
      return { success: true, message: "OTP verified successfully" };
    } else {
      console.log("❌ Invalid OTP");
      return { success: false, message: "Invalid OTP" };
    }

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    // 🔹 Handle Twilio-specific errors
    if (error.status === 404 || error.code === 20404) {
      return { success: false, message: "Verification service not found or expired. Please resend OTP." };
    }

    if (error.code === 60200) {
      return { success: false, message: "Invalid verification code." };
    }

    if (error.code === 60022) {
      return { success: false, message: "Verification attempts exceeded. Please try again later." };
    }

    // 🔹 Fallback for unknown errors
    return {
      success: false,
      message: error.message || "Something went wrong while verifying OTP.",
      code: error.code || null,
      status: error.status || null
    };
  }
};


module.exports.createMessage = async (phoneNumber, telephoneCode, deviceType, appSignature) => {
  try {
    if (!phoneNumber || !telephoneCode) {
      throw new Error("Missing phoneNumber or telephoneCode");
    }

    // Clean the number
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // Format into E.164
    const e164Number = telephoneCode.startsWith('+')
      ? `${telephoneCode}${cleanNumber}`
      : `+${telephoneCode}${cleanNumber}`;

    // Create a Verify service message with a custom message template
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
        to: e164Number,
        channel: 'sms',
        // Twilio Verify automatically replaces {CODE} with the actual OTP
        customCode: undefined, // optional
        locale: 'en', // optional
      });

    console.log("✅ OTP request created:", verification.sid);

    return {
      success: true,
      sid: verification.sid,
      to: e164Number,
      status: verification.status,
    };

  } catch (error) {
    console.error("❌ SEND OTP ERROR:", error?.message || error);

    if (error.code) {
      console.error("Twilio Error Code:", error.code);
      console.error("More Info:", error.moreInfo || '');
    }

    return {
      success: false,
      message: error.message || "Failed to send OTP",
      code: error.code || null,
    };
  }
};
