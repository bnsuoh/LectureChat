
function isValid(text) {
	var re = /^[a-z\d\-_\s]+$/i;
	return re.test(text);
}

// TODO: make this work
function checkFields(form){
		
	chatroom_name = $.trim(chatroom.val());
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