const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // or just `.env` if it's in same dir

const mongoose = require('mongoose');
const moment = require('moment');
const { initGlobalFeedStats } =
  require('../services/UserFeedMetricsV2Service');

// Validate MONGODB_URL
const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  console.error('MONGODB_URL is not defined. Check your .env file.');
  process.exit(1);
}

// Optional but clean: remove deprecated options (they have no effect in mongoose >=6.x)
mongoose
  .connect(MONGODB_URL)
  .then(async () => {
    console.log(`✅ DB connected successfully at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
     await initGlobalFeedStats();
  })
  .catch((e) => {
    console.error('❌ DB connection failed:', e.message);
    process.exit(1);
  });
