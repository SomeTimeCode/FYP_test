const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.ObjectId, ref: "User"},
    group: {type: mongoose.Schema.ObjectId, ref: "Group"},
    preferences: String,
})

const Student = mongoose.model('Student', studentSchema)

module.exports = Student;