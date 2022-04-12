const mongoose = require('mongoose');

const studentPeerReviewResponseSchema = new mongoose.Schema({
    student: {type: mongoose.Schema.ObjectId, ref:"Student"},
    peerReviewForm: {type: mongoose.Schema.ObjectId, ref: "PeerReviewForm"},
    complete: {type: Boolean, default: false},
    response: String
})

const studentPeerReviewResponse = mongoose.model('studentPeerReviewResponse', studentPeerReviewResponseSchema)

module.exports = studentPeerReviewResponse;