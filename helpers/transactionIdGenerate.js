const crypto = require('crypto')

function generateTransactionId() {
  // 1. Prefix
  const prefix = "TRX";

  // 2. Date => YYYYMMDD
  const now = new Date();
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  // 3. Secure random number (6-digit)
  const randomNum = crypto.randomInt(100000, 1000000);

  // Final transaction ID
  return `${prefix}${date}-${randomNum}`;
}

module.exports = {
  generateTransactionId
}