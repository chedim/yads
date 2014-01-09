!function (w) {


    Object.method('buildQueryString', function () {
        var query = [];
        for (var i in this) {
            query.push(encodeURIComponent(i) + '=' + encodeURIComponent(this[i]));
        }
        return query.join('&');
    })

    String.method('get',function () {
        var ajax = getAjax();
        var url = this;
        var ok = null;
        var fail = null;
        var query = '';
        var al = arguments.length;
        for (var i = 0; i < al; i++) {
            if (typeof arguments[i] == 'function') {
                if (ok == null) {
                    ok = arguments[i];
                } else {
                    fail = arguments[i];
                }
            } else {
                query = arguments[i];
                if (typeof query == 'object') {
                    query = query.buildQueryString();
                }
            }
        }
        if (query) {
            if (url.match('\\?')) url += '&' + query;
            else url += '?' + query;
        }
        ajax.open('GET', url, true);
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4 && ((ajax.status > 199 && ajax.status < 300) || (window.device && ajax.status == 0))) {
                if (typeof ok == 'function')
                    ok.call(ajax, ajax.responseText);
            } else if (ajax.readyState == 4) {
                if (typeof fail == 'function')
                    fail.call(ajax);
            }
        };
        ajax.send();
    }).method('post',function () {
            var ajax = getAjax();
            var url = this;
            var ok = null;
            var fail = null;
            var data = null;
            var al = arguments.length;
            for (var i = 0; i < al; i++) {
                switch (typeof arguments[i]) {
                    case 'object':
                        data = arguments[i];
                        break;
                    case 'function':
                        if (ok === null) ok = arguments[i];
                        else fail = arguments[i];
                        break;
                }
            }
            ;

            ajax.open('POST', url);
            ajax.onreadystatechange = function () {
                if (ajax.readyState == 4 && ((ajax.status > 199 && ajax.status < 300) || (window.device && ajax.status == 0))) {
                    if (typeof ok == 'function')
                        ok.call(ajax, ajax.responseText);
                } else if (ajax.readyState == 4) {
                    if (typeof fail == 'function')
                        fail.call(ajax);
                }
            }
            if (data instanceof Blob) {
                ajax.send(data);
            } else {
                ajax.send(JSON.stringify(data));
            }
        }).method('delete', function () {
            var ajax = getAjax();
            var url = this;
            var ok = null;
            var fail = null;
            var data = null;
            var al = arguments.length;
            for (var i = 0; i < al; i++) {
                switch (typeof arguments[i]) {
                    case 'object':
                        data = arguments[i];
                        break;
                    case 'function':
                        if (ok === null) ok = arguments[i];
                        else fail = arguments[i];
                        break;
                }
            }
            ;

            ajax.open('DELETE', url);
            ajax.onreadystatechange = function () {
                if (ajax.readyState == 4 && ((ajax.status > 199 && ajax.status < 300) || (window.device && ajax.status == 0))) {
                    if (typeof ok == 'function')
                        ok.call(ajax, ajax.responseText);
                } else if (ajax.readyState == 4) {
                    if (typeof fail == 'function')
                        fail.call(ajax);
                }
            }
            if (data instanceof Blob) {
                ajax.send(data);
            } else {
                ajax.send(JSON.stringify(data));
            }
        });

    String.method('toCSS', function () {
        var csst = $('<STYLE type="text/css" scoped>' + this + '</STYLE>');
        return csst;
    });

    Number.method('decl', function declOfNum(titles) {
        number = this;
        cases = [2, 0, 1, 1, 1, 2];
        return titles[ (number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5] ];
    });

    var apps = {};

    var xApplicationSource = w.Class('xApplicationSource', function (url, source) {
        if (typeof apps[url] != 'function') {
            console.error('Invalid source:', url, apps[url]);
            throw 'Unknown application source: ' + url;
        }
        apps[url](source);
    });

    var xApplication = w.Class('xApplication',function xApplication(url, onReady) {
        var me = this;
        if (url.substr(0, 1) != '/') url = '/' + url;
        if (!url.match(/^\/app/)) url = '/app' + url;
        if (url.match(/\/$/)) url = url.substr(0, url.length - 1);
        if (!url.match(/\.json$/)) url += '.json';
        me.url = url;
        me.id = url.replace('/app/', '').replace(/\//g, '_').replace('.json', '');
        me.private('processes', []);
        me.queue = [];
        apps[url] = function (source) {
            me.private('source', source);
            delete apps[url];
            if (onReady) onReady.call(me);
            if (me.queue) {
                for (var i = 0; i < me.queue.length; i++) {
                    me.start(me.queue[i]);
                }
            }
        }
        var node = document.createElement('SCR' + 'IPT');
        node.id = url;
        node.setAttribute('src', url);
        try {
            document.getElementsByTagName('head')[0].appendChild(node);
        } catch (e) {
            console.log(url + 'failed: ' + e);
        }
        ;
    }).method('start',function start() {
            var me = this;
            var cb = false;
            var plugin = false;

            for (var i = 0; i < arguments.length; i++) {
                if (typeof arguments[i] == 'function') cb = arguments[i];
                else plugin = arguments[i];
            }

            // checking is app loaded
            if (!me.source) {
                console.log(me.url, 'start queued');
                me.queue.push(cb);
                return;
            }
            console.log('START', me.url);

            var process = new xProcess;
            process.application = this;
            var data = this.source;
            if (data === undefined)
                data = {};
            if (data.data !== undefined)
                data.data.$clone(process);

            var buildProcess = function (cb) {
                if (data.js !== undefined) {
                    if (data.js.vals().length > 1) {
                        for (var i in data.js) {
                            process.method(i, data.js[i]);
                        }
                    } else if (data.js.vals().length == 1) {
                        data.js.init.apply(process);
                    }
                    if (!process.init) {
                        throw new Error('Application ' + this.url + ' does not have init function');
                    }
                } else {
                    process.init = function () {
                        console.log('SIMPLE INIT', process.container);
                        $(process.container).html($(this.html.vals().join('\n')));
                    }
                }

                if (data.css !== undefined) {
                    process.private('cssNode', data.css.vals().join('\n\n').toCSS());
//                    document.getElementsByTagName('head')[0].appendChild(process.cssNode);
                }

                if (data.html !== undefined) {
                    process.private('html', {});
                    for (var i in data.html) {
                        process.html[i] = data.html[i];
                    }
                }
                if (cb) cb();
            };

            // running required processes
            if (!(me.bootstrap || plugin)) {
                if (!data.require) {
                    data.require = { parent: 'bootstrap'};
                } else if (!data.require.parent) {
                    data.require.parent = 'bootstrap';
                }
            }
            if (!data.require) {
                data.require = {};
            }

            var requireParent = function () {
                if (data.require.parent) {
                    console.log('requiring parent', data.require.parent, 'for:', me.url);
                    X.getApp(data.require.parent, function () {
                        console.log('Parent getted:', this);
                        var parent = this.asApp(function () {
                            console.log('parent process:', this);
                            process.parent = this;
                            var finish = function () {
                                process = process.parent.addChild(process);
                                if (!process) {
                                    throw "Parent process abandoned child from url " + me.url;
                                }
                                if (!process.container) {
                                    console.log('no container for process', me.url);
                                }
                                buildProcess(function () {
                                    if (cb) {
                                        cb.call(process);
                                    }
                                });

                            }
                            var parent = this;
                            if (parent.state == 0) {
                                parent.create(function () {
                                    console.log(process.application.url, 'parent inited');
                                    parent.run();
                                    finish();
                                });
                            } else {
                                if (parent.state != 1) parent.run();
                                finish();
                            }
                        })
                    });
                } else {
                    if (me.bootstrap) {
                        process.container = document.body;
                    }
                    buildProcess(function () {
                        me.processes.push(process);
                        cb.call(process);
                    });
                }
            };

            if (data.require.libs) {
                var rq = data.require.libs.slice();
                rq.push(requireParent);
                include.apply(null, rq);
            } else {
                requireParent();
            }
        }).method('post',function () {
            var me = this;
            me.url.post.apply(me.url, arguments);
        }).method('delete',function () {
            var ajax = getAjax();
            var url = this.url;
            var ok = null;
            var fail = null;
            var data = null;
            var al = arguments.length;
            for (var i = 0; i < al; i++) {
                switch (typeof arguments[i]) {
                    case 'object':
                        data = arguments[i];
                        break;
                    case 'function':
                        if (ok === null) ok = arguments[i];
                        else fail = arguments[i];
                        break;
                }
            }
            ;

            ajax.open('DELETE', url);
            ajax.onreadystatechange = function () {
                if (ajax.readyState == 4 && ((ajax.status > 199 && ajax.status < 300) || (window.device && ajax.status == 0))) {
                    if (typeof ok == 'function')
                        ok.call(ajax, ajax.responseText);
                } else if (ajax.readyState == 4) {
                    if (typeof fail == 'function')
                        fail.call(ajax);
                }
            }
            ajax.send(JSON.stringify(data));
        }).method('asApp',function (cb) {
            for (var i = 0; i < this.processes.length; i++) {
                if (this.processes[i].mode == 'app') {
                    console.log('asApp found', this, this.processes[i]);
                    cb.call(this.processes[i]);
                    return;
                }
            }
            console.log('AsApp not found', this.processes);
            this.start(function () {
                this.mode = 'app';
                cb.call(this);
            });
        }).method('getPluginInstances', function (inState) {
            var ret = [];
            for (var i = 0; i < this.processes.count; i++) {
                if (this.processes[i].mode == 'plugin' && this.processes[i].state == inState) {
                    ret.push(this.processes[i]);
                }
            }
            return ret;
        });

    var xProcess = w.Class('xProcess',function xProcess() {
        this.private('state', 0);
        this.childrens = {};
        this.plugins = [];
        this.container = null;
    }).method('create',function init(ok) {
            var me = this;
            var done = function () {
                console.log('INIT DONE ^_^', me.application.url);
                window.runPlugins(this.container, function (plugins) {
                    me.plugins = plugins;
                    me.application.processes.push(me);
                    X.process.all.push(me);
                    if (ok) ok(me);
                });
            }

            this._container = $(this.container);
            if (!this.application.bootstrap) {
                this.container = $('>div._xapp', this._container);
                if (!this.container.length) {
                    var c = this.container = $('<div class="_xapp"/>');
                    $('> *', this._container).each(function(i, e) {
                        $(e).detach();
                        c.append(e);
                    });
                    this._container.append(this.container);
                }
            }
            if (this.cssNode != undefined) {
                this._container.append(this.cssNode);
            }

            if (me.init) {
                console.log(me.application.url, 'init.length', me.init.length);
                if (me.init.length > 0) {
                    console.log(me.application.url, 'async init');
                    me.init(done);
                    return;
                } else {
                    me.init();
                }
            }
            console.log(me.application.url, 'sync init');
            done();
        }).method('stop',function stop(node) {
            // stopping childrens and plugins
            console.log('Stopping process', this);
            for (var i in this.childrens) {
                this.childrens[i].stop();
            }
            for (i = 0; i < this.plugins.length; i++) {
                this.plugins[i].stop();
            }
            X.process.active = X.process.active.exclude(this);
            X.process.all = X.process.all.exclude(this);
            if (this.mode == 'app')
                X.process.apps = X.process.apps.exclude(this);
            this.application.processes = this.application.processes.exclude(this);
            if (this.cssNode) {
                $(this.cssNode).detach();
            }
            if (this.lessNode) {
                $(this.lessNode).detach();
            }
//            if (node)
//                $(this.container).replaceWith(node);
//            else
//                $(this.container).detach();
            this.state = -1;

            if (this.onpause)
                this.onpause();

            if (this.onstop)
                this.onstop();
            return true;
        }).method('pause',function pause() {
            // pausing childrens and plugins
            for (var i in this.childrens) {
                this.childrens[i].pause();
            }
            for (i = 0; i < this.plugins.length; i++) {
                this.plugins[i].pause();
            }
            X.process.active = X.process.active.exclude(this);
            if (this.mode == 'app')
                X.process.apps = X.process.apps.exclude(this);
            if (this.onpause)
                this.onpause();
            this.state = 2;
        }).method('run',function run() {
            // running childrens and plugins
            for (var i in this.childrens) {
                this.childrens[i].run();
            }
            for (i = 0; i < this.plugins.length; i++) {
                this.plugins[i].run();
            }
            X.process.active.push(this);
            if (this.mode == 'app') X.process.apps.push(this);

            this.container.process(this);
            if (this.onrun)
                this.onrun();
            this.state = 1;
        }).method('refresh',function () {
            var me = this;
            var url = me.application.url;
            var ajax = getAjax();
            var ok = null;
            var fail = null;
            var data = null;
            var al = arguments.length;
            for (var i = 0; i < al; i++) {
                switch (typeof arguments[i]) {
                    case 'object':
                        data = arguments[i];
                        break;
                    case 'function':
                        if (ok === null) ok = arguments[i];
                        else fail = arguments[i];
                        break;
                }
            }


            ajax.open('REFRESH', url);
            ajax.onreadystatechange = function () {
                if (ajax.readyState == 4 && ((ajax.status > 199 && ajax.status < 300) || (window.device && ajax.status == 0))) {
                    var data = JSON.parse(ajax.responseText);
                    if (data.data) {
                        data.data.$clone(me);
                    }
                    if (typeof ok == 'function')
                        ok.call(me);
                } else if (ajax.readyState == 4) {
                    if (typeof fail == 'function')
                        fail.call(me);
                }
            }
            ajax.send(JSON.stringify(data));
        }).method('post',function () {
            var me = this;
            var url = me.application.url;
            var ajax = getAjax();
            var ok = null;
            var fail = null;
            var data = null;
            var al = arguments.length;
            for (var i = 0; i < al; i++) {
                switch (typeof arguments[i]) {
                    case 'object':
                        data = arguments[i];
                        break;
                    case 'function':
                        if (ok === null) ok = arguments[i];
                        else fail = arguments[i];
                        break;
                }
            }


            ajax.open('POST', url);
            ajax.onreadystatechange = function () {
                if (ajax.readyState == 4 && ((ajax.status > 199 && ajax.status < 300) || (window.device && ajax.status == 0))) {
                    var data = JSON.parse(ajax.responseText);
                    if (data.data) {
                        data.data.$clone(me);
                    }
                    if (typeof ok == 'function')
                        ok.call(me);
                } else if (ajax.readyState == 4) {
                    if (typeof fail == 'function')
                        fail.call(me);
                }
            }
            ajax.send(JSON.stringify(data));
        }).method('addChild', function (process) {
            if (!this.route) return null;
            var url = process.application.url;
            var container = this.route(url);
            $(container).attr('id', process.application.url.replace('/app/', '').replace(/\//g, '_').replace('.json', ''));
            if (this.childrens[container]) {
                this.childrens[container].stop();
            }
            process.container = container;
            this.childrens[container] = process;
            return process;
        });

    var xSchedule = w.Class('xSchedule',function (d) {
        d.$clone(this);
        if (typeof this.chain_bans == 'string')
            this.chain_bans = this.chain_bans.split('|').map(parseFloat);
        else
            this.chain_bans = [];
        this.private('_chain_id', 0);
        this.private('_link_id', 1);
        if (typeof this.time_start == 'string')
            this.private('_last_date', new Date(this.time_start.replace(/-/g, '/')));
        else
            this.private('_last_date', new Date());
        if (typeof this.time_end == 'string') {
            this.time_end = new Date(this.time_end.replace(/-/g, '/'));
        }
    }).method('next',function () {
            if (this.chain_bans.length == this.chain_length)
                throw new Error('Too many chain_bans!');

            while (true) {
                if (this._link_id == this.chain_length) {
                    this._link_id = 0;
                    this._chain_id++;
                }

                this._last_date.add(this.interval);
                this._link_id++;
                if (this._last_date > this.time_end && this.time_end instanceof Date)
                    return null;
                if (this.chain_bans.indexOf(this._link_id) == -1) break;
            }
            return new xSchedule.xScheduleEvent(this._last_date, this);
        }).method('reset',function () {
            if (typeof this.time_start == 'string')
                this.private('_last_date', new Date(this.time_start.replace(/-/g, '/')));
            else
                this.private('_last_date', new Date());
            this._link_id = 1;
            this._chain_id = 0;
        }).method('nextFromDate', function (date) {
            var next = null;
            var nd = null;
            this.reset();
            var i = 0;
            while (nd < date) {
                next = this.next();
                if (next === null) return null;
                nd = next.date;
            }

            return next;
        });


    xSchedule.Class('xScheduleEvent', function (date, schedule) {
        this.date = date;
        this.schedule = schedule;
    });


}(window);