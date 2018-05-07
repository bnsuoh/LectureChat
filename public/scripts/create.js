$(function () {

	var createChatSubmit = $('#create-chat-button');
	var updateNameHelpLabel = document.getElementById('name-help');
	var updateModsHelpLabel = document.getElementById('mods-help');

	var netid = null;
	$.getJSON('/api/netid', function(data){
	  $.each(data, function(i, field){
	    if (i === "netid") netid = field
	  });
	});

	// Sanitized input check. Is text valid input?
	function isValid(text) {
		var re = /^[a-z\d\-_\s]+$/i;
		return re.test(text);
	}

	// Highlight border of form element
	function highlightBorder(element, label, color, message) {
      element.style.borderColor = color;
      label.innerText = message;
      label.style.color = color;
    }

    // Submit the form
	createChatSubmit.click(function (event) {
      var keypressed = event.keyCode || event.which;
      if (keypressed == 13) {
        event.preventDefault();
      }
      var newName = document.getElementById("chatroom-field");
      var newMods = document.getElementById("mod-field");
      if (!isValid(newName.value)) {
        highlightBorder(newName, updateNameHelpLabel, "red", "You can only use alphanumerical characters, spaces, "+ "- and _")
        return;
      }
      highlightBorder(newName, updateNameHelpLabel, "#777", "e.g. COS 461")

      if (!isValid(newMods.value)) {
        highlightBorder(newMods, updateModsHelpLabel, "red", "Only use alphanumerical characters and spaces." + 
          "Use spaces to separate netids.")
        return;
      }
      highlightBorder(newMods, updateModsHelpLabel, "#777", "Separate netids using spaces")

      newName = newName.value.trim();
      newMods = newMods.value.trim();
      $.post('/create', {
      	chatroom: newName,
      	moderators: newMods,
      	netid: netid 
      }, function(data){
          if (data.statusCode == 200) {
            window.location = data.redirectUrl;
          }
          else {
            alert(data.message);
          }
      })
  	})
})