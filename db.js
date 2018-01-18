var db = (function() {

	const mysql = require('mysql');

	// ===========================================================
	// SQL
	// ===========================================================

    function getSQLConnection() {
        var connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : 's1s2s3',
            database : 'push_db'
        });
        return connection;
    }

	function sqlInsert(table, params, callback) {
		var connection = getSQLConnection();

		connection.connect();
		 
		var keys = '';
		for (var key in params) {
			if ('' != keys) {
				keys += ',';
			}
		  	keys += '`' + key + '`';
		  	console.log('\t' + key + "=" + params[key]);
		}

		var values = '';
		for (var key in params) {
			if ('' != values) {
				values += ',';
			}
		  	values += '\'' + params[key] + '\'';
		}

		var q = "INSERT IGNORE INTO `" + table + "` (";
		q += keys;
		q += ") VALUES (";
		q += values;
		q += ")";
		console.log(q);
			 
		connection.query(q, function(err, result) {
			var resId = 0;
			if (result) {
				resId = result.insertId;
			}
			callback(err, resId);

			connection.end();
		});
	}

	function sqlInsertBulk(q, values, callback) {
		var connection = getSQLConnection();
		connection.connect();
		console.log(values);
		connection.query(q, [values], function(err) {
		    connection.end();
		    if (err) {
		    	console.log(err);
		    }
		    callback(err);
		});
	}

	function sqlUpdate(table, params, where, callback) {
		var connection = getSQLConnection();

		connection.connect();

		var values = '';
		for (var key in params) {
			if ('' != values) {
				values += ',';
			}
		  	values += '`' + key + '`' + "=" + '\'' + params[key] + '\'';
		}

		var q = "UPDATE `" + table + "` SET ";
		q += values;
		q += " WHERE " + where;
		console.log(q);
			 
		connection.query(q, function(err, rows, fields) {
			connection.end();

			callback(err);
		});
	}

	function sqlDelete(table, where, callback) {
		var connection = getSQLConnection();

		connection.connect();

		var q = "DELETE from `" + table + "`";
		q += " WHERE " + where;
		console.log(q);
			 
		connection.query(q, function(err, rows, fields) {
			connection.end();

			callback(err);
		});	
	}

	function sqlCount(table, where, callback) {
		var connection = getSQLConnection();

		connection.connect();

		var q = "SELECT COUNT(*) AS count FROM `" + table + "`";
		if (where) {
			q += " WHERE " + where;
		}	
		console.log(q);
			 
		connection.query(q, function(err, rows, fields) {
			callback(err, rows);
		});
		 
		connection.end();
	}

	function sqlSelect(table, filter, where, callback) {
		if (null == filter) {
			filter = '*';
		}
		var q = "SELECT " + filter + " FROM `" + table + "`";
		if (where) {
			q += " WHERE " + where;
		}
		console.log(q);

		// var result = sqlCache.get(q);
		// if (result) {
		// 	if (Date.now() - result.time < 1000 * 60 * 5) {
		// 		console.log('load from cache');
		// 		callback(null, result.data);
		// 		return;
		// 	} else {
		// 		sqlCache.remove(q);
		// 	}		
		// }

		var connection = getSQLConnection();
		connection.connect();

		connection.query(q, function(err, rows, fields) {
			connection.end();

			if (err) {
				console.log(err);
				callback(err, null);
			} else {
				//console.log('results:' + rows.length);
				callback(null, rows);
				if (rows.length > 0) {
					//sqlCache.set(q, {time: Date.now(), data: rows});
				}			
			}		  
		});
	}

	function sqlSelectQuery(q, callback) {
		console.log(q);
		var connection = getSQLConnection();
		connection.connect();
		connection.query(q, function(err, rows, fields) {
			connection.end();

			if (err) {
				console.log(err);
				callback(err, null);
			} else {
				callback(null, rows);
			}		  
		});
	}

	// ===========================================================
    // Export
    // ===========================================================

    return {
        select : sqlSelect,
        query : sqlSelectQuery,
        count : sqlCount,
        delete : sqlDelete,
        update : sqlUpdate,
        insert : sqlInsert,
        insertBulk : sqlInsertBulk
    }
})();

// ===========================================================
// export
// ===========================================================

module.exports = db;