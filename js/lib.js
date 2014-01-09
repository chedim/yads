Object.defineProperty(Object.prototype, '$method', {
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

Object.$method('private', function (name, val) {
    Object.defineProperty(this, name, {
        enumerable:false,
        writable:true,
        value:val
    });
    return this;
});

Number.$method('$decl', function declOfNum(titles) {
    number = this;
    cases = [2, 0, 1, 1, 1, 2];
    return titles[ (number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5] ];
});


Object.$method("$values", function () {
    var res = [];
    for (var i in this)
        res.push(this[i]);
    return res;
});

Object.$method("$keys", function () {
    var res = [];
    for (var i in this)
        res.push(i);
    return res;
});