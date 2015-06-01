/**
 * Basic Config Variables
 * redis_url (string) - Redis hostname (defaults to localhost)
 * ttl (int) - TTL on keys set in redis (defaults to 1 day)
 */
var redis_url = process.env.REDISTOGO_URL || process.env.REDISCLOUD_URL || process.env.REDISGREEN_URL || process.env.REDIS_URL || "redis://127.0.0.1:6379",
    url = require('url'),
    ttl = process.env.PAGE_TTL || 86400;

    var zlib = require('zlib'),
        gzip_level = parseInt(process.env.GZIP_LEVEL) || 0;


    // Parse out the connection vars from the env string.
    var connection = url.parse(redis_url),
    redis = require('redis'),
    client = redis.createClient(connection.port, connection.hostname, {'return_buffers': true}),
    redis_online = false,
    last_error = "",
    last_end_message = ""; // Make redis connection

// Parse out password from the connection string
if (connection.auth) {
    client.auth(connection.auth.split(":")[1]);
}

// Catch all error handler. If redis breaks for any reason it will be reported here.
client.on("error", function (err) {
    if(last_error === err.toString()) {
      // Swallow the error for now
    } else {
      last_error = err.toString();
      console.log("Redis Cache Error: " + err);
    }
});
//
client.on("ready", function () {
    redis_online = true;
    console.log("Redis Cache Connected");
});

client.on("end", function (err) {
  if(err) {
    err = err.toString();
    if(last_end_message == err) {
      // Swallow the error for now
    } else {
      last_end_message = err;
      redis_online = false;
      console.log("Redis Cache Conncetion Closed. Will now bypass redis until it's back.");
    }
  }
});

function redisSet(key, val) {
    client.set(key, val, function (err, reply) {
        // If library set to cache set an expiry on the key.
        if (!err && reply && ttl && ttl != 0) {
            client.expire(key, ttl, function (err, didSetExpiry) {
                console.warn(!!didSetExpiry);
            });
        }
    });
}

module.exports = {
    beforePhantomRequest: function (req, res, next) {
        //
        if (req.method !== 'GET' || redis_online !== true) {
            return next();
        }

        client.get(req.prerender.url, function (err, result) {

            // Page found - return to prerender and 200
            if (!err && result) {
                if (gzip_level > 0) {
                    zlib.gunzip(result, function (gzip_err, gunzip_result) {
                        if (!gzip_err && gunzip_result) {
                            res.send(200, gunzip_result);
                        }
                        else {
                            console.log("Failed to decompress key value, maybe you should flush your cache?");
                            next();
                        }
                    });
                } else {
                    res.send(200, result);
                }
            } else {
                next();
            }
        });
    },

    afterPhantomRequest: function (req, res, next) {
        if (redis_online !== true) {
            return next();
        }
        // Don't cache anything that didn't result in a 200. This is to stop caching of 3xx/4xx/5xx status codes
        if (req.prerender.statusCode === 200) {
            if (gzip_level > 0) {
                zlib.gzip(req.prerender.documentHTML, {'level': gzip_level}, function (gzip_err, gzip_result) {
                    if (!gzip_err) {
                        redisSet(req.prerender.url, gzip_result);
                    }
                });
            } else {
                redisSet(req.prerender.url, req.prerender.documentHTML);
            }

        }
        next();
    }
};
