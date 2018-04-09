
$(function () {

    var messages = $("#messages");
    var messageBox = $('#m');
    var alias = document.getElementById("user-alias").innerText;

    // id of room
    var room = Number(window.location.href.match(/\/chat\/(\d+)$/)[1]);

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

      // use the 'text' method to escape malicious user input

      messages.append(li);

      // messageTimeSent = $(".timesent");
      // messageTimeSent.last().text(now.fromNow());
    }

    // on connection to server get the id of person's room
    socket.on('connect', function(){
      console.log("connecting");
      socket.emit('cnct', {user: alias, room: room});
    });

    socket.on('receive', function(data){
      createChatMessage(data.msg, data.user)
    });

    // send messages
    $('form').submit(function(){
      console.log(messageBox.val());
      socket.emit('chat message', {user: alias, room: room, msg: messageBox.val()});
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