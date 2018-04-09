var express = require('express');
    var app = express();

var path    = require("path");

// Set port
var port = process.env.PORT || 5000;
app.set('port', (port));

var session = require('express-session');
var User = require("./controllers/user.js");
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

// app.listen(app.get('port'), function() {
//   console.log('Node app is running on port', app.get('port'));
// });


var CASAuthentication = require('cas-authentication');
var config = require('./controllers/config.js');
 
// Create a new instance of CASAuthentication. 
var cas = new CASAuthentication({
    cas_url     : 'https://fed.princeton.edu/cas/',
    service_url : config.host,
    cas_version: "saml1.1"
});
 
// Unauthenticated clients will be redirected to the CAS login and then back to 
// this route once authenticated. 
app.get('/login', cas.bounce, function ( req, res ) {
    var user = new User({ netid: cas.session_name});
    console.log(user.netid); // 'Silence'
    //var user = new User(req.session[ cas.session_name ]);
    req.session.user = user;
    //app.set("user", user);
    res.redirect('/');
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
var chats = {}
var users = []
var mods = {}

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

app.post('/create', 

    form(
    field("chatroom").trim().required().is(/^[a-z\d\-_\s]+$/i),
    field("moderators").trim().is(/^[a-z\d\-_\s]+$/i)
    ),

    function(req,res) {
        if (req.form.isValid) {
            var chatroom = req.body.chatroom
            var mods = req.body.mods
            if (!(chatroom in chats)) {
                // Generate unique id for the room
                var id;
                var id_valid = false;
                while (!id_valid) {
                    id_valid = true;
                    id = Math.round((Math.random() * 1000000));
                    Object.keys(chats).forEach(function(key) {
                        if (chats[key] == id) {
                            id_valid = false;
                        }
                    });
                }    
                chats[chatroom] = id;
                console.log("Creating chatroom with name " + chatroom + ".");
                res.redirect('/chat/'+ id);
            }
            else {
                console.log("Chatroom name " + chatroom + " already exists.");
                res.redirect('/create');
            }
            
        } else {
             console.log("Chatroom creation request incorrect.");
            res.redirect('/create');
        }
});

app.get('/chat/:id', isAuthenticated, function(req,res){
    // Render the chat view
    console.log(getKeyByValue(chats, req.params.id));

    res.render("pages/chat", {
        chatroom: getKeyByValue(chats, req.params.id),
        session: req.session
    });
});

app.get('/search', isAuthenticated, function(req,res){
    res.render("pages/search", {
        session: req.session
    });
})

app.get('/chats', cas.block, function ( req, res ) {
    res.json(chats);
});

var chat = io.sockets.on('connection', function(socket){

    socket.on('cnct', function(data){
        console.log("connected to room " + data.room);
        socket.join(data.room);
    });

    // Handle the sending of messages
    socket.on('chat message', function(data){

        // When the server receives a message, it sends it to the other person in the room.
        socket.broadcast.to(data.room).emit('receive', data);
        console.log("room: " + data.room + " msg: " + data.msg);
    });

    // Handle disconnect
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});