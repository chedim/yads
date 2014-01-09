!function (w) {
    Object.defineProperty(Object.prototype, 'method', {
        enumerable:false,
        value:function (name, fun) {
            var proto = this.prototype;
            if (proto === undefined) proto = this;
            Object.defineProperty(proto, name, {
                enumerable:false,
                value:fun
            });
            return this;
        }
    });

    Object.method('private', function (name, val) {
        Object.defineProperty(this, name, {
            enumerable:false,
            writable:true,
            value:val
        });
        return this;
    });

    Object.method('$clone', function (to) {
            var o = this;
            var c = o instanceof Array ? [] : {};
            if (to !== undefined) c = to;
            var p, v;
            if (o == c) return c;
            var members = Object.getOwnPropertyNames(o);
            for (var i = 0; i < members.length; i++) {
                p = members[i];
                v = o[p];
                if (v && 'object' === typeof v) {
                    if (v == o) continue;
                    if (v instanceof Array)
                        c[p] = [];
                    else
                        c[p] = {};

                    v.$clone(c[p]);
                } else {
                    if (o.propertyIsEnumerable(p) && typeof v != 'function') {
                        c[p] = v;
                    } else if (typeof v == 'function') {
                        c.method(p, v);
                    } else if (this instanceof Array && p == 'length') {
                        continue;
                    } else {
                        c.private(p, v);
                    }
                }
            }
            return c;
        }
    );


    Object.method('Class', function (name, constructor, prototype) {
        var init = {
            name:name,
            constructor:constructor,
            prototype:prototype
        };
        if (typeof init == 'string') init = {name:init};
        if (init.area === undefined) init.area = this;
        if (init.constructor === undefined) init.constructor = w.__constructor;
        if (init.prototype === undefined) init.prototype = Object;

        console.log(name, init);
        var code = 'var ' + init.name + ' = function() { init.constructor.apply(this, arguments); }; ' + init.name + '.prototype = new init.prototype(); init.area.private(init.name, ' + init.name + ');';
        eval(code);
        var ret = init.area[init.name];
        return ret;
    });

    Object.method('__constructor', function (data) {
        for (var i in data) {
            this[i] = data[i];
        }
    });


    Date.method('add', function (str) {
        // http://kevin.vanzonneveld.net
        // +   original by: Caio Ariede (http://caioariede.com)
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +      input by: David
        // +   improved by: Caio Ariede (http://caioariede.com)
        // +   improved by: Brett Zamir (http://brett-zamir.me)
        // +   bugfixed by: Wagner B. Soares
        // +   bugfixed by: Artur Tchernychev
        // +   input by: wookie
        // %        note 1: Examples all have a fixed timestamp to prevent tests to fail because of variable time(zones)
        // *     example 1: strtotime('+1 day', 1129633200);
        // *     returns 1: 1129719600
        // *     example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200);
        // *     returns 2: 1130425202
        // *     example 3: strtotime('last month', 1129633200);
        // *     returns 3: 1127041200
        // *     example 4: strtotime('2009-05-04 08:30:00');
        // *     returns 4: 1241418600
        var i, l, match, s, parse = '';

        str = (str + '').replace(/\s{2,}|^\s|\s$/g, ' ').replace(/[\t\r\n]/g, '');
        ; // unecessary spaces and chars

        if (str === 'now') {
            return this;
        } else if (!isNaN(parse = Date.parse(str))) {
            return parse / 1000 | 0;
        } else {
            now = this;
        }

        str = str.toLowerCase();

        var __is = {
            day:{
                'sun':0,
                'mon':1,
                'tue':2,
                'wed':3,
                'thu':4,
                'fri':5,
                'sat':6
            },
            mon:[
                'jan',
                'feb',
                'mar',
                'apr',
                'may',
                'jun',
                'jul',
                'aug',
                'sep',
                'oct',
                'nov',
                'dec'
            ]
        };

        var process = function (m) {
            var ago = (m[2] && m[2] === 'ago');
            var num = (num = m[0] === 'last' ? -1 : 1) * (ago ? -1 : 1);

            switch (m[0]) {
                case 'last':
                case 'next':
                    switch (m[1].substring(0, 3)) {
                        case 'yea':
                            now.setFullYear(now.getFullYear() + num);
                            break;
                        case 'wee':
                            now.setDate(now.getDate() + (num * 7));
                            break;
                        case 'day':
                            now.setDate(now.getDate() + num);
                            break;
                        case 'hou':
                            now.setHours(now.getHours() + num);
                            break;
                        case 'min':
                            now.setMinutes(now.getMinutes() + num);
                            break;
                        case 'sec':
                            now.setSeconds(now.getSeconds() + num);
                            break;
                        case 'mon':
                            if (m[1] === "month") {
                                now.setMonth(now.getMonth() + num);
                                break;
                            }
                        // fall through
                        default:
                            var day = __is.day[m[1].substring(0, 3)];
                            if (typeof day !== 'undefined') {
                                var diff = day - now.getDay();
                                if (diff === 0) {
                                    diff = 7 * num;
                                } else if (diff > 0) {
                                    if (m[0] === 'last') {
                                        diff -= 7;
                                    }
                                } else {
                                    if (m[0] === 'next') {
                                        diff += 7;
                                    }
                                }
                                now.setDate(now.getDate() + diff);
                                now.setHours(0, 0, 0, 0); // when jumping to a specific last/previous day of week, PHP sets the time to 00:00:00
                            }
                    }
                    break;

                default:
                    if (/\d+/.test(m[0])) {
                        num *= parseInt(m[0], 10);

                        switch (m[1].substring(0, 3)) {
                            case 'yea':
                                now.setFullYear(now.getFullYear() + num);
                                break;
                            case 'mon':
                                now.setMonth(now.getMonth() + num);
                                break;
                            case 'wee':
                                now.setDate(now.getDate() + (num * 7));
                                break;
                            case 'day':
                                now.setDate(now.getDate() + num);
                                break;
                            case 'hou':
                                now.setHours(now.getHours() + num);
                                break;
                            case 'min':
                                now.setMinutes(now.getMinutes() + num);
                                break;
                            case 'sec':
                                now.setSeconds(now.getSeconds() + num);
                                break;
                        }
                    } else {
                        return false;
                    }
                    break;
            }
            return true;
        };

        match = str.match(/^(\d{2,4}-\d{2}-\d{2})(?:\s(\d{1,2}:\d{2}(:\d{2})?)?(?:\.(\d+))?)?$/);
        if (match !== null) {
            if (!match[2]) {
                match[2] = '00:00:00';
            } else if (!match[3]) {
                match[2] += ':00';
            }

            s = match[1].split(/-/g);

            s[1] = __is.mon[s[1] - 1] || s[1];
            s[0] = +s[0];

            s[0] = (s[0] >= 0 && s[0] <= 69) ? '20' + (s[0] < 10 ? '0' + s[0] : s[0] + '') : (s[0] >= 70 && s[0] <= 99) ? '19' + s[0] : s[0] + '';
            return parseInt(this.strtotime(s[2] + ' ' + s[1] + ' ' + s[0] + ' ' + match[2]) + (match[4] ? match[4] / 1000 : ''), 10);
        }

        var regex = '([+-]?\\d+\\s' + '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?' + '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday' + '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday)' + '|(last|next)\\s' + '(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?' + '|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday' + '|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday))' + '(\\sago)?';

        match = str.match(new RegExp(regex, 'gi')); // Brett: seems should be case insensitive per docs, so added 'i'
        if (match === null) {
            return false;
        }

        for (i = 0, l = match.length; i < l; i++) {
            if (!process(match[i].split(' '))) {
                return false;
            }
        }
        return this;
    });

    Object.method('vals', function () {
        var ret = [];
        for (var i in this) {
            ret.push(this[i]);
        }
        return ret;
    });

    Array.method('groupBy', function (by) {
        var ret = {};
        for (var i = 0; i < this.length; i++) {
            var k = null;
            if (typeof by == 'function') {
                k = by(this[i]);
            } else {
                k = this[i][by];
            }

            ret[k] = this[i];
        }
        return ret;
    });

    Array.method('tree', function() {
        var ret = {};
        for (var i=0; i< this.length; i++) {
            var target = ret;
            for (var j=0; j<arguments.length; j++) {
                var s = arguments[j];
                var k = null;
                if (typeof s == 'function') {
                    k = s(this[i]);
                } else {
                    k = this[i][s];
                }
                if (typeof target[k] == 'undefined') {
                    if (j < arguments.length - 1) {
                        target[k] = {};
                    } else {
                        target[k] = [];
                    }
                }
                target = target[k];
            }
            target.push(this[i]);
        }
        return ret;
    })

    String.method('ucfirst', function () {
        return this.substr(0, 1).toUpperCase() + this.substr(1);
    })
    String.method('pad', function(l,s) {
        var o = this.toString();
        if (!s) { s = '0'; }
        while (o.length < l) {
            o = s + o;
        }
        return o;
    });

    Array.method('exclude', function (v) {
        var i = this.indexOf(v);
        return this.excludeByIndex(i);
    });

    Array.method('excludeByIndex', function (i) {
        if (i < 0) return this;
        return this.slice(0, i).concat(this.slice(i + 1));
    });

    Array.method('unique', function () {
        var a = [];
        var l = this.length;
        for (var i = 0; i < l; i++) {
            for (var j = i + 1; j < l; j++) {
                // If this[i] is found later in the array
                if (this[i] === this[j])
                    j = ++i;
            }
            a.push(this[i]);
        }
        return a;
    });

    Array.method('get', function(i) {
        return this[i];
    });

    Array.method('set', function(i, v) {
        this[i] = v;
    });

    Array.method('each', function(cb) {
        for(i=0;i<this.length;i++) {
            this[i] = cb(i, this[i]);
        }
    });

    HTMLElement.method('process', function(p) {
        var xapp = $('._xapp', this);
        console.log(xapp);
        if (xapp.length) {
            return xapp.process();
        }
        if (p) {
            $(this).data('process', p);
        } else {
            return $(this).data('process');
        }
    });

    $.fn.process = function(p) {
        var xapp = $('>._xapp', this);
        if (xapp.length) {
            return xapp.process();
        }
        if (p) {
//            console.log('')
            $(this).data('process', p);
        } else {
            return $(this).data('process');
        }
    }
}(window);