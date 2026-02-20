/**
 * Get start of day (UTC) for N days ago
 *
 * @param {Date} today - Reference date (usually new Date())
 * @param {number} nDay - How many days ago (e.g.: 90, 45, 15)
 * @returns {Date}
 */
function getStartDay(today = new Date(), nDay = 0) {
    const d = new Date(today);

    // subtract N days FIRST
    d.setUTCDate(d.getUTCDate() - nDay);

    // then normalize to start of day
    d.setUTCHours(0, 0, 0, 0);

    return d;
}

module.exports = { getStartDay }