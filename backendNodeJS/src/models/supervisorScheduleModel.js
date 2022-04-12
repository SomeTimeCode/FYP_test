const mongoose = require('mongoose');

const supervisorScheduleSchema = new mongoose.Schema({
    schedulePeriod: {type: mongoose.Schema.ObjectId, ref: "schedulePeriod"},
    supervisor: {type: mongoose.Schema.ObjectId, ref: "Supervisor"},
    data: String,
})

const SupervisorSchedule = mongoose.model('supervisorSchedule', supervisorScheduleSchema)

module.exports = SupervisorSchedule;