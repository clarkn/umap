var config = require('../config.js');

/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index');
};

exports.test = function (req, res) {
    res.render('test');
};

exports.map = function (req, res) {
    res.render('map', {
        map_key: config.map_key.googlev3
    });
};

exports.logging = function (req, res) {
  res.render('logging', { title: 'Logging' });
};

exports.loader = function (req, res) {
  res.render('loader', { title: 'Loader' });
};


exports.proxy = function (req, res) {
  res.render('proxy.html');
};

/*
 * This page exists simply to load scripts into a browser forwloader

 * experimentation in a browser console.
 */
exports.console = function (req, res) {
  res.render('console', { title: 'Console Page'});
};
