var express = require('express');
    var app = express();

var path    = require("path");

// Set port
var port = process.env.PORT || 5000;
app.set('port', (port));

var session = require('express-session');

// Models
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

app.get('/', function(req, res) {
    // Check whether the user has authenticated
    if (!req.session.user) {
        // The user in unauthenticated. Display a splash page.
        res.render("pages/splash", {
            session: req.session
        });
    } else {
        // The user has authenticated. Display the app
        //res.sendFile(path.join(__dirname+'/views/pages/chat.html'));
        res.render("pages/app", {
            session: req.session
        });
    }
});

app.get('/about', function(req, res) {
    res.render('pages/about');
});

app.get('/contact', function(req, res) {
    res.render('pages/contact');
});

/* ------------------------------------------------ CAS Authentication ------------------------------------------------ */

var CASAuthentication = require('cas-authentication');
var config = require('./controllers/config.js');
 
// Create a new instance of CASAuthentication. 
var cas = new CASAuthentication({
    cas_url     : 'https://fed.princeton.edu/cas/',
    service_url : config.host,
    cas_version : "saml1.1"
});
 
// Unauthenticated clients will be redirected to the CAS login and then back to 
// this route once authenticated. 
app.get('/login', cas.bounce, function ( req, res ) {
    
    var netid = req.session[cas.session_name]

    UserModel.findById(netid, function (err, user) {
        if (err) {
            console.log(err)
            res.sendStatus(500)
            req.session.user = user;
            return
        }

        // If the user doesn't exist, create a new user
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
 
// An example of accessing the CAS user session variable. This could be used to 
// retrieve your own local user records based on authenticated CAS username. 
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
function isAuthenticated(req, res, next) {

  // if user is authenticated, continue to the next route
  if (req.session.user)
    return next();

  // if user isn't logged in, redirect them to login page
  res.redirect('/login');
}

/* ------------------------------------------------ CHAT ------------------------------------------------ */

// Dictionary of existing chats in the format:
// key: Chat name
// value: Unique chat number

var ChatroomModel = require("./models/chatroom.js");
var MessageModel = require("./models/message.js");

// Get key with value from dictionary
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] == value);
}

var bodyParser = require('body-parser'),
    form = require('express-form'),
    field = form.field;

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Create a chat room
app.get('/create', isAuthenticated, function(req,res){

    // Redirect to room creation page
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

            // name of chatroom
            var chatroom = req.body.chatroom

            // Netids of mods
            var mods = function() {
                var mods1 = req.body.mods.split(' ');
                for (var mod in mods1) {
                    if (mod == req.session.user._id) {
                        return mods1
                    }
                mods1.push(req.session.user._id);
                return mods1
            }}();

            console.log("Trying to create chatroom with name " + chatroom);
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
                    console.log("Chatroom name " + chatroom + " already exists.");
                    res.redirect('/create');
                }
            });
            
        } else {
             console.log("Incorrect input in chatroom creation.");
            res.redirect('/create');
        }
});

// Go to the chat with given id
app.get('/chat/:id', isAuthenticated, function(req,res){

    // Render the chat view
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
app.get('/search', isAuthenticated, function(req,res){
    res.render("pages/search", {
        session: req.session
    })
})
    
// Fetch all existing chatrooms from database, and render search page
app.get('/api/chatrooms', isAuthenticated, function(req,res){
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
app.get('/api/chat/id/:id', isAuthenticated, function(req,res){
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
app.get('/api/chat/name/:name', isAuthenticated, function(req,res){
    ChatroomModel.findOne({name: req.params.name}, function(err, room) {
        if (err) {
            console.log(error)
            res.sendStatus(500);
            return
        }
        res.send(room) 
    })
})

var chat = io.sockets.on('connection', function(socket){

    // Handle user connection
    socket.on('cnct', function(data){
        console.log("connected to room " + data.roomId);
        socket.join(data.rooId);
    });

    // Handle the sending of messages
    socket.on('chat message', function(data){
        // When the server receives a message, it sends it to the other person in the room.
        socket.broadcast.to(data.roomId).emit('receive', data);
        var newMessage = new Object({
                _id: mongoose.Types.ObjectId(),
                chatid: data.roomId,
                senderAlias: data.alias,
                senderNetid: data.netid,
                timestamp: null,
                text: data.msg
            })
            // Handle user connection
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
            }
        })
        console.log("room: " + data.roomId + " msg: " + data.msg);
    });

    // Handle disconnect
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});