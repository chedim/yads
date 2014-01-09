var routes = {};
var fs = require('fs');
var vm = require('vm');
var URL = require('url');
var QS = require('querystring');

exports.setCustomRoutes = function(customRoutes) {
    routes = customRoutes;
}

var routeError = function(request, response) {
    var file = request.statusCode+'.html';
    fs.readFile(process.cwd() + "/errors/" + file, 'utf8', function requestedFileReady(err, data) {
        if (err) {
            response.write('Error '+response.statusCode);
            response.ok();
        } else {
            response.write(data);
            response.ok();
        }
    });

}

var staticRoute = function(request, response) {
    var file = request.url.path.replace(/\.\./g, '.').replace(/\/$/, '/index.html');
    fs.readFile(process.cwd() + "/www/" + file, 'utf8', function requestedFileReady(err, data) {
        if (err) {
            response.statusCode = 404;
            routeError(request, response);
        } else {
            response.write(data);
            response.ok();
        }
    });
}

function callHandler(handler, request, response) {
    var context = vm.createContext({

    })
}

exports.route = function (request, response, callback) {
    var url = request.url;
    var pattern, check, handler, found = 0, notFound = true, error = false, method = request.method.toLowerCase();
    var token = request.token = new Date().getTime() +'-'+Math.round(Math.random()*1000);
    response.setHeader('Content-type', 'text/html;charset=utf8');
    response.ok = function () {
        if (arguments.length > 0) this.write.apply(this, arguments.$values());
        if (--found <= 0) {
            console.http(token, request.method.toUpperCase(), request.url.href, response.statusCode);
            if (request.session) {
                console.debug('Trying to save session', request.session);
                request.session.save(function() {
                    callback();
                });
            } else {
                callback();
            }
        }
    };
    response.__write = response.write;
    response.__body = [];
    response.write = function () {
        var args = arguments.$values();
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] != 'string') {
                args[i] = JSON.stringify(args[i]);
                this.setHeader('Content-Type', 'text/json');
            }
        }
        this.__body = this.__body.concat(args);
    }

    response.redirect = function(url) {
        console.http(token, '->', url);
        this.setHeader('Location', url);
        this.statusCode = 302;
        this.ok();
    }

    response.error = function (code, message) {
        response.statusCode = code;
        console.http(token, request.method.toUpperCase(), request.url.href, response.statusCode);
        if (typeof message != 'string') {
            message = JSON.stringify(message);
        }
        response.write(message);
        this.ok();
    };

    request.url = URL.parse(request.url);
    request.url.args = QS.parse(request.url.query);

    console.debug(token, request);

    for (pattern in routes) {
        check = new RegExp(pattern);
        if (request.url.pathname.match(check)) {
            handler = require(process.cwd() + "/handlers/" + routes[pattern]);
            if (typeof handler[method] == 'function') {
                found++;
                notFound = false;
                request.body = '';
                request.handler = {
                    name: routes[pattern],
                    object: handler
                };
                request.on('data', function (chunk) {
                    request.body += chunk.toString();
                });
                request.on('end', function () {
                    if (request.headers['content-type']) {
                        if (request.headers['content-type'].match('application/x-www-form-urlencoded')) {
                            request.post = QS.parse(request.body);
                        }
                        if (request.headers['content-type'].match(/json/)) {
                            request.post = JSON.parse(request.body);
                        }
                    }
                    if (request.headers.authorization) {
                        require('bearer')(request.headers.authorization, function(err, session) {
                            if (err) {
                                return response.error(401, err);
                            }
                            request.session = session;
//                            try {
                                handler[method](request, response);
//                            } catch(e) {
//                                response.error(500, "Uncaught exception in handler");
//                                console.http(token, 'Uncaught exception in handler', request.handler.name + ':'+method);
//                                console.error(token, e.printStackTrace());
//                            }
                        });
                    } else {
                        if (!handler.public) {
                            return response.error(401, 'Protected URL');
                        }
                        try {
                            handler[method](request, response);
                        } catch (e) {
                            response.error(500, "Uncaught exception in handler");
                            console.http(token, 'Uncaught exception in handler', request.handler.name + ':'+method);
                            console.error(token, e.printStackTrace());
                        }
                    }
                });
            } else {
                console.debug(token, 'handler method not found');
            }
        }
    }
    console.debug(token, 'Found', found, 'handlers');

    if (notFound) {
        staticRoute(request, response);
    }
};
