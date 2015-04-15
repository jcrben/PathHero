'use strict';

var uri = process.env.DBURI || '127.0.0.1:27017/pathhero';
var db = exports.db = require('monk')(uri);
var serverConfig = require('./serverConfig');
var bcrypt = require('bcrypt-nodejs');
var Q = require('q');

exports.uri = uri;

// Handle the typical Monk promise pattern
// Requires a monk Promise
// If the optional key is provided then the Promise
// will resolve to Doc[key]
// 
// Returns a promise
var resolveMonkPromise = function(monkPromise, key) {
  var deferred = Q.defer();
  monkPromise.success(function(item) {
    if (key) {
      deferred.resolve(item[key]);
    } else {
      deferred.resolve(item);
    }
  }).error(function(error) {
    deferred.reject(new Error(error));
  });
  return deferred.promise;
};

// Asynchronous
// 
// Hash a user password
// returns a promise
var hashPassword = function(password) {
  var deferred = Q.defer();

  bcrypt.hash(password, null, null, function(error, hash) {
    if (error) {
      deferred.reject(new Error(error));
    } else {
      deferred.resolve(hash);
    }
  });

  return deferred.promise;
};

// Asynchronous
// 
// Validates a password
// returns a promise with a bool
var validatePassword = function(password, secret) {
  var deferred = Q.defer();
  bcrypt.compare(password, secret, function(error, isMatch) {
    if (error) {
      deferred.reject(new Error(error));
    } else {
      deferred.resolve(isMatch);
    }
  });

  return deferred.promise;
};

// Users Collection
// _id: ObjectID generated by mongoDB
// userid: username or oauth token
// secret: salted hash or a dummy password if the user authenticated by oauth

// Asynchronous
// Find or create the user
// If no password is provided a dummy one is created
// 
// Returns a Promise with id
exports.findOrCreateUser = function(userid, password) {
  var deferred = Q.defer();
  password = password || Math.random().toString();

  hashPassword(password)
  .then(function(hash) {
    db.get('Users').findAndModify(
      {userid: userid}, 
      {$setOnInsert: {userid: userid, secret: hash}},
      {
        upsert: true,
        'new': false
      }
    )
    .success(function(doc) { // ignoring param doc
      deferred.resolve(doc);
    })
    .error(function(error) {
      deferred.reject(new Error(error));
    });
  })
  .fail(function(error) {
    deferred.reject(new Error(error));
  });

  return deferred.promise;
};

// Asynchronous
// Validate that the username and password are correct
// Used for local authentication
// does not mutate the DB
// 
// returns a Promise with {id: id, message: message}
exports.validateUser = function(username, password) {
  var deferred = Q.defer();
  db.get('Users').findOne({userid: username})
  .success(function(doc) {
    // create a fake secret so bycrypt still runs to reduce timing attacks
    var dummySecret = '$2a$10$alyHIMMFmX4dDzTB8FwtBu2UxL1oQzdiM9lYjI66XfUDit7n2z1Tu';
    var secret = !doc || !doc.secret ? dummySecret : doc.secret;

    validatePassword(password, secret)
    .then(function (isMatch) {
      if (!doc || !isMatch) {
        deferred.resolve({id: null, message: 'Incorrect user name or password'});
      } else {
        deferred.resolve({id: doc.userid, message: 'success'});
      }
    })
    .fail(function(error) {
      deferred.reject(new Error(error));
    });
  })
  .error(function(error) {
    deferred.reject(new Error(error));
  });

  return deferred.promise;
};


// Hunts Collection
// {
//    _id = BSON_ID (auto generated)
//    creatorID = session user (auto generated)
//    hunt.url = URL for player (auto generated)
//    huntName: String
//    huntDesc: String
//    huntInfo: {
//      numOfLocations: Int
//      huntTimeEst: Float
//      huntDistance: Float
//    }
//    pins: [ 
//      {
//        answer: String
//        geo: {
//          lat: Float
//          lng: Float
//        }
//        clues: [Stirngs]
//        answerField: String 
//      }
//      .
//      .
//      .
//    ]
// }

// Asynchronous
// adds a new hunt to the DB and will return the generated URL to the callback
// 
// returns a promise with the url;
exports.addHunt = function(hunt) {
  var hunts = db.get('Hunts');
  hunt._id = hunts.id();
  hunt.url = [
    'http://',
    serverConfig.playSubdomain,
    '.',
    serverConfig.domain,
    '/',
    hunt._id.toString()
  ].join('');

  return resolveMonkPromise(hunts.insert(hunt), 'url');
};

// Asynchronous
// Updates an existing hunt with new data
// Returns a copy of the updated hunt or null if the hunt did not exist
// 
// returns a Promise with the updated hunt
exports.updateHunt = function(hunt) {
  var promise = db.get('Hunts').update({_id: hunt._id}, hunt);
  return resolveMonkPromise(promise);
};

// Asynchronous
// Takes a userID and returns an array of all hunts for the user
// Returns an empty array if no hunts are associated with the user
// 
// returns a Promise with an array of hunts
exports.getUserHunts = function(userid) {
  var promise = db.get('Hunts').find({creatorId: userid});
  return resolveMonkPromise(promise);
};

// Asynchronous
// Takes a Hunt ID (_id) and removes it from the database
// Returns a copy of the removed hunt
// 
// returns a Promise with the removed hunt
exports.removeHuntbyId = function(huntid) {
  if (huntid.length !== 12 && huntid.length !== 24) {
    huntid = '000000000000000000000000';
  }
  var promise = db.get('Hunts').remove({_id: huntid});
  return resolveMonkPromise(promise);
};

// Asynchronous
// Takes a hunt id and returns a hunt 
// 
// returns a Promise with the associated hunt
exports.getHuntById = function(huntid) {
  if (huntid.length !== 12 && huntid.length !== 24) {
    huntid = '000000000000000000000000';
  }
  var promise = db.get('Hunts').findOne({_id: huntid});
  return resolveMonkPromise(promise);
};

// Asynchronous
// Takes return all Hunts 
// 
// returns a Promise with the associated hunt
exports.getAllHunts = function() {
  var promise = db.get('Hunts').find({});
  return resolveMonkPromise(promise);
};
