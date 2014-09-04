// load all the things we need
var LocalStrategy    = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy  = require('passport-twitter').Strategy;
var GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;

// load up the user model
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var dbconfig = require('./database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

// load the auth variables
var configAuth = require('./auth'); // use this one for testing

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        connection.query("select * from users where id = "+ id, function(err, rows){
            done(err, rows[0]);
        });

//        User.findById(id, function(err, user) {
//            done(err, user);
//        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use(
        'local-signup',
        new LocalStrategy(
            {
                // by default, local strategy uses username and password, we will override with email
                usernameField : 'username', // can be an email if you want
                passwordField : 'password',
                passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
            },
            function(req, username, password, done) {
                // find a user whose username is the same as the forms username
                // we are checking to see if the user trying to login already exists
                connection.query("select * from users where username = '" + username + "'", function(err, rows) {
                    if (err)
                        return done(err);
                    if (rows.length) {
                        return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
                    } else {
                        // if there is no user with that username
                        // create the user
                        var newUserMysql = {
                            username: username,
                            password: bcrypt.hashSync(password, null, null)  // use the generateHash function in our user model
                        };

                        var insertQuery = "INSERT INTO users ( username, password ) values ('" + newUserMysql.username + "','" + newUserMysql.password + "')";

                        connection.query(insertQuery, function(err, rows) {
                            newUserMysql.id = rows.insertId;

                            return done(null, newUserMysql);
                        });
                    }
                });
            }
        )
    );


    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use(
        'local-login',
        new LocalStrategy({
                // by default, local strategy uses username and password, we will override with email
                usernameField : 'username',
                passwordField : 'password',
                passReqToCallback : true // allows us to pass back the entire request to the callback
            },
            function(req, username, password, done) { // callback with email and password from our form
                connection.query("select * from users where username = '" + username + "'", function(err, rows){
                    if (err)
                        return done(err);
                    if (!rows.length) {
                        return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
                    }

                    // if the user is found but the password is wrong
                    if (!bcrypt.compareSync(password, rows[0].password))
                        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

                    // all is well, return successful user
                    return done(null, rows[0]);
                });
            })
    );

    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy({

        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                //User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
                connection.query("select * from users where facebook_id = '" + profile.id + "'", function(err, rows){
                    if (err)
                        return done(err);

                    if (rows.length > 0) {
                        user = rows[0];

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.facebook_token) {
                            user.facebook_token = token;
                            user.facebook_name  = profile.name.givenName + ' ' + profile.name.familyName;
                            user.facebook_email = (profile.emails[0].value || '').toLowerCase();

                            console.log(JSON.stringify(user, null, '\t'));

//                            user.save(function(err) {
//                                if (err)
//                                    return done(err);
//
//                                return done(null, user);
//                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser            = new User();

                        newUser.facebook_id    = profile.id;
                        newUser.facebook_token = token;
                        newUser.facebook_name  = profile.name.givenName + ' ' + profile.name.familyName;
                        newUser.facebook_email = (profile.emails[0].value || '').toLowerCase();

                        console.log(JSON.stringify(user, null, '\t'));

//                        newUser.save(function(err) {
//                            if (err)
//                                return done(err);
//
//                            return done(null, newUser);
//                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user            = req.user; // pull the user out of the session

                user.facebook_id    = profile.id;
                user.facebook_token = token;
                user.facebook_name  = profile.name.givenName + ' ' + profile.name.familyName;
                user.facebook_email = (profile.emails[0].value || '').toLowerCase();

                console.log(JSON.stringify(user, null, '\t'));

                var updateQuery = "UPDATE " + dbconfig.users_table + " SET " +
                    "`facebook_id` = " + user.facebook_id + ", " +
                    "`facebook_token` = '" + user.facebook_token + "', " +
                    "`facebook_name` = '" + user.facebook_name + "', " +
                    "`facebook_email` = '" + user.facebook_email + "' " +
                    "WHERE `id` = " + user.id + " LIMIT 1";

                connection.query(updateQuery, function(err, rows) {
                    if (err)
                        return done(err);

                    return done(null, user);
                });
            }
        });

    }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

        consumerKey     : configAuth.twitterAuth.consumerKey,
        consumerSecret  : configAuth.twitterAuth.consumerSecret,
        callbackURL     : configAuth.twitterAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, tokenSecret, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'twitter.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.twitter_token) {
                            user.twitter_token       = token;
                            user.twitter_username    = profile.username;
                            user.twitter_displayName = profile.displayName;

                            user.save(function(err) {
                                if (err)
                                    return done(err);
                                    
                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        var newUser                 = new User();

                        newUser.twitter_id          = profile.id;
                        newUser.twitter_token       = token;
                        newUser.twitter_username    = profile.username;
                        newUser.twitter_displayName = profile.displayName;

                        newUser.save(function(err) {
                            if (err)
                                return done(err);
                                
                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user                 = req.user; // pull the user out of the session

                user.twitter_id          = profile.id;
                user.twitter_token       = token;
                user.twitter_username    = profile.username;
                user.twitter_displayName = profile.displayName;

                user.save(function(err) {
                    if (err)
                        return done(err);
                        
                    return done(null, user);
                });
            }

        });

    }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({

        clientID        : configAuth.googleAuth.clientID,
        clientSecret    : configAuth.googleAuth.clientSecret,
        callbackURL     : configAuth.googleAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'google.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {

                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.google_token) {
                            user.google_token = token;
                            user.google_name  = profile.displayName;
                            user.google_email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                            user.save(function(err) {
                                if (err)
                                    return done(err);
                                    
                                return done(null, user);
                            });
                        }

                        return done(null, user);
                    } else {
                        var newUser          = new User();

                        newUser.google_id    = profile.id;
                        newUser.google_token = token;
                        newUser.google_name  = profile.displayName;
                        newUser.google_email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                        newUser.save(function(err) {
                            if (err)
                                return done(err);
                                
                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user               = req.user; // pull the user out of the session

                user.google_id    = profile.id;
                user.google_token = token;
                user.google_name  = profile.displayName;
                user.google_email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                user.save(function(err) {
                    if (err)
                        return done(err);
                        
                    return done(null, user);
                });

            }

        });

    }));

};
