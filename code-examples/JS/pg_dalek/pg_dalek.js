var pg = require("pg");
require('zenutils');
var _defConn;


events = {};

var pgDalekConnection = function (conn) {
    var events = {};
    this.connection = conn;
    this.connected = false;
    var me = this;
    this.at = function (table) {
        return new Query(this, table);
    };
    this.on = function (ev, handler) {
        if (!events[ev]) {
            events[ev] = [];
        }
        events[ev].push(handler);
    };
    this.fire = function () {
        var args = arguments.$values();
        var ev = args.shift();
//        console.log('EVENT', ev, events[ev]);
        if (!events[ev]) {
//            console.log('no handlers for event', ev);
            return;
        }

        var lim = events[ev].length;
        for (var i = 0; i < lim; i++) {
//            console.log('calling handler', events[ev][i]);
            events[ev][i].apply(events[ev][i], args);
        }
    };
    this.unbind = function (ev, handler) {
        if (!events[ev]) {
            return;
        }

        while ((i = events[ev].indexOf(handler)) > -1) {
            events[ev] = events[ev].slice(0, i).concat(events[ev].slice(i + 1));
        }
    }

    this.query = function (sql, args, cb) {
        if (me.connected) {
            me.connection.query(sql, args, cb);
        } else {
            me.on('connect', function () {
                me.connection.query(sql, args, cb);
            });
        }
    };

    this.on('connect', function () {
        me.connected = true;
    })

    this.close = function() {
        me.connected = false;
        conn.end();
    }
};

var pgDalek = {
        at: function (table) {
            return new Query(_defConn, table);
        },
        sql: function (sql, args, callback) {
            _defConn.query(sql, args, callback);
        },
        initConnection: function (conn) {
            if (typeof conn === 'string') {
                conn = new pg.Client(conn);
                var pgdc = new pgDalekConnection(conn);
//                console.log('connecting to database...');
                conn.connect(function (err) {
                    if (err != null) {
                        pgdc.fire('error', err);
                        pgDalek.fire('error', err);
                        return;
                    }
//                    console.log('CONN connected', conn.database, err);
                    pgdc.fire('connect');
                    pgDalek.fire('connect');
                });
                conn.on('error', function(err) {
                    pgDalek.fire('error', err);
                });
                return pgdc;
            } else if (conn) {
                return new pgDalekConnection(conn);
            } else {
                throw 'No connection parameters specified';
            }
        },
        setConnection: function (conn) {
            _defConn = this.initConnection(conn);
            return _defConn;
        },
        setDefaultConnection: function (conn) {
            _defConn = null;
            this.setConnection(conn);
        },
        getConnection: function () {
            return _defConn;
        },
        on: function (ev, handler) {
            if (!events[ev]) {
                events[ev] = [];
            }
            events[ev].push(handler);
        },
        fire: function () {
            var args = arguments.$values();
            var ev = args.shift();
            if (!events[ev]) {
                return;
            }

            var lim = events[ev].length;
            for (var i = 0; i < lim; i++) {
                events[ev][i].apply(events[ev][i], args);
            }
        },
        unbind: function (ev, handler) {
            if (!events[ev]) {
                return;
            }

            while ((i = events[ev].indexOf(handler)) > -1) {
                events[ev] = events[ev].slice(0, i).concat(events[ev].slice(i + 1));
            }
        },
        now: function () {
            return Math.round((new Date()).getTime() / 1000);
        }

    };


