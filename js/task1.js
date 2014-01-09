String.$method('parseQuery', function () {
    // states: 0 - reading key, 1 - reading value
    var mode = 0, result = {}, value = '', char, target = result, name = '';

    var Item = function () {
        var len = 0;
        this.getLength = function () {
            return len;
        }
        this.incLength = function () {
            return len++;
        }
    }

    for (var i = 0; i < this.length; i++) {
        char = this[i];
        switch (mode) {
            case 0:
                switch (char) {
                    case '=':
                        value = decodeURIComponent(value);
                        if (value.length) {
                            name = value;
                        }
                        value = '';
                        mode = 2;
                        break;
                    case '[':
                        value = decodeURIComponent(value);
                        if (value.length) {
                            name = value;
                        }
                        mode = 1;
                        value = '';
                        break;
                    default:
                        value += char;
                        break;
                }
                break;
            case 1:
                switch (char) {
                    case ']':
                        value = decodeURIComponent(value);
                        if (target[name] === undefined) {
                            target[name] = new Item();
                        }
                        if (value.length == 0) {
                            value = target[name].incLength();
                        }
                        target = target[name];
                        name = value;
                        value = '';
                        mode = 0;
                        break;
                    default:
                        value += char;
                }
                break;
            case 2:
                if (char == '&') {
                    target[name] = decodeURIComponent(value);
                    value = '';
                    name = '';
                    target = result;
                    mode = 0;
                } else {
                    value += char;
                }
        }
    }
    if (name != '') {
        target[name] = decodeURIComponent(value);
    }

    return result;
});