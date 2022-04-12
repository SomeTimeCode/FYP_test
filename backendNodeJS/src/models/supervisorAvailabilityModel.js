const mongoose = require('mongoose');

const supervisorAvailabilitySchema = new mongoose.Schema({
    group: [{type: mongoose.Schema.ObjectId, ref: "Group"}],
    supervisor: {type: mongoose.Schema.ObjectId, ref: "Supervisor"},
    unavailability: [Date],
    flexibility: Number,
    settled: Boolean 
})

const SupervisorAvailability = mongoose.model('SupervisorAvailability', supervisorAvailabilitySchema)

module.exports = SupervisorAvailability;