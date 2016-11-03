var express = require('express');
var bodyParser = require('body-parser');
var sqlite = require('sqlite3');
var shortid = require('shortid');
var urlapi = require('url');
var validator = require('validator');
var RateLimit = require('express-rate-limit');

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

//initialize sqlite database
var db = new sqlite.Database(DB_NAME);
db.run("CREATE TABLE IF NOT EXISTS Routes "
       + "(id TEXT, url TEXT, hits INTEGER, created_on INTEGER)");

//root directory, show index page
app.get('/', function(req, res) {
  console.log('Root requested...');
  res.render('index', { title: 'URL Shortener' });
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
    console.log('Record created: ' + newID + '/' + url + '/' + timestamp + '/' + hits);
    res.send("Your new URL is " + urlapi.format({
      protocol: req.protocol,
      hostname: req.hostname,
      pathname: newID);
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

app.listen(PORT, function() {
  console.log('listening...');
});
