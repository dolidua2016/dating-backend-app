const SENSITIVE_KEYS = [
    "password",
    "confirmPassword",
    "oldPassword",
    "newPassword",
    "otp",
    "pin",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "secret",
    "apiKey",
];

/**
 * Recursively mask sensitive fields
 * @param {any} data
 */
function maskSensitiveData(data) {
    if (!data || typeof data !== "object") return data;

    if (Array.isArray(data)) {
        return data.map(maskSensitiveData);
    }

    return Object.keys(data).reduce((acc, key) => {
        if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
            acc[key] = "***MASKED***";
        } else if (typeof data[key] === "object") {
            acc[key] = maskSensitiveData(data[key]);
        } else {
            acc[key] = data[key];
        }
        return acc;
    }, {});
}

module.exports = {maskSensitiveData}