var messages = $("#messages");
var messageBox = $('#m');

var alias = document.getElementById("user-alias").innerText;
var netid = document.getElementById("user-netid").innerText;

// id of room
var roomId = String(window.location.href.match(/\/chat\/(.*)$/)[1]);

var mods = []  // list of mods

var socket = null;

$(function () {

    // list of mods in the room
    $.get('/api/chatrooms/id/' + roomId, {}, function(data){
      if (data != null) { mods = data.mods }
    }); 

    // connect to socket
    socket = io();

    // Add new chat message
    function createChatMessage(msg, msg_alias, msg_netid, msg_id){
      // Message sender
      var who = '';
      if (msg_alias === alias) { who = 'me' } //from self
      else if (mods.includes(msg_netid)) { who = 'mod' } //from mod
      else { who = 'other' } // from other

      var user = msg_alias;
      if (who === 'mod') { user = '<span class="glyphicon glyphicon-user"></span>' + msg_netid }
      var li = $(
        '<li id=' + msg_id + 
          ' class=' + who + '>'+
          '<p><a class="glyphicon glyphicon-remove mod-only deleteButton" onclick="deleteMessage(\'' + msg_id + '\');"></a>' +
          '<b>' + user + ':</b> ' + msg + '</p>' +
        '</li>');

      messages.append(li);
    }

    // On connection to server get the id of person's room
    socket.on('connect', function(){
      console.log("connecting");
      socket.emit('cnct', {user: alias, roomId: roomId});
    });

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
    $('form').submit(function(){
      //console.log(messageBox.val());
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

    // Send message by clicking Enter but don't refresh the page
    messageBox.keydown(function (event) {
      var keypressed = event.keyCode || event.which;
      if (keypressed == 13) {
        event.preventDefault();
        $(this).closest('form').submit();
      }
    });

});

// Delete message after a mod clicks on the cross button
function deleteMessage(msg_id){
  socket.emit('delete', {msgId: msg_id, roomId: roomId});
  var element = document.getElementById(msg_id);
  element.innerHTML = "<b>Deleted by a moderator</b>"
  $.get('/chat/'+ roomId +'/delete/' + msg_id, {}, function(data){
  });
};
