var dbPusher = require('./DBPusher.js');
var config = require('./config.js');
var genProvision = require('./genProvision.js');
var async = require('async');
var http = require('http');
var fs = require('fs');
var framework = require('performanceFramework');

http.globalAgent.maxSockets = 100;


var testFrameWork = framework.describe('Max Pop', 'This benchmark determines the number of transactions that ' +
    'can be popped from a queue in one second. First, some provisions are introduced in the queue and then ' +
    'these transactions are popped. The number of transactions per second can be defined according to the ' +
    'number of transactions in the queue and the elapsed time. The test is repeated increasing the payload ' +
    'of the transactions.', 'wijmo', ['Transactions', 'Milliseconds'],['localhost'], '.');

var doNtimes_queues = function (startNumPops, provision, callback) {

    testFrameWork.test('Payload ' + provision.payload.length + ' bytes', function(log, point) {

        var numPops = startNumPops;

        var _doNtimes_queues = function () {
            async.series([

                /**
                 * Introduces numPops provisions in q0 contacting the data base directly
                 * @param callback
                 */
                    function (callback) {
                    var contResponse = 0;
                    var fillQueue = function () {

                        dbPusher.pushTransaction('UNSEC:', provision, function (err, res) {
                            contResponse++;

                            if (contResponse === numPops) {
                                callback();
                            }
                        });
                    };

                    for (var i = 0; i < numPops; i++) {
                        setTimeout(function () {
                            fillQueue();
                        }, 0);
                    }
                },

                function (callback) {

                    var contResponse = 0;

                    var pop = function (host, port) {

                        var now, end, time, tps, message, nowToString, auxHost;

                        var options = {
                            host: host,
                            port: port,
                            path: '/queue/q0/pop?max=1',
                            method: 'POST',
                            headers: {'Accept': 'application/json'}
                        };

                        var req = http.request(options, function (res) {
                            res.setEncoding('utf8');

                            res.on('error', function (e) {

                                callback('Error: ' + e.message);
                            });

                            res.on('end', function () {
                                contResponse++;
                                if (contResponse === numPops) {
                                    end = new Date().valueOf();
                                    time = end - init;
                                    tps = Math.round((numPops / time) * 1000);
                                    now = new Date();
                                    message = numPops + ' pops with a provision of ' + provision.payload.length +
                                        ' bytes in ' + time + ' milliseconds without errors (' + tps + ' tps)';
                                    nowToString = now.toTimeString().slice(0, 8);
                                    auxHost = (host === 'localhost') ? '127.0.0.1' : host;

                                    console.log(message);

                                    //Add point to the graphic...
                                    log(message);
                                    point(numPops, time);

                                    callback();
                                }
                            });
                        });

                        req.end();

                    };

                    function doPop(host, port) {
                        process.nextTick(function () {
                            pop(host, port);
                        });
                    }

                    var agentIndex;
                    var init = new Date().valueOf();

                    for (var i = 0; i < numPops; i++) {
                        agentIndex = Math.floor(i / config.slice) % config.agentsHosts.length;
                        var host = config.agentsHosts[agentIndex].host;
                        var port = config.agentsHosts[agentIndex].port;

                        doPop(host, port);
                    }
                    /**
                     * Auxiliary function to do a pop. This function choose the agent to do the pop depending on numTimes
                     * (The number of times that the function has been executed).
                     * @param numTimes The number of times that the function has been executed
                     */
                }
            ],
                /**
                 * Function that is called when all pops has been completed (or when an error arises).
                 * @param err
                 * @param results
                 */
                    function (err, results) {
                    if (err) {
                        callback();
                    } else {
                        dbPusher.flushBBDD(function () {
                            //Increase the number of pops until it reaches the maximum number of pops defined in the config file,
                            if (numPops < config.maxPop.max_pops) {

                                numPops += config.maxPop.queues_inteval;
                                _doNtimes_queues(callback);

                            } else {
                                callback();
                            }
                        });
                    }
                }
            );
        };


        _doNtimes_queues();
    });
};

/**
 * This benchmark determines the number of transactions that
 * can be popped from a queue in one second. First, some provisions are introduced in the queue and then
 * these transactions are popped. The number of transactions per second can be defined according to the
 * number of transactions in the queue and the elapsed time.
 */
var doNtimes = function (numPops, payloadLength) {

    var provision = genProvision.genProvision(1, payloadLength);

    doNtimes_queues(numPops, provision, function () {

        //Increase the payload until it reaches the maximum payload size defined in the config file.
        if (payloadLength < config.maxPop.max_payload) {

            payloadLength += config.maxPop.payload_length_interval;
            doNtimes(numPops, payloadLength);

        } else {

            testFrameWork.done();
            dbPusher.closeDBConnections();
        }
    });
};

setTimeout(function() {
    doNtimes(config.maxPop.start_number_pops, config.payload_length);
}, 3000);   //Wait till the agent is running
