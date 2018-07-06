const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    entries: [String]
})

module.exports = mongoose.model('User', userSchema);