//require('nodetime').profile();
// configurations
var SERVER_VERSION = '0.1.1';
var cluster = require('cluster');
require('zenutils');
require('consolelog');
var S = require('string');
var fs = require('fs');

var argv = global.argv = require('optimist')
    .usage('Megafon cost-control synchronization server')
    .options({
        t: {
            alias: 'threads',
            default: require('os').cpus().length
        },
        c: {
            alias: 'config',
            default: './cfgs/' + require('os').hostname() + '.js'
        },
        v: {
            alias: 'version'
        },
        i: {
            alias: 'instance',
            default: 'diff'
        },
        l: {
            alias: 'list-instances'
        }
    })
    .describe({
        'config': 'configuration file',
        'version': 'print version and exit',
        'kill': 'kill running server',
        'status': 'get server status',
        'threads': 'number of threads to start (default = number of processors)',
        'pidfile': 'prints pid file location and exits',
        'instance': 'server instance mode (defines running port and available handlers)',
        'list-instances': 'list all available instances of server'
    }).argv;

var getPidFile = function() {
    return cfg.pidfile+'.'+argv.instance;
}
if (!fs.existsSync(argv.config)) {
    argv.config = './cfgs/' + require('os').hostname() + '.js';
}
var cfg = global.cfg = require(argv.config);
console.setLevel(cfg.log.level);
global.instance = argv.instance;

if (!cfg.instances[global.instance]) {
    console.error('Instance', global.instance, ' not defined.');
    process.exit(1);
}

// arguments
if (argv.v) {
    console.print(SERVER_VERSION);
    process.exit(0);
}

if (argv.pidfile) {
    console.print(getPidFile());
    process.exit(0);
}

if (argv['list-instances']) {
    var instances = cfg.instances.$keys();
    for (var i =0; i < instances.length; i++) {
        console.print(instances[i]);
    }
    process.exit(0);
}

function testDbConnection() {

}

!function core() {

    if (cluster.isMaster) {

        !function master() {
            // Fork workers.
            var timeouts = [];
            var startedWorkers = 0;
            var died = 0;
            var startCompleted = false;
            var exiting = false;
            var dbretry = false;
            var threads = cfg.instances[argv.instance].threads || argv.threads;

            var killer = function () {
                console.info('Server stopping...');
                exiting = true;
                for (var id in cluster.workers) {
                    process.kill(cluster.workers[id].process.pid, 'SIGUSR2');
                }
            }

            process.on('SIGUSR2', killer);

            function errorMsg() {

            }

            cluster.on('fork', function (worker) {
                if (worker.id > 1)
                    timeouts[worker.id] = setTimeout(errorMsg, 2000);
            });
            cluster.on('listening', function (worker, address) {
                clearTimeout(timeouts[worker.id]);
                if (!startCompleted && ++startedWorkers == threads) {
                    console.info('started', startedWorkers, '/', threads, 'workers');
                    startCompleted = true;
                    if (cfg.pidfile) {
                        fs.writeFileSync(getPidFile(), process.pid);
                    }
                }
            });
            cluster.on('exit', function (worker, code, signal) {
                if (!exiting) console.warn('worker', worker.id, 'died with code', code);
                clearTimeout(timeouts[worker.id]);
                delete timeouts[worker.id];
                delete startedWorkers[worker.id];
                if (startCompleted && !exiting && !dbretry) {
                    if (code == 2) {
                        console.warn('Database connection lost');
                        dbretry = setInterval(function dbRetryFun() {
                            var conn;
                            console.warn('Trying to restore connection...');
                            dal.on('connect', function connectionRestored() {
                                conn.close();
                                console.info('Database connection restored');
                                for (var i=0; i<threads; i++) cluster.fork();
                                clearInterval(dbretry);
                            });
                            dal.on('error', function connectionNotRestored() {
                                console.warn('Database connection still lost');
                            });
                            conn = dal.setConnection(cfg.database.default);
                        }, 10000);
                    } else {
                        cluster.fork();
                    }
                } else if (++died == threads && !exiting) {
                    console.error('core', 'All start workers died. Exiting...');
                    try {
                        fs.unlinkSync(getPidFile());
                    } catch (e) {};
                    process.exit(1);
                } else if (exiting && died == threads) {
                    console.info('Server stopped.');
                    process.exit(0);
                }
            });

            var start = function () {
                if (argv.status) {
                    console.print('Server not running.');
                    process.exit(3);
                }
                console.info('starting', threads, 'workers');
                cluster.setupMaster({
                    exec: 'worker.js',
                    args: [argv.config, argv.instance]
                });
                for (var i = 0; i < threads; i++) {
                    cluster.fork();
                }
            }

            if (cfg.pidfile || argv.kill) {
                if (fs.existsSync(getPidFile())) {
                    var pid = parseInt(fs.readFileSync(getPidFile(), 'utf8'));
                    var isRunning = require('is-running');
                    isRunning(pid, function (e, r) {
                        if (e) {
                            console.print('Unable to check pid', pid, e);
                            process.exit(1);
                        }
                        if (r) {
                            if (argv.kill || argv.restart) {
                                try {
                                    process.kill(pid, 'SIGUSR2');
                                } catch(e) {
                                    console.error('kill --SIGUSR2', pid, 'failed (no permissions?)');
                                    process.exit(1);
                                }
                                var waiting = 10;
                                var waiter = function() {
                                    if (waiting-- <= 0) {
                                        console.print('Failed to start.');
                                        process.exit(-1);
                                    }
                                    isRunning(pid, function(e, r) {
                                        if (r) {
                                            process.stdout.write('.');
                                            setTimeout(waiter, 1000);
                                        } else {
                                            console.print(' OK.');
                                            process.exit(0);
                                        }
                                    });
                                };
                                process.stdout.write('Waiting instance ' + global.instance + ' to stop..');
                                waiter();
                                return;
                            }
                            var inst = (S(global.instance)).padRight(10);
                            console.print(inst.toString(), 'running as process', pid);
                            if (argv.status) process.exit(0);
                            process.exit(1);
                        } else {
                            if (argv.kill) {
                                console.print('Instance', global.instance, 'not rinnung');
                                process.exit(1);
                            }
                            if (argv.status) {
                                console.print('Server process', pid, 'not running');
                                process.exit(1)
                            }
                            start();
                        }
                    })
                } else {
                    if (argv.kill) {
                        console.print('Server not rinnung');
                        process.exit(0);
                    }
                    if (argv.kill) {
                        console.print('Server not running');
                        process.exit(3);
                    }
                    start();
                }
            } else {
                console.print('no pidfile configured');
                start();
            }
        }()
    } else {
        console.error('Worker: worker.js');
    }
}()