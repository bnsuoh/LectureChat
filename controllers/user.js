var mongoose = require('mongoose')

var userSchema = new Object({
    netid: {
        type: String,
        lowercase: true,
        trim: true
    }
});

var User = mongoose.model('User', userSchema)

module.exports = User

// function User(netid) {
// 	this.netid = netid;
// 	this.alias = "student" + Math.round(Math.random() * 1000000)
// };

// module.exports = User;