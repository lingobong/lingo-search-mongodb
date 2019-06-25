const mongoose = require('mongoose');
const LingoSearchSchema = new mongoose.Schema({
    unique_key: String,
    payload: Object,
});
LingoSearchSchema.index({ 'unique_key': 1 }, { unique: true });

module.exports = LingoSearchSchema;