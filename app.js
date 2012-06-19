/**
 * Module dependencies.
 */

var express = require('express')
, routes = require('./routes')
, url = require('url')
, request = require('request')
, querystring = require('querystring')
//, redis = require('redis')
, redis = require('redis-url')
, dataRetriever = require('./dataRetriever');

var app = module.exports = express.createServer();
//var redisClient = redis.createClient();
var redisClient = redis.connect(process.env.REDISTOGO_URL);

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Routes

//app.get('/', routes.index);
var port = process.env.PORT || 3000;

app.listen(port);
console.log("Express server listening on port %d in %s mode", port, app.settings.env);

redisClient.on('error', function(err){
    console.log('Error is ', err);
});




app.get('/', function(req, res){
    res.render('index', {
        title: 'Search'
    });
});

app.get('/search/:query/:page', function(req, res){
    console.log(req.params.query, req.params.page);
    var searchTerm = req.params.query;
    var page = req.params.page;
    dataRetriever.getSearchData({query:searchTerm, page: page}, redisClient, function(results){
    	res.json(results);
    	
    });
});


app.get('/cardSet/:id', function(req, res){
    var id = req.params.id;
    dataRetriever.getFlashCardData({id: id}, redisClient, function(results){
        res.json(results)
    });
    /*var id = req.params.id;
    var urlSearch = 'http://api.flashcardexchange.com/v1/get_card_set?card_set_id=' + id +'&api_key=sldhana&sort=bestmatch&limit=10&offset=100';
    request(urlSearch, function(error, response, body){
        if(!error && response.statusCode === 200){
            var results = JSON.parse(body).results.flashcards;
            console.log(results);
            res.json(results);
        }
    });
    */
})