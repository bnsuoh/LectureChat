
$(function () {

    var messages = $("#messages");
    var messageBox = $('#m');

    var alias = document.getElementById("user-alias").innerText;
    var netid = document.getElementById("user-netid").innerText;

    // id of room
    var roomId = String(window.location.href.match(/\/chat\/(.*)$/)[1]);
    var mods = []

    // list of mods in the room
    $.get('/api/chatrooms/id/' + roomId, {}, function(data){
      if (data != null) { mods = data.mods }
    }); 

    // connect to socket
    var socket = io();

    // Add new chat message
    function createChatMessage(msg, msg_alias, msg_netid){
      var who = '';
      // Message is from self
      if (msg_alias === alias) { who = 'me' }
      // Message is from a moderator
      else if (mods.includes(msg_netid)) { who = 'mod' }
      // Message is from anyone else
      else { who = 'other' }

      var user = msg_alias;
      if (who === 'mod') { user = '<span class="glyphicon glyphicon-user"></span>' + msg_netid }

      var li = $(
        '<li class=' + who + '>'+
          '<p><b>' + user + ':</b> ' + msg + '</p>' +
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
      createChatMessage(data.msg, data.alias, data.netid)
    });

    // send messages
    $('form').submit(function(){
      //console.log(messageBox.val());
      socket.emit('chat message', {alias: alias, netid: netid, roomId: roomId, msg: messageBox.val()});
      createChatMessage(messageBox.val(), alias, netid)
      // messages.append($('<li>').text(messageBox.val()));
      messageBox.val('');
      return false;
    });

    messageBox.keydown(function (event) {
      var keypressed = event.keyCode || event.which;
      if (keypressed == 13) {
        event.preventDefault();
        $(this).closest('form').submit();
      }
    });

});