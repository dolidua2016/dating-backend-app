const fs = require("fs");
const jwt = require("jsonwebtoken");

let cachedToken = null;
let expiry = 0;

function generateAppleJwt(keyId, issuerId, keyFilePath) {
  
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && expiry - 30 > now) {
    return cachedToken;
  }
  console.log(fs.readFileSync(keyFilePath).toString());

  const privateKey = fs.readFileSync(keyFilePath);

  const token = jwt.sign(
    {
      iss: issuerId,
      iat: now,
      exp: now + 1200,
      aud: "appstoreconnect-v1",
     // bid: 'com.aprodence.findabohra'
    },
    privateKey,
    {
      algorithm: "ES256",
      header: { alg: "ES256", kid: keyId, typ: "JWT" },
    }
  );

  cachedToken = token;
  expiry = now + 1200;

  return token;
}

module.exports = generateAppleJwt;
