var mongodb = require("mongodb"),
    assert = require("assert"),
    util = require("util"),
    http = require("http");

exports.port = 1083;

exports.batch = function(batch) {
  return {
    "": {
      topic: function() {
        var client = new mongodb.Server("localhost", 27017);
            db = new mongodb.Db("cube_test", client),
            cb = this.callback;
        db.open(function(error) {
          var collectionsRemaining = 2;

          db.dropCollection("test_events", function(error) {
            db.createCollection("test_events", function(error, events) {
              events.ensureIndex({t: 1}, collectionReady);
            });
          });

          db.dropCollection("test_metrics", function(error) {
            db.createCollection("test_metrics", {capped: true, size: 1e6, autoIndexId: false}, function(error, metrics) {
              var indexesRemaining = 3;
              metrics.ensureIndex({e: 1, l: 1, t: 1, g: 1}, {unique: true}, indexReady);
              metrics.ensureIndex({i: 1, e: 1, l: 1, t: 1}, indexReady);
              metrics.ensureIndex({i: 1, l: 1, t: 1}, indexReady);
              function indexReady() {
                if (!--indexesRemaining) {
                  collectionReady();
                }
              }
            });
          });

          function collectionReady() {
            if (!--collectionsRemaining) {
              cb(null, {client: client, db: db});
            }
          }
        });
      },
      "": batch,
      teardown: function(test) {
        if (test.client.isConnected()) {
          test.client.close();
        }
      }
    }
  };
};

exports.request = function(options, data) {
  return function() {
    var cb = this.callback;

    options.host = "localhost";

    var request = http.request(options, function(response) {
      response.body = "";
      response.setEncoding("utf8");
      response.on("data", function(chunk) { response.body += chunk; });
      response.on("end", function() { cb(null, response); });
    });

    request.on("error", function(e) { cb(e, null); });

    if (arguments.length > 1) request.write(data);
    request.end();
  };
};

// Disable logging for tests.
util.log = function() {};
