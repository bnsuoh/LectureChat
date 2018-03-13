var CASAuthentication = require('cas-authentication');
var config = require('config.js');

module.exports = function(app, User, session){
    // views is directory for all template files

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
            var chat = require('chat.js');
            res.render("pages/chat", {
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

    app.listen(app.get('port'), function() {
      console.log('Node app is running on port', app.get('port'));
    });
     
    // Create a new instance of CASAuthentication. 
    var cas = new CASAuthentication({
        cas_url     : 'https://fed.princeton.edu/cas/',
        service_url : config.host,
        cas_version: "saml1.1"
    });
     
    // Unauthenticated clients will be redirected to the CAS login and then back to 
    // this route once authenticated. 
    app.get('/login', cas.bounce, function ( req, res ) {
        var user = new User(req.session[ cas.session_name ]);
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

}