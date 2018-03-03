// var userSchema = new Object({
//     netid: {
//         type: String,
//         lowercase: true,
//         trim: true
//     }
// });

function User(netid) {
	this.netid = netid;
};

module.exports = User;