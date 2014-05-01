/**
 * Basic Config Variables
 * host (string) - Redis hostname (defaults to localhost)
 * port (int) - Redis port (defaults to redis port 6379)
 * ttl (int) - TTL on keys set in redis (defaults to 1 day)
 * redis_password - Password for if Redis server needs auth (defaults to null)
 */
var redis_url = process.env.REDISTOGO_URL || process.env.REDISCLOUD_URL || process.env.REDISGREEN_URL || process.env.REDIS_URL || "redis://127.0.0.1:6379",
    url = require('url'),
    ttl = process.env.PAGE_TTL || 86400

var connection = url.parse(redis_url);

var redis = require('redis'),
    client = redis.createClient(connection.port, connection.hostname);
if (connection.auth) {
    client.auth(connection.auth.split(":")[1]);
}

client.on("error", function (err) {
    console.log("Error " + err);
});

module.exports = {
    init: function () {},

    beforePhantomRequest: function (req, res, next) {
        if (req.method !== 'GET') {
            return next();
        }

        client.get(req.prerender.url, function (err, result) {
            if (!err && result) {
                res.send(200, result);
            } else {
                next();
            }
        });
    },

    afterPhantomRequest: function (req, res, next) {

        if (req.prerender.statusCode === 200) {
            client.set(req.prerender.url, req.prerender.documentHTML, function (err, reply) {
                if (!err && reply && ttl) {
                    client.expire(res.url, ttl, function (err, didSetExpiry) {
                        console.log(!!didSetExpiry);
                    });
                }
            });
        }
        next();
    }
};