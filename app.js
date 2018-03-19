const bodyParser = require('body-parser');
const kue = require('kue');
const fs = require('fs');

const winston = require('winston');
winston.add(winston.transports.File, {filename: 'dump.log'});

const express = require('express');
const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.set('views', __dirname + '/jade');
app.set('view engine', 'jade');

const db = require('./db');

var queue = null;
var notification_pusher = null;

// ===========================================================
// ping
// ===========================================================

app.get('/ping', function (req, res) {
    res.send('pong');
});

// ===========================================================
// Push notification
// ===========================================================

app.get('/push_register', function (req, res) {
    var userId = buildPushUserId(req.query.user_id, req.query.user_type, req.query.os);
    notification_pusher.register(userId, req.query.device_token, function(result) {
        res.send(result);
    });
});

app.get('/push_unregister', function (req, res) {
    var userId = buildPushUserId(req.query.user_id, req.query.user_type, req.query.os);
    notification_pusher.unregister(userId, req.query.device_token, function(result) {
        res.send(result);
    });
});

app.post('/push', function (req, res) {
    if (req.body.os) {
        sendNotification(req.body.user_id, req.body.user_type, req.body.os, req.body.message, req.body.params, function(result) {
            res.send(result);
        });
    } else {
        sendNotification(req.body.user_id, req.body.user_type, 'os', req.body.message, req.body.params, function(result) {
            sendNotification(req.body.user_id, req.body.user_type, 'android', req.body.message, req.body.params, function(result) {
                res.send(result);
            });
        });
    }
});

// ===========================================================
// Start server
// ===========================================================

const PORT = 3000;

app.listen(PORT, function () {
    winston.info('Server listening on port ' + PORT);

    queue = kue.createQueue();
    queue.on('error', function (err) {
        winston.info('Oops... ', err);
    });

    notification_pusher = require('./notification_pusher')(db, queue);

    restartTasks();
});

// ===========================================================
// Functions
// ===========================================================

function sendNotification(userId, userType, os, message, params, callback) {
    var users = userId.split(';');
    for (u in users) {
        var user = users[u];
        var uid = buildPushUserId(user, userType, os);
        notification_pusher.send(uid, message, params, function(result) {
            if (result.failed) {
                for (i in result.failed) {
                    winston.info(result.failed[i].response);
                }
            }
            callback(result);
        });
    }
}

function buildPushUserId(userId, userType, userOS) {
    return userId + "_" + userType + "_" + userOS;
}

function restartTasks() {
    queue.inactive(function (err, ids) {
        ids.forEach(function (id) {
            winston.info('mark inactive job ' + id + ' as failed');
            kue.Job.get(id, function (err, job) {
                job.failed();
            });
        });
    });

    queue.active(function (err, ids) {
        ids.forEach(function (id) {
            winston.info('re-queue job ' + id);
            kue.Job.get(id, function (err, job) {
                job.inactive();
            });
        });
    });
}