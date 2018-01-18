module.exports = function (db, queue) {

    const apn = require('apn');

    var apn_options = {
        token: {
            key: "AuthKey_EUVE5EW7B2.p8",
            keyId: "EUVE5EW7B2",
            teamId: "64XN5JLDFL"
        },
        production: false
    };
    var apnProvider = new apn.Provider(apn_options);

    // ===========================================================
    // SQL
    // ===========================================================

    function init() {
        db.select('push_device', '*', null, function (err, results) {
            if (err) {
                var createSQL = "CREATE TABLE `push_device` (`id` int(11) unsigned NOT NULL AUTO_INCREMENT,`user_id` varchar(32) NOT NULL DEFAULT '',`device_token` varchar(255) NOT NULL DEFAULT '',PRIMARY KEY (`id`),KEY `user_id` (`user_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
                db.query(createSQL, function (err, results) {
                    if (!err) {
                        console.log('push_device table created');
                    }
                });
            } else {
                console.log('push_device table found');
            }
        });

        db.select('push_messages', '*', null, function (err, results) {
            if (err) {
                var createSQL = "CREATE TABLE `push_messages` (`id` int(11) unsigned NOT NULL AUTO_INCREMENT,`device` varchar(255) NOT NULL DEFAULT '',`message` varchar(255) DEFAULT NULL,`params` varchar(255) DEFAULT NULL,`sent` tinyint(4) NOT NULL DEFAULT '0',PRIMARY KEY (`id`),KEY `device` (`device`)) ENGINE=InnoDB DEFAULT CHARSET=utf8;";
                db.query(createSQL, function (err, results) {
                    if (!err) {
                        console.log('push_messages table created');
                    }
                });
            } else {
                console.log('push_messages table found');
            }
        });

        queue.process('push_message_ios', 8, function (job, done) {
            try {
                apnPush(job.data.device, job.data.message, job.data.params, function(result) {
                    markMessageAsSent(job.data.id, done);
                });
            } catch (e) {
                console.log('jobid:' + job.id + ' exception');
                done(new Error('error: ' + 0));
            }
        });
        queue.process('push_message_android', 8, function (job, done) {
            try {
                gcmPush(job.data.device, job.data.message, job.data.params, function(result) {
                    markMessageAsSent(job.data.id, done);
                });
            } catch (e) {
                console.log('jobid:' + job.id + ' exception');
                done(new Error('error: ' + 0));
            }
        });
    }


    function register(userId, deviceId, callback) {
        console.log('register: ' + userId + ',' + deviceId);
        if (userId && deviceId) {
            db.select('push_device', null, "`user_id`='" + userId + "'", function(err, rows) {
               if (rows && rows.length > 0) {
                   db.update('push_device', {device_token: deviceId}, "`user_id`='" + userId + "'", function(err) {});
               } else {
                   db.insert('push_device', {user_id: userId, device_token: deviceId}, function (err, resId) {
                       if (err) {
                           callback({status:"fail"});
                       } else {
                           callback({status:"success"});
                       }
                   });
               }
            });
        } else {
            callback({status:"fail"});
        }
    }

    function unregister(userId, deviceId, callback) {
        console.log('unregister: ' + userId + ',' + deviceId);
        if (userId && deviceId) {
            db.delete('push_device', "`user_id`='" + userId + "' AND `device_token`='" + deviceId + "'", function (err, resId) {
                if (err) {
                    callback({status:"fail"});
                } else {
                    callback({status:"success"});
                }
            });
        } else {
            callback({status:"fail"});
        }
    }

    function send(userId, message, params, callback) {
        console.log('send: ' + userId + ',' + message + ',' + params);
        if (!message) {
            message = '';
        }
        if (!params) {
            params = '';
        }
        if (userId) {
            db.select('push_device', '`device_token`', "`user_id`='" + userId + "'", function (err, rows) {
                if (err) {
                    callback({status:"fail"});
                } else {
                    for (r in rows) {
                        var deviceId = rows[r].device_token;
                        var m = {device: deviceId, message: message, params: params};
                        db.insert('push_messages', m, function (err, resId) {
                            console.log('insert push message: ' + resId);
                            m['id'] = resId;

                            var osSplitIndex = userId.lastIndexOf('_');
                            var os = userId.substring(osSplitIndex + 1);
                            addPushTask(os, m, function(result) {});
                        });
                    }
                    callback({status:"success"});
                }
            });
        } else {
            callback({status:"fail"});
        }
    }

    function addPushTask(os, data, callback) {
        console.log('addPushTask: ' + 'push_message_' + os);
        
        var job = queue.create('push_message_' + os, data);
        job.on('complete', function (result) {
            console.log('Job completed with data ', result);
        }).on('failed attempt', function (errorMessage, doneAttempts) {
            console.log('Job failed : addUploadLoggerTask');
            console.log(errorMessage);
        }).on('failed', function (errorMessage) {
            console.log('Job failed : addUploadLoggerTask');
            console.log(errorMessage);
        }).on('progress', function (progress, data) {
            console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data);
        });
        job.save(function (err) {
            if (!err) {
                console.log('Job added: ' + job.id);
                callback(job.id);
            } else {
                callback(-1);
            }
        });
        return job.id;
    }
    
    function apnPush(deviceToken, msg, params, callback) {
        if (!deviceToken) {
            return res.send({error:'missing device'});
        }
        if (!msg) {
            return res.send({error:'missing message'});
        }

        var note = new apn.Notification();
        note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
        note.badge = 3;
        note.sound = "ping.aiff";
        note.alert = msg;
        note.payload = {'params': params};
        note.topic = "com.classicphotographers";

        console.log(deviceToken);
        console.log(msg);
        console.log(note);

        apnProvider.send(note, deviceToken).then( (result) => {
            console.log(result);
            callback(result);
        });
    }

    function gcmPush(deviceToken, msg, params, callback) {
        callback({});
    }

    function markMessageAsSent(id, callback) {
        db.update('push_messages', {sent: 1}, "`id`='" + id + "'", function(err) {
            callback();
        });
    }

    // ===========================================================
    // Main
    // ===========================================================

    init();

    // ===========================================================
    // Export
    // ===========================================================

    return {
        register : register,
        unregister : unregister,
        send : send
    }
};
