// Set up express
var express = require('express');
    var app = express();
var path    = require("path");
var session = require('express-session');

// Set port
var port = process.env.PORT || 5000;
    app.set('port', (port));

// Import user model
var UserModel = require("./models/user.js");

// Database
var mongoose = require('mongoose')
var DB = require("./controllers/database.js");

// initialize socket.io
var io = require('socket.io').listen(app.listen(port));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('js', require('ejs').renderFile);

// Set up an Express session, which is required for CASAuthentication. 
app.use(session({
    secret            : 'super secret key',
    resave            : false,
    saveUninitialized : true
}));

// Route to home page depends on whether the user is authenticated or not
app.get('/', function(req, res) {
    // Check whether the user has authenticated
    if (!req.session.user) {
        // The user in unauthenticated. Display the splash page.
        res.render("pages/splash", {
            session: req.session
        });
    } else {
        // The user has authenticated. Display the app
        res.render("pages/app", {
            session: req.session
        });
    }
});

// About page
app.get('/about', function(req, res) {
    res.render("pages/about", {
        session: req.session
    });
});

// Contact page
app.get('/contact', function(req, res) {
    res.render("pages/contact", {
        session: req.session
    });
});

/* ------------------------------------------------ CAS Authentication ------------------------------------------------ */

// Import CAS
var CASAuthentication = require('cas-authentication');
var config = require('./controllers/config.js');
 
// Create a new instance of CASAuthentication. 
var cas = new CASAuthentication({
    cas_url     : 'https://fed.princeton.edu/cas/',
    service_url : config.host,
    cas_version : "saml1.1",
    // cas_version     : '3.0',
    renew           : false,
    is_dev_mode     : false,
    dev_mode_user   : '',
    dev_mode_info   : {},
    session_name    : 'cas_user',
    session_info    : 'cas_userinfo',
    destroy_session : false
});
 
// Unauthenticated clients will be redirected to the CAS login and then back to 
// this route once authenticated. 
app.get('/login', cas.bounce, function ( req, res ) {
    
    // Netid attached to current session, if it exists
    var netid = req.session[cas.session_name]

    UserModel.findById(netid, function (err, user) {
        if (err) {
            console.log(err)
            res.sendStatus(500)
            req.session.user = user;
            return
        }

        // If user doesn't exist in the database, create a new user
        if (user == null) {
            var newUser = new UserModel({
              _id: netid
            })
            newUser.save(function (error) {
              if (error) {
                console.log(error)
                res.sendStatus(500)
                return
              }
            })
            req.session.user = newUser;
            res.redirect('/');
        }
        else {
            req.session.user = user;
            res.redirect('/');
        }
    })
});
 
// Unauthenticated clients will receive a 401 Unauthorized response instead of 
// the JSON data. 
app.get( '/api', cas.block, function ( req, res ) {
    res.json( { success: true });
});
 
// API call for the CAS user session variable.
app.get( '/api/user', cas.block, function ( req, res ) {
    res.json( { netid: req.session[ cas.session_name ] } );
});
 
// Unauthenticated clients will be redirected to the CAS login and then to the 
// provided "redirectTo" query parameter once authenticated. 
app.get( '/authenticate', cas.bounce_redirect );
 
// Deletes session and user information
var remove_session = function(req, res, next) {
    req.session.user = false;
    req.session.cas = false;
    next();
}

// This route will de-authenticate the client with the Express server and then 
// redirect the client to the CAS logout page. 
app.get( '/logout', [remove_session, cas.logout], function(req,res) {
    res.redirect('/');
});

// Middleware function to check whether user is authenticated
// TODO: remove this and try using cas.block instead? Rip, didn't know that was a thing
function isAuthenticated(req, res, next) {
  // if user is authenticated, continue to the next route
  if (req.session.user)
    return next();
  // if user isn't logged in, redirect them to login page
  res.redirect('/login');
}

/* ------------------------------------------------ CHAT ------------------------------------------------ */

// Inport database models
var ChatroomModel = require("./models/chatroom.js");
var MessageModel = require("./models/message.js");

// Body parser to get form inputs
var bodyParser = require('body-parser'),
    form = require('express-form'),
    field = form.field;

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Redirect to chatroom creation page
app.get('/create', cas.bounce, function(req,res){
    res.render("pages/create", {
        session: req.session
    });
});

