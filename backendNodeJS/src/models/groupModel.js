const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    status: {type: String, default: "pending",enum: ['pending', 'approve'], required: true},
    group_name: {type: String, unique: true}, 
    topic: {type: mongoose.Schema.ObjectId, ref: "Topic"},
    group_members: [{type: mongoose.Schema.ObjectId, ref: "Student"}],
    supervisor: {type: mongoose.Schema.ObjectId, ref: "Supervisor"},
    examiner: {type: mongoose.Schema.ObjectId, ref: "Supervisor"},
    password: String,
    public: {type: Boolean, required: true}
})

const Group = mongoose.model('Group', groupSchema)

module.exports = Group;