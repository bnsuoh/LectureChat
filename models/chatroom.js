var mongoose = require('mongoose')
var userModel = require('./user.js')

// Define a chatroom schema
var ChatroomSchema = new mongoose.Schema({
    _id: String,
    name: {
    	type: String,
    	trim: true
    },
    mods: [{
    	type: String,
    	trim: true 
    }],
    messages: [{
    	_id: String,
        chatid: String,
        senderAlias: String,
        senderNetid: String,
        timestamp: Date,
        text: String
    }]
})

var Chat = mongoose.model('Chat', ChatroomSchema)

module.exports = Chat