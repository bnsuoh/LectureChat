var mongoose = require('mongoose')

// Define a Message schema
var MessageSchema = new mongoose.Schema({
    _id: String,
    chatid: Number,
    senderAlias: String,
    timestamp: Date,
    text: String
});

var Message = mongoose.model('Message', MessageSchema)

module.exports = Message