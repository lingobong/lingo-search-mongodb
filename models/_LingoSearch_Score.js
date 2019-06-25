const mongoose = require('mongoose');
const LingoSearchSchema = new mongoose.Schema({
    unique_key: String,
    key: String,
    type: String,
    score: Number,
});
LingoSearchSchema.index({ 'unique_key': 1 });
LingoSearchSchema.index({ 'key': 1, 'type': 1 });

module.exports = LingoSearchSchema;