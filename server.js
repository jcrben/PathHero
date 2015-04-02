'use strict';

var express = require('express');
var middleware = require('./Server/src/middleware');

var SERVERPORT = process.env.PORT || 3000;
var SERVERURL = process.env.SERVERURL || 'localhost';
var app = express();

middleware(app);

app.listen(SERVERPORT, SERVERURL);

console.log('Path hero listening at http://%s:%s', SERVERURL, SERVERPORT);
