const aiFunctions = require("../helpers/aiFunctions");
const userRepo = require("../repositories/userRepo");
const userPictureRepo = require("../repositories/userPictureRepo");
const userImageReportRepo = require('../repositories/userImageReportRepo')
const createScanImagePayload = (imageUrl) => {
    return {
        model: process.env.AI_MODEL,
        input: [
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: `
                        You are an advanced image moderation and verification system for a dating app. 
                        Analyze the provided image and return only a single valid JSON object (and nothing else) 
                        with these exact keys:
                        "real_human", "violence", "sexual", "nudity",
                         "semi_nude", "vulgarity", "reason" , "face_visible".

                       - "real_human": boolean — true only if the detected face belongs to a real human, not an idol, painting, cartoon, AI-generated image, or sculpture.
                        - "violence": boolean — true if the image includes physical harm, weapons, blood, or aggression.
                        - "sexual": boolean — true if the image shows explicit or suggestive sexual behavior or acts.
                        - "nudity": boolean — true if genitalia, female nipples, or fully exposed private areas are visible.
                        - "semi_nude": boolean — true if the image contains any of the following:
                        - A person (male or female, single or multiple) wearing **any type of innerwear or undergarments**, such as bras, panties, boxers, briefs, lingerie, **undershirts (sando, genji, banyan)**, or **men’s lower innerwear (jangiya, underpants)** — regardless of pose or context.
                    
                        - A person lying or posing in a **semi-nude or sexually suggestive** way (e.g., lying on bed, covering private parts with hands, etc.).
                        - Visible excessive cleavage, torso, or body parts that imply **sexual or intimate** intent.
                       
                        - "vulgarity": boolean — true if obscene gestures or indecent poses are shown.
                         - "face_visible" (boolean) — true only if the main face is clear, centered, not blurry, not covered, and not hidden in shadows.

                        - "reason": string — a concise explanation (1–2 short sentences) summarizing why the image passed or failed moderation.

                        Reject the image if ANY of these are true:
                        - real_human = false
                        - violence = true
                        - sexual = true
                        - nudity = true
                        - semi_nude = true
                        - vulgarity = true
                        - face_visible = false
                        Return only the JSON object.
                        `,
                    },
                    {
                        type: "input_image",
                        image_url: imageUrl,
                    },
                ],
            },
        ],
    };
};

const parseScanResult = (scanImageResponse) => {
 try {
      if (!scanImageResponse) return false;

      let output = scanImageResponse?.output?.[0]?.content?.[0]?.text?.trim();
      if (!output) return false;

      const result = JSON.parse(output);

      const allPass =
        result.real_human &&
        !result.violence &&
        !result.sexual &&
        !result.nudity &&
        !result.semi_nude &&
        !result.vulgarity &&
        result.face_visible;


        

      return { allPass, details: result };
    } catch (err) {
      console.error("❌ Parsing error:", err.message);
      return { allPass: false, details: null };
    }
}

const imageVerfication = async (imageArray, userID, profileImage, imageVerificationStatus) => {
  

    // --- Handle profile image verification ---//

    if(imageVerificationStatus === 'notStarted'){

        
        const payload = createScanImagePayload(process.env.HOST_URL + profileImage);
        await userRepo.update({ _id: userID }, {imageVerificationStatus: 'scanned'});
        const scanResponse = await aiFunctions.scanImage(payload);
        const { allPass, details } = parseScanResult(scanResponse); 
        const updatedStatus = {
            imageVerificationStatus : allPass ? 'completed' : 'error'
        };
        await userRepo.update({ _id: userID }, updatedStatus);
        await userImageReportRepo.update({type: 'profile', userId: userID, isDeleted: 0}, {isDeleted: 1})
    }

    // --- Handle gallery or additional images ---//
    if(imageArray.length > 0){
    for (const imageObj of imageArray) {

        if(imageObj?.imageVerificationStatus === 'notStarted' || imageObj?.imageVerificationStatus === 'scanned'){
        const imageUrl = process.env.HOST_URL + imageObj.image;

        await userPictureRepo.update({ userId: userID , index: Number(imageObj.index), isDeleted: 0}, {imageVerificationStatus: 'scanned'});
        const payload = await createScanImagePayload(imageUrl);
        const scanResponse = await aiFunctions.scanImage(payload);
        const { allPass, details } = await parseScanResult(scanResponse);    
         const updatedStatus = {
            imageVerificationStatus : allPass ? 'completed' : 'error'
        };

        await userPictureRepo.update({ userId: userID , index: Number(imageObj.index), isDeleted: 0}, updatedStatus);
    }
    };
    }

    return true;
}


