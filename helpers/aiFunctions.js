const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();


const scanImage = async (payload) => {
    try {
        const response = await axios.post(
            process.env.AI_BASE_URL,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                timeout: 90000,
            }
        );
        return response.data;
    } catch (error) {
        console.error("❌ AI API Error:", error.response?.data || error.message);
        return null;
    }
};

module.exports = {
    scanImage,
};
