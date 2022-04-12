const mongoose = require('mongoose');

const groupAvailabilitySchema = new mongoose.Schema({
    group: {type: mongoose.Schema.ObjectId, ref: "Group"},
    supervisor: {type: mongoose.Schema.ObjectId, ref: "Supervisor"},
    unavailability: [Date],
    flexibility: Number,
    presentation: Date,
    settled: Boolean
})

const GroupAvailability = mongoose.model('GroupAvailability', groupAvailabilitySchema)

module.exports = GroupAvailability;