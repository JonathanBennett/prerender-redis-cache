prerender-redis-cache
=======================

Prerender plugin for Redis caching, to be used with the prerender node application from https://github.com/prerender/prerender.

How it works
------------

This plugin stores pages returned through prerender in a redis instance. Currently, it caches the pages for 1 day then expires them. This can be overridden by specifying the env variable "process.env.PAGE_TTL" in seconds.

How to use
----------

In your local prerender project run:

    $ npm install prerender-redis-cache --save
    
Then in the server.js that initializes the prerender:

    server.use(require('prerender-redis-cache'));

Configuration
-------------

By default it will connect to your Redis instance running on localhost and the default redis port with no authentication. You can overwrite this by setting the `REDISTOGO_URL`, `REDISCLOUD_URL`, `REDISGREEN_URL` or `REDIS_URL` (in the format redis://user:password@host:port). This currently covers all heroku add-ons for Redis to support quick start.