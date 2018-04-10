$(function () {

	var chatlist = $("#chat-list");
	var main_message = $("#main-message");

	// TODO: Add date created, mods etc
	function createListElement(chat) {
		var li = $('<a href="/chat/' + chat._id +
			'" class="list-group-item list-group-item-action">'
        	+ chat.name + '</a>')
      	chatlist.append(li);
	}

	// Fetch chatrooms from the database
	// TODO: change URL to heroku
	$.get('http://localhost:5000/api/chatrooms', {}, function(data){
        chats = data;
        if (chats.length > 0) { 
	        for (i in chats) {
	    		createListElement(chats[i]);
	    	}}
	    else {
	    	main_message.text("No chatrooms found.")
	    }
    });
	
})
