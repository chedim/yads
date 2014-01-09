Object.$method('$toQueryString', function (name) {
    var keys = this.$keys(), result = [];
    for (var i = 0; i < keys.length; i++) {
        var key = encodeURIComponent(keys[i]), value = this[keys[i]];
        if (name) {
            key = name + '[' + key + ']';
        }
        if (value === undefined || value === null) value = '';
        result.push(value.$toQueryString(key));
    }

    return result.join('&');
});

Array.$method('$toQueryString', function (name) {
    var result = [];
    for (var i = 0; i < this.length; i++) {
        var value = this[i];
        if (value === undefined || value === null) value = '';
        result.push(this[i].$toQueryString(name + '[]'));
    }
    return result.join('&');
});

Number.$method('$toQueryString', function (name) {
    return name + '=' + this;
})

Boolean.$method('$toQueryString', function(name) {
    return this.toString().$toQueryString(name);
})

String.$method('$toQueryString', function (name) {
    return name + '=' + encodeURIComponent(this);
})

String.$method('$addQueryParams', function (params) {
    var result = this;
    if (this.indexOf('?') == -1) {
        result += '?';
    } else {
        result += '&';
    }

    return result + params.$toQueryString();
});