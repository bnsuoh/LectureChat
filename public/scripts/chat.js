
$(function () {

    var messages = $("#messages");
    var messageBox = $('#m');

    var alias = document.getElementById("user-alias").innerText;
    var netid = document.getElementById("user-netid").innerText;

    // id of room
    var roomId = String(window.location.href.match(/\/chat\/(.*)$/)[1]);

    // connect to socket
    var socket = io();

    // Add new chat message
    function createChatMessage(msg, user){
      var who = '';
      if (user === alias) {
        who = 'me';
      }
      else {
        who = 'other';
      }
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
      createChatMessage(data.msg, data.alias)
    });

    // send messages
    $('form').submit(function(){
      console.log(messageBox.val());
      socket.emit('chat message', {alias: alias, netid: netid, roomId: roomId, msg: messageBox.val()});
      createChatMessage(messageBox.val(), alias)
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