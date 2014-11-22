var util   = require('./../sockets/util.js'),
    redis  = require('redis'),
    db_num = 15;  // use database # 15 for testing

describe('util', function () {
    var client;

    /*
     * Connect to Redis before running the test suite.
     * Also, select a database for testing.
     */
    before(function (done) {
        var redis_host  = "127.0.0.1",
            redis_port  = 6379;

        client = redis.createClient(redis_port, redis_host);
        client.select(db_num);
        client.flushdb();
    });

    /*
     * Clear the database after each test.
     */
    afterEach(function (done) {
        client.flushdb();
    });

    /*
     * Tests.
     */

    it('should archive messages by timestamp', function (done) {
        /*
         * TODO: need to set db in util module as well, so that we can
         * configure it with a db for testing.
         */
        util.archive('some message');
        /* check redis to make sure message archived and timestamp is
         * reasonable.
         */
        done();
    });

});
