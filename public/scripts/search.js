$(function () {

	var chatlist = $("#chat-list");
	var chats = {}

	function createListElement(chatname) {
		var li = $('<a href="/chat/' + chats[key] +
			'" class="list-group-item list-group-item-action">'
        	+ chatname + '</a>')
      	chatlist.append(li);
	}

	$.get('http://localhost:5000/chats', {}, function(data){
        chats = data;
        for (key in chats) {
    		var value = chats[key];
    		createListElement(key);
    	}
    });
	
})
