$(function () {

	// Sanitized input check. Is text valid input?
	function isValid(text) {
		var re = /^[a-z\d\-_\s]+$/i;
		return re.test(text);
	}

	// TODO: make this work
	function validateForm(form){
		chatroom_name = $.trim(form.chatroom.val());
		console.log(chatroom_name);
		console.log("here");
		
		if (chatroom.length < 1) {
			alert("Please enter a chatroom name longer than 1 character!");
			return false;
		}

		if (!isValid(chatroom_name)) {
			alert("Your chatroom name can only contain alphanumeric characters, space, - and _")
			return false;
		}

		mods = mods.val();

		if (!isValid(mods)) {
			alert("Your chatroom name can only contain alphanumeric characters, space, - and _");
			return false;
		}

		else {
			return true;
		}
	};
})