const mongoose = require('mongoose');

const schedulePeriodSchema = new mongoose.Schema({
    endOfChanging: Date,
    startDate: Date,
    endDate: Date,
    term: {type: String, unique: true}
})

const SchedulePeriod = mongoose.model('schedulePeriod', schedulePeriodSchema)

module.exports = SchedulePeriod;