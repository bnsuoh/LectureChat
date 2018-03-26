// var userSchema = new Object({
//     netid: {
//         type: String,
//         lowercase: true,
//         trim: true
//     }
// });

function User(netid) {
	this.netid = netid;
	this.alias = "student" + Math.round(Math.random() * 1000000)
};

module.exports = User;