var request = require('request'), querystring = require('querystring');

var resultsPerCall = 10;
var lengthToCache = 86400;

exports.getSearchData = function(options, redisClient, callback) {
    var searchTerm = options.query.toLowerCase();
    var currentPage = options.page;
    var offset = 0;

    if(currentPage > 1) {
        offset = (currentPage - 1) * resultsPerCall;
    }

    redisClient.get(searchTerm + '_' + currentPage, function(err, reply) {
        if(reply === null) {
            allResults = [];

            var urlSearch = 'http://api.flashcardexchange.com/v1/search?q=' + escape(searchTerm) + '&api_key=sldhana&sort=bestmatch&limit=' + resultsPerCall + '&offset=' + offset;
            //var urlSearch = 'http://api.flashcardexchange.com/v1/get_tag?tag=' + searchTerm + '&api_key=sldhana&page=1&indent=no';
            request(urlSearch, function(error, response, body) {
                if(!error && response.statusCode === 200) {
                    parsedBody = JSON.parse(body);
                    console.log(parsedBody);
                    if(parsedBody.results.meta.total !== '') {
                        var results = JSON.parse(body).results;
                        var term = searchTerm + '_' + currentPage;
                        redisClient.set(term, body, redisClient.print);
                        redisClient.expire(term, lengthToCache);
                        
                        callback(results);
                    } else {
                        callback([]);
                    }
                }
            });
        } else {
            console.log("in here cached");
            redisClient.get(searchTerm + '_' + currentPage, function(err, reply) {
                callback(JSON.parse(reply).results);
            });
        }
    });
}

exports.getFlashCardData = function(options, redisClient, callback) {
    var id = options.id

    
    redisClient.get(id, function(err, reply) {
        if(reply === null) {
            var urlSearch = 'http://api.flashcardexchange.com/v1/get_card_set?card_set_id=' + id + '&api_key=sldhana&sort=bestmatch&limit=10&offset=100';
            request(urlSearch, function(error, response, body) {
                if(!error && response.statusCode === 200) {
                    var results = JSON.parse(body).results.flashcards;
                    redisClient.set(id, body, redisClient.print);
                    redisClient.expire(id, lengthToCache);
                    callback(results)
                } else {
                    callback([]);
                }
            });
        } else {
            redisClient.get(id, function(err, reply) {
                callback(JSON.parse(reply).results.flashcards);
            });
        }
    });
}
function makeRequest(searchTerm, page) {
    var offset = resultsPerCall * currentPage;
    var urlSearch = 'http://api.flashcardexchange.com/v1/search?q=' + escape(searchTerm) + '&api_key=sldhana&sort=bestmatch&limit=' + resultsPerCall + '&offset=' + offset;

    request(urlSearch, function(error, response, body) {
        if(!error && response.statusCode === 200) {
            parsedBody = JSON.parse(body);
            if(parsedBody.results.meta.total !== '') {
                var results = JSON.parse(body).results.sets;
                redisClient.set(searchTerm, body, redisClient.print);
                callback(results);
            } else {
                callback([]);
            }
        }
    });
}