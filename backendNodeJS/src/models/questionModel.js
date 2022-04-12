const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    question: {type: String, required: true},
    question_type: {type: String, required: true, enum: ["Rating", "Text"]},
    question_to: {type: String, require: true, enum: ["Self", "Others"]},
    question_required: {type: Boolean, required: true}
})

const Question = mongoose.model('Question', questionSchema)

module.exports = Question;