const createScanSelfieImagePayload = (imageUrl) => {
    return {
        model: process.env.AI_MODEL,
        input: [
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        // text: `
                        // You are an advanced image moderation and verification system for a dating app. 
                        // Analyze the provided image and return only a single valid JSON object (and nothing else) 
                        // with these exact keys:
                        // "is_face", "face_visible", "real_human", "lighting_ok",
                         

                        // - "is_face": boolean — true if a face-like structure is detected.
                        // - "face_visible": boolean — true if the main face is clear, centered, not blurry, covered, or shadowed.
                        // - "real_human": boolean — true only if the detected face belongs to a real human, not an idol, painting, cartoon, AI-generated image, or sculpture.
                        // - "lighting_ok": boolean — true if lighting is balanced (not overexposed or too dark).
                        
                        // tring — a concise explanation (1–2 short sentences) summarizing why the image passed or failed moderation.

                        // Reject the image if ANY of these are true:
                        // - face_visible = false
                        // - lighting_ok = false
                        // - real_human = false
                       
                        // Return only the JSON object.
                        // `,
                        
                         text:
                         `You are an advanced image moderation and liveness verification system for a dating application.

                            Analyze the provided image and return ONLY a single valid JSON object (and nothing else), containing EXACTLY these keys:
                            "is_face", "face_visible", "real_human", "lighting_ok", "spoof_attempt", "summary"

                            Where:

                            - "is_face" (boolean) — true if a human face-like structure is detected.
                            - "face_visible" (boolean) — true only if the main face is clear, centered, not blurry, not covered, and not hidden in shadows.
                            - "real_human" (boolean) — true only if the detected face belongs to a real live human, not a photo, printed picture, monitor screen, cartoon, sculpture, AI-generated image, or painting.
                            - "lighting_ok" (boolean) — true only if lighting is balanced (not too dark, not overexposed).
                            - "spoof_attempt" (boolean) — true if the face appears displayed through a printed photo, a monitor or phone screen, a digital display, or reflection.
                            - "summary" (string) — 1–2 short sentences explaining the decision.

                            Additional validation rules:
                            - Reject if the face appears flat with no 3D depth or natural shadows.
                            - Reject if reflections or glare suggest the face is on another screen.
                            - Reject if the image shows screen borders, rectangular edges, or typical device reflections.
                            - Reject if the face doesn’t match real human texture or depth.
                            - Reject if the face looks like a poster, digital media, or printed photo.

                            The image MUST be considered invalid if ANY of these are false:
                            - is_face = false
                            - face_visible = false
                            - lighting_ok = false
                            - real_human = false
                            - spoof_attempt = true

                            Return ONLY the JSON object and nothing else.`
                    },
                    {
                        type: "input_image",
                        image_url: imageUrl,
                    },
                ],
            },
        ],
    };
};

const parseSelfiScanResult = (scanImageResponse) => {
 try {
      if (!scanImageResponse) return false;

      let output = scanImageResponse?.output?.[0]?.content?.[0]?.text?.trim();
      if (!output) return false;

      const result = JSON.parse(output);

      const allPass = result.lighting_ok && result.real_human && result.face_visible  && !result.spoof_attempt; 

      

      return { allPass, details: result };
    } catch (err) {
      console.error("❌ Parsing error:", err.message);
      return { allPass: false, details: null };
    }
}

const selfieImageVerificationNotification = async (userID, selfieImage, selfieImageVerificationStatus) => {
     if(selfieImageVerificationStatus === 'notStarted'){

        const payload = await createScanSelfieImagePayload(process.env.HOST_URL + selfieImage);
        await userRepo.update({ _id: userID }, {selfieImageVerificationStatus: 'scanned'});
        const scanResponse = await aiFunctions.scanImage(payload);
        const { allPass, details } = await parseSelfiScanResult(scanResponse); 
        const updatedStatus = {
            selfieImageVerificationStatus : allPass ? 'completed' : 'error'
        };
        await userRepo.update({ _id: userID }, updatedStatus);

    }
    return true;
}

const profileImageVerfication = async (imageArray, userID, profileImage, imageVerificationStatus) => {
    // --- Handle profile image verification ---//

    
    if(imageVerificationStatus === 'notStarted'){

        
        const payload = createScanImagePayload(process.env.HOST_URL + profileImage);
        const scanResponse = await aiFunctions.scanImage(payload);
        const { allPass, details } = parseScanResult(scanResponse); 
        let status =  allPass ? 'completed' : 'error'
        
        return status;
    }
    
}


module.exports = {
    imageVerfication,
    selfieImageVerificationNotification,
    profileImageVerfication
};