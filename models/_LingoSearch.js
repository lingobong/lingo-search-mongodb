const mongoose = require('mongoose');
const LingoSearchSchema = new mongoose.Schema({
    unique_key: String,
    payload: Object,
    scores: [
        { key: String, score: Number },
    ],
});
LingoSearchSchema.index({ unique_key: 1 }, { unique: true });
LingoSearchSchema.index({ 'scores.key': 1, 'scores.score': 1 }, { unique: true });

module.exports = LingoSearchSchema;