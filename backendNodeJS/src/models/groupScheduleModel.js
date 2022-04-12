const mongoose = require('mongoose');

const groupScheduleSchema = new mongoose.Schema({
    schedulePeriod: {type: mongoose.Schema.ObjectId, ref: "schedulePeriod"},
    group: {type: mongoose.Schema.ObjectId, ref: "Group"},
    data: String,
})

const GroupSchedule = mongoose.model('groupSchedule', groupScheduleSchema)

module.exports = GroupSchedule;