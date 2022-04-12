const mongoose = require('mongoose');

const adminScheduleSchema = new mongoose.Schema({
    schedulePeriod: {type: mongoose.Schema.ObjectId, ref: "schedulePeriod"},
    data: String,
})

const AdminSchedule = mongoose.model('adminSchedule', adminScheduleSchema)

module.exports = AdminSchedule;