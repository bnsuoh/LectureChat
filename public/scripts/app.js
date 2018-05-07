var createButton = $("#createButton");

$(function () {
	// Check whether this user is an undergraduate student
    $.get('/api/isUndergrad', {}, function(data){
    	if (data != null) {
    		if (data == true) {
    			createButton.remove();
    		}
    	}
    }); 
})