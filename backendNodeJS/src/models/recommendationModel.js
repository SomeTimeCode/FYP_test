const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
    data: String,
    courselist: String,
    ratingData: String,
    genrelist: String
})

const Recommendation = mongoose.model('Recommendation', recommendationSchema)

module.exports = Recommendation;