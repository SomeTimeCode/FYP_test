const mongoose = require('mongoose');

const peerReviewFormSchema = new mongoose.Schema({
    term: {type: String, required: true},
    questions: [{type: mongoose.Schema.ObjectId, ref: "Question"}],
    start_of_date: {type: Date, required: true},
    end_of_date: {type: Date, required: true}
})

const PeerReviewForm = mongoose.model('PeerReviewForm', peerReviewFormSchema)

module.exports = PeerReviewForm;