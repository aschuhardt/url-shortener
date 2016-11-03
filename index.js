var express = require('express');
var bodyParser = require('body-parser');
var sqlite = require('sqlite3');
var shortid = require('shortid');
var urlapi = require('url');
var validator = require('validator');
var RateLimit = require('express-rate-limit');
var compressor = require('node-minify');

var app = express();
const PORT = 80;
const ROUTE_LIFESPAN = 600;
const DB_NAME = 'routes.db';

//set up express server configuration
app.set('view engine', 'pug');
app.locals.pretty = true;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//configure rate limiter
var limiter = new RateLimit({
  windowMs: 15*60*1000,
  max: 100,
  delayMs: 100
});
app.use(limiter);

//minimize index.js script
compressor.minify({
  compressor: 'uglifyjs',
  input: __dirname + '/scripts/index.js',
  output: __dirname + '/scripts/index-min.js'
});

//initialize sqlite database
var db = new sqlite.Database(DB_NAME);
db.run("CREATE TABLE IF NOT EXISTS Routes "
       + "(id TEXT, url TEXT, hits INTEGER, created_on INTEGER)");

//root directory, show index page
app.get('/', function(req, res) {
  console.log('Root requested...');
  res.render('index', { title: 'URL Shortener', host: req.hostname });
});

//handles POST requests to "/submit"
//used for creating new entries in routes database
app.post('/submit', function(req, res) {
  console.log('POST received...');
  var url = req.body.url;
  console.log('URL submitted: ' + url);
  urlInfo = urlapi.parse(url);
  if (urlInfo.protocol == null && url.length > 0) {
    url = 'http://' + url;
  }
  if (validator.isURL(url)) {
    var newID = shortid.generate();
    var timestamp = new Date().getTime() / 1000;
    var hits = 0;
    db.serialize(function() {
      var stmt = db.prepare("INSERT INTO Routes VALUES (?, ?, ?, ?)");
      stmt.run(newID, url, hits, timestamp);
      stmt.finalize();
    });
    //log record creation
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('Record created: '
      + newID + '/'
      + url + '/'
      + timestamp + '/'
      + hits + '/'
      + ip);

    //create two versions of URL, short and long
    //short version (doesn't have protocol) for display
    var shortformat = urlapi.format({
      hostname: req.hostname,
      pathname: '/' + newID}
    );

    //long version (contains protocol) for href
    var longformat = urlapi.format({
      protocol: req.protocol,
      hostname: req.hostname,
      pathname: newID}
    );

    res.send("<span>Your new URL is <a href='" + longformat + "'>" + shortformat + "</a></span>");
  } else {
    // console.log('Invalid URL entered: ' + url);
    // res.writeHead(302, { 'Location': '/' });
    // res.end();
    res.send('Invalid URL entered.');
  }
});

//handles requests for individual ID keys (shortid)
app.get('/:key', function(req, res) {
  var key = req.params['key'];
  if (key == 'favicon.ico') { return; }
  console.log('Route requested for key: ' + key);
  db.serialize(function() {
    //by default, invalid requests redirect to root dir
    var stmt = db.prepare("SELECT url FROM Routes WHERE id = ?");
    stmt.get(key, function(err, row) {
      //if the provided key was valid, then
      //  set our destination to the stored URL
      var destination = '/';
      if (typeof row != 'undefined') {
        var targetUrl = row.url;
      	if (validator.isURL(targetUrl)) {
          destination = targetUrl;
      	}
      }
      res.writeHead(302, { 'Location': destination });
      res.end();
    });
    stmt.finalize();
  });
});

app.get('/scripts/index.js', function(req, res) {
  res.sendFile(__dirname + '/scripts/index-min.js');
});

app.get('/robots.txt', function(req, res) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('Indexing request from '+ ip);
  res.sendFile(__dirname + '/robots.txt');
});

app.listen(PORT, function() {
  console.log('listening...');
});