// Create chat room after form is submitted
app.post('/create', 
    form(
        field("chatroom").trim().required().is(/^[a-z\d\-_\s]+$/i),
        field("moderators").trim().is(/^[a-z\d\-_\s]+$/i)
    ),
    function(req,res) {
        if (req.form.isValid) {
            var chatroom = req.body.chatroom // name of chatroom
            var mods = function() { // Netids of mods
                var mods1 = req.body.mods.split(' ');
                for (var mod in mods1) {
                    if (mod === req.session.user._id) {
                        return mods1
                    }
                mods1.push(req.session.user._id);
                return mods1
            }}();

            console.log("Trying to create chatroom with name " + chatroom);

            // Add chatroom to database
            ChatroomModel.findOne({ name: chatroom }, function(err, room) {
                if (err) {
                    console.log(error)
                    res.sendStatus(500)
                    return
                }

                // If the chat with name doesn't exist, create new chat
                if (room == null) {
                    var newChat = new ChatroomModel({
                      _id: mongoose.Types.ObjectId(),
                      name: chatroom,
                      mods: mods,
                      messages: []
                    })
                    newChat.save(function (error) {
                      if (error) {
                        console.log(error)
                        res.sendStatus(500)
                        return
                      }
                    })
                    res.redirect('/chat/' + newChat._id);
                }
                else {
                    // TODO: add error message
                    res.redirect('/create');
                }
            });
            
        } else {
            // TODO: add error message
            res.redirect('/create');
        }
});

// Go to the chat with given id
app.get('/chat/:id', cas.bounce, function(req,res){

    // Render the chat view for chatroom with given id
    ChatroomModel.findOne({_id: req.params.id}, function(err, room) {
        if (err) {
            console.log(error)
            res.sendStatus(500);
        }

        if (room == null) {
            console.log("Room does not exist");
            res.send(500, "Sorry, this chatroom does not exist");
        }

        else {
            res.render("pages/chat", {
                chatroom: room.name,
                session: req.session
            });
        }
    });
});

// Handle call to search page
app.get('/search', cas.bounce, function(req,res){
    res.render("pages/search", {
        session: req.session
    })
})

app.get('/chat/:chatId/delete/:messageId', cas.block, function(req,res){
    ChatroomModel.findOne({_id: req.params.chatId}, function(err, room) {
        console.log("Request to delete message with id: " + req.params.messageId)
        console.log(req.session[cas.session_name])
        if (err) {
            console.log(error)
            res.sendStatus(500);
            return
        }
        var netid = req.session[cas.session_name];
        if (room["mods"].includes(netid)) {
            for (var i = 0; i < room["messages"].length; i++) {
                var message = room["messages"][i];
                if (message["id"] === req.params.messageId) {
                    room["messages"].splice(i, i+1);
                    console.log("updating room data");
                    room.save(function (error) {
                        if (error) {console.log(error); res.sendStatus(500); return }
                    })
                }
            }
        }
        else {
            console.log("User " + netid + "is not a moderator for chatroom " + room["name"]);
            res.sendStatus(500);
            return
        }
    })
})
    
// Fetch all existing chatrooms from database, and render search page
app.get('/api/chatrooms', cas.bounce, function(req,res){
    ChatroomModel.find(function (err, chatrooms) {
        if (err) {
            console.log(error)
            res.sendStatus(500);
            return
        }
        res.send(chatrooms) 
    })
})

// Fetch info about room with given ID
app.get('/api/chatrooms/id/:id', cas.bounce, function(req,res){
    ChatroomModel.findOne({_id: req.params.id}, function(err, room) {
        if (err) {
            console.log(error)
            res.sendStatus(500);
            return
        }
        res.send(room) 
    })
})

// Fetch info about room with given name
app.get('/api/chatrooms/name/:name', cas.bounce, function(req,res){
    ChatroomModel.findOne({name: req.params.name}, function(err, room) {
        if (err) {
            console.log(error)
            res.sendStatus(500);
            return
        }
        res.send(room) 
    })
})

// Chatroom sockets and message transfer
var chat = io.sockets.on('connection', function(socket){
    // Handle user connection
    socket.on('cnct', function(data){
        console.log("connected to room " + data.roomId);
        socket.join(data.roomId);
    });

    // Handle the sending of messages
    // When the server receives a message, it sends it to the other person in the room.
    socket.on('chat message', function(data, callback){
        var msgId = mongoose.Types.ObjectId();
        var newMessage = new Object({
            _id: msgId,
            chatid: data.roomId,
            senderAlias: data.alias,
            senderNetid: data.netid,
            timestamp: null,
            text: data.msg
        })
        data.msgId = msgId;
        socket.broadcast.to(data.roomId).emit('receive', data);
        // Update the chatroom data on mongo by adding the new message
        data.msgId = msgId;
        ChatroomModel.findOne({_id: data.roomId}, function(err, room) {
            if (err) {
                console.log(error)
                res.sendStatus(500);
                return
            }
            if (room != null) {
                room.messages.push(newMessage);
                room.save(function (error) {
                    if (error) {console.log(error); res.sendStatus(500); return }
                })
                callback(msgId);
            }
        })
        console.log("room: " + data.roomId + " msg: " + data.msg);

    });

    // Delete a message
    socket.on('delete', function(data){
        socket.broadcast.to(data.roomId).emit('delete', {msgId: data.msgId});
    })

    // Handle disconnected user
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});