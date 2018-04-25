var messages = $("#messages");
var messageBox = $('#m');
var userCountLabel = $('#user-count');
var updateChatSubmit = $('#update-chat-button');
var updateNameHelpLabel = document.getElementById('name-help')
var updateModsHelpLabel = document.getElementById('mods-help')

// Client alias
var alias = null;
$.getJSON('/api/alias', function(data){
  $.each(data, function(i, field){
    if (i === "alias") alias = field
  });
});

// Client netid
var netid = null;
$.getJSON('/api/netid', function(data){
  $.each(data, function(i, field){
    if (i === "netid") netid = field
  });
});

// id of room
var roomId = String(window.location.href.match(/\/chat\/(.*)$/)[1]);
var roomName = null;
var mods = []  // list of mods
var numOfUsers = 0

var socket = null;
var userToColor = {}

$(function () {

    // Connect to socket
    socket = io();
    
    // On connection to server get the id of person's room
    socket.on('connect', function(){
      loadPreviousChats();
      socket.emit('cnct', {alias: alias, netid: netid, roomId: roomId});
      updateNumberOfUsers();
    });

    // New user connected to the chatroom
    socket.on('joined', function(data) {
      updateNumberOfUsers();
      // createStatusMessage(data.alias, "joined");
    })

    // A user left the chatroom
    socket.on('left', function(data) {
      updateNumberOfUsers();
      // createStatusMessage(data.alias, "left");
    })

    // Receive chat message
    socket.on('receive', function(data){
      createChatMessage(data.msg, data.alias, data.netid, data.msgId)
    });

    // Remove message display
    socket.on('delete', function(data){
      var element = document.getElementById(data.msgId);
      element.innerHTML = "<b>Deleted by a moderator</b>"
    });

    // send messages
    $('#message-form').submit(function(){
      msgId = 0;
      msg = messageBox.val()
      socket.emit('chat message', 
        {alias: alias, netid: netid, roomId: roomId, msgId: msgId, msg: msg},
        function(res) {
          createChatMessage(msg, alias, netid, res);
        });
      messageBox.val('');
      return false;
    });

    function highlightBorder(element, label, color, message) {
      element.style.borderColor = color;
      label.innerText = message;
      label.style.color = color;
    }

    // Is form input valid
    function isValid(text) {
      var re = /^[a-z\d\-_\s]+$/i;
      return re.test(text);
    }

    // Submit edit form
    updateChatSubmit.click(function (event) {
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
      newMods = newMods.value.trim().split(' ')
      if (!newMods.includes(netid)) {newMods.push(netid);}
      $.post('/chat/' + roomId + '/edit', {
          chatroom: newName,
          moderators: newMods,
          id: roomId
        }, function(data){
          if(data === "OK") {
            $('#chat-title').html('<b>Room:</b> ' + newName);
          }
          else {
            alert("You are not authorized to edit this chat room, or an error occured.")
          }
      })
      $('#edit-chat').modal('toggle');
    });

    // Send message by clicking Enter but don't refresh the page
    messageBox.keydown(function (event) {
      var keypressed = event.keyCode || event.which;
      if (keypressed == 13) {
        event.preventDefault();
        $(this).closest('form').submit();
      }
    });

    // Add new chat message
    function createChatMessage(msg, msg_alias, msg_netid, msg_id){
      // Message sender
      var who = 'other';
      if (msg_netid === netid) { who = 'me' } //from self
      if (mods.includes(msg_netid)) { who += ' mod' } //from mod

      var user = msg_alias;
      if (mods.includes(msg_netid)) { user = '<span class="glyphicon glyphicon-user"></span>' + msg_netid }
      var li = $(
        '<li id=' + msg_id + 
          ' class="msg ' + who + '">'+
          '<a class="glyphicon glyphicon-remove mod-only deleteButton" onclick="deleteMessage(\'' + msg_id + '\');"></a>'+
          '<b>' + user + '</b> <p style="display:inline">' + msg + '</p>' +
        '</li>');

      li.find('p').text(msg);
      messages.append(li);

      if (who != 'me') {
        if (userToColor[msg_netid] == null) {
        var color = "hsl(" + 360 * Math.random() + ',' +
                 (25 + 70 * Math.random()) + '%,' + 
                 (85 + 10 * Math.random()) + '%)';
        userToColor[msg_netid] = color;
        }
        li.css("background-color", userToColor[msg_netid]);
      }

      if (mods.includes(netid)) {displayModOnly();}
      scrollToBottom();
    }

    // Create status messages
    function createStatusMessage(usr_alias, usr_netid, status) {
      var li = '';
      var user = usr_alias;
      if (mods.includes(msg_netid)) { user = usr_netid }
      if (status === "joined") {
        li = $( '<li class="status text-center"><b>' + usr_alias + "</b> just joined</li>") 
      }
      else if (status === "left") {
        li = $( '<li class="status text-center"><b>' + usr_alias + "</b> just left</li>") 
      }
      messages.append(li);
      scrollToBottom();
    }

    // Populate previous messages and mods
    function loadPreviousChats() {
      $.get('/api/chatrooms/id/' + roomId, {}, function(data){
        if (data != null) { 
          mods = data.mods; 
          roomName = data.name;
          for (i in data.messages) {
            createChatMessage(data.messages[i].text, 
              data.messages[i].senderAlias,
              data.messages[i].senderNetid, 
              data.messages[i]._id)
          }
        }
        if (mods.includes(netid)) { displayModOnly(); }
      }); 
    }

    // Update the number of users in chatroom
    function updateNumberOfUsers() {
      var numOfUsers = "N/A"
      socket.emit('user count', {roomId: roomId}, function(res){
        userCountLabel.text(res + " online user(s)")
      });
    }

    // Scroll to the bottom of chat
    function scrollToBottom() {
      window.scrollTo(0, document.body.scrollHeight);
    }

    // Display mod only divs and populate edit form
    function displayModOnly() {
      document.getElementById("chatroom-field").value = roomName;
      var modList = ""
      for (i in mods) {
        modList += mods[i] + " "
      }
      document.getElementById("mod-field").value = modList.trim();
      $(".mod-only").show();
    }
});

// Delete message after a mod clicks on the cross button
function deleteMessage(msg_id){
  $.get('/chat/'+ roomId +'/delete/' + msg_id, {}, function(data){
    if (data == "OK") {
      socket.emit('delete', {msgId: msg_id, roomId: roomId});
      var element = document.getElementById(msg_id);
      element.innerHTML = "<b>Deleted by a moderator</b>"
    }
  });
};