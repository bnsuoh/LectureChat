var mongoose = require('mongoose')
var messageModel = require('./message.js')

// Define a user schema
var UserSchema = new mongoose.Schema({
    _id: {
        type: String,
        lowercase: true,
        trim: true
    },
    messages: [{
    	type: mongoose.Schema.ObjectId, 
    	ref: 'Message'}]
}, {
	toObject: {
	  virtuals: true
	},
	toJSON: {
	  virtuals: true 
	}
});

var User = mongoose.model('User', UserSchema)

// Set a random alias to this user that won't be persistent
// in the database
UserSchema.virtual('alias').get(function () {
  return "student" + Math.round(Math.random() * 1000000)
});

module.exports = User