var Query = function (conn, table) {
    var me = this;
    me._table = table;
    me._delayedInserts = [];

    me.transaction = function(works, callback) {
        conn.query('BEGIN;', [], function(e, r) {
            if (e) return callback(e);
            var runWork = function(work, callback) {
                work(function() {
                    var args = arguments.$values();
                    if (args.length > 0) {
                        var err = args.shift();
                        if (err) {
                            conn.query('DISCARD;', function() {
                                return callback(err);
                            })
                            return;
                        }
                    }
                    conn.query('SAVEPOINT;', function(e) {
                        args.unshift(e);
                        callback.apply(callback, args);
                    });
                });
            }

            if (works instanceof Object) {
                if (works instanceof Function) return runWork(works);
                async.map(works, runWork, function workDone(e, r) {
                    if (e) return callback(e);
                    conn.query('COMMIT;', function(e) {
                        if (e) return callback(e);
                        else callback(null, r);
                    });
                });
            }
        });
    }

    me.insert = function (object) {
        me._operation = 'INSERT';
        me._object = object;
        return me;
    }

    me.limit = function(limit) {
        me._limit = limit;
        return me;
    }


    me.update = function (object) {
        me._operation = 'UPDATE';
        me._object = object;
        if (me._where) return callback('update must be called before where');
        me._args = me._args || [];
        for (var column in me._object) {
            me._args.push(me._object[column]);
        }

        return me;
    }

    me.delete = function (callback) {
        me._operation = 'DELETE';
        me.do(callback);
    }

    me.count = function () {
        me.select('count(*)');
        me.column();
        me._count = true;
        return me;
    }

    me.column = function () {
        return me.return('column');
    }

    me.row = function () {
        return me.return('row');
    }

    me.select = function () {
        me._operation = 'SELECT';
        me._object = [];
        for (var i = 0; i < arguments.length; i++) {
            me._object.push(arguments[i]);
        }
        if (me._object.length == 0) me._object.push('*');
        me.where();
        return me;
    }

    me.selin = function (fields, object) {
        me._operation = 'SELIN';
        me._object = object;
        var cond = function(field) {
            me.where().equals(field, object[field]);
        };
        if (fields instanceof Array) {
            for (var i=0; i<fields.length; i++) {
                cond(fields[i]);
            }
        } else {
            cond(fields);
        }
        return me;
    }

    me.upsert = function (field, object) {
        me._operation = 'UPSERT';
        me._object = object;
        me._field = field;

        return me;
    }

    me.put = function (object) {
        me._operation = 'PUT';
        me._object = object;
        return me;
    }

    me.return = function (type) {
        me._return = type;
        return me;
    }

    me.truncate = function (cascade) {
        me._operation = 'TRUNCATE';
        me._cascade = cascade;
        return me;
    }

    me.where = function () {
        me._where = me._where || [];
        me._args = me._args || [];
        return me;
    }

    me.condition = function (field, condition, value) {
        me.where();
        me._where.push('"' + field + '" ' + condition + ' $' + (me._args.length + 1));
        me._args.push(value);
        return me;
    }

    me.equals = function (field, value) {
        return me.condition(field, '=', value);
    }

    me.like = function (field, value) {
        me.condition(field, 'LIKE', value);
    }

    me.less = function (field, value) {
        return me.condition(field, '<', value);
    }

    me.more = function (field, value) {
        return me.condition(field, '>', value);
    }

    me.in = function (field, values) {
        return me.condition(field, 'IN', values);
    }

    me.id = function (id) {
        return me.condition('id', '=', id);
    }

    me.user = function (id) {
        return me.condition('user', '=', id);
    }

    me.notnull = function (field) {
        me._where.push(field + ' IS NOT NULL');
        return me;
    }

    me.isnull = function (field) {
        me._where.push(field + ' IS NULL');
    }

    me.do = function (callback) {
        callback = callback || new Function;
        if (conn === undefined || !conn.connected) {
//            console.log('waiting for connection', conn.connection.database);
            conn.on('connect', function (err) {
                pgDalek.unbind('connect', me);
                if (err) {
                    console.error('Database connection failed', err);
                    return callback(err);
                }
                me.do(callback);
            });
        } else {
            var method = '__' + me._operation;
            if (me[method].compile) {
                me.compile(function (err, sql, args) {
                    if (err) return callback(err);
                    conn.query(sql, args, function (err, result) {
                        if (err != null) {
                            err.sql = sql;
                            err.args = args;
                            return callback.call(null, err);
                        }
                        var rowCount = result.rows.length;
                        if (me._return == 'row') {
                            result = result.rows[0];
                        } else if (me._return == 'column') {
                            result = result.rows[0];
                            if (result) {
                                result = result.$values().pop();
                            }
                        }
                        callback.call(null, err, result);
                    });
                });
            } else {
                me[method](callback);
            }
        }
    }

    me.compile = function (callback) {
        var method = '__' + me._operation;
        if (!me[method].compile) {
            return callback('Method does not support compiling');
        }
        me[method](callback);
    }

    // operations
    me.$hidden('__INSERT', function (callback) {
        var keys = [], args = [], vals = [], sql = "INSERT INTO \"" + me._table + "\" ", j = 1, queryKeysFormed = false;

        if(Object.prototype.toString.call(me._object) !== '[object Array]') {
            me._object = [me._object];
            me._return = "column";
        }

        for (var i = 0; i < me._object.length; i++) {
            vals = [];

            if (!queryKeysFormed) {
                for (var key in me._object[i]) {
                    if (!me._object[i].hasOwnProperty(key)) {
                        continue;
                    }
                    keys.push(key);
                }
                sql += '("' + keys.join('", "') + '") VALUES ';
                queryKeysFormed = true;
            }

            for (var k = 0; k < keys.length; k++) {
                vals.push('$' + j++);
                args.push(me._object[i][keys[k]]);
            }

            sql += '(' + vals.join(', ') + (i < (me._object.length - 1) ? '), ' : ')');
        }

        sql += ' RETURNING id;';

        callback(null, sql, args);
    });

    me.$hidden('__PUT', function (callback) {
        var cols = [], vals = [], args = [], sql = "INSERT INTO \"" + me._table + "\" ", i = 1;
        for (var column in me._object) {
            cols.push('"' + column + '"');
            vals.push('$' + i++);
            args.push(me._object[column]);
        }
        sql += "(" + cols.join(', ') + ') VALUES (' + vals.join(', ') + ');';
        me._return = "column";
        callback(null, sql, args);
    })

    me.$hidden('__UPDATE', function (callback) {
        if (!me._object) return callback('nothing to update');
        var cols = [];
        var sql = "UPDATE \"" + me._table + "\" SET ";
        var i = 1;
        for (var column in me._object) {
            cols.push('"' + column + '" = $' + i++);
        }
        if (!me._where) {
            if (me._object.id) {
                me.equals('id', me._object.id);
            } else {
                return callback('No WHERE clause specified and no id field found');
            }
        }

        sql += cols.join(', ') + ' WHERE ' + me._where.join(' AND ') + ' RETURNING id;';

        callback(null, sql, me._args);
    });

    me.$hidden('__SELECT', function (callback) {
        var cols = ['*'];
        if (me._object) {
            cols = me._object;
        }
        var sql = 'SELECT ' + cols.join(', ') + ' FROM "' + me._table + '"';
        if (me._where && me._where.length) {
            sql += ' WHERE ' + me._where.join(' AND ');
        }

        if (me._limit) {
            sql += ' LIMIT ' + me._limit;
        }

        callback(null, sql, me._args);
    });

    me.$hidden('__DELETE', function (callback) {
        var sql = 'DELETE FROM "' + me._table + '"';
        if (me._where) {
            sql += ' WHERE ' + me._where.join(' AND ');
        }
        callback(null, sql, me._args);
    });

    me.__INSERT.compile =
        me.__PUT.compile =
            me.__SELECT.compile =
                me.__UPDATE.compile =
                    me.__DELETE.compile = true;

    me.$hidden('__SELIN', function (callback) {
        var obj = me._object;
        me._object = ['*'];
        me.__SELECT(function (err, sql, args) {
            conn.query(sql, args, function (err, result) {
                if (err || result.rows.length == 0) {
                    me.insert(obj).do(function (err, id) {
                        if (err) return callback(err);
                        conn.query(sql, args, callback);
                    });
                } else {
                    callback(err, result);
                }
            });
        });
    });

    me.$hidden('__UPSERT', function (callback) {
        me.update(me._object).where().equals(me._field, me._object[me._field]).do(function (err, r) {
            if (err) {
                return callback(err, r);
            }
            if (r.rowCount == 0 || r.rows.length == 0) {
                //nothing found to update
                me.__INSERT(function (e, sql, args) {
                    conn.query(sql, args, function (err, result) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(err, result.rows[0].id);
                        }
                    });
                });
            } else {
                callback(null, r);
            }
        });
    });

    me.$hidden('__TRUNCATE', function (callback) {
        var sql = 'TRUNCATE TABLE ' + me._table;
        if (me._cascade) {
            sql += ' CASCADE';
        }
        conn.query(sql, null, callback);
    });

}

module.exports = pgDalek;