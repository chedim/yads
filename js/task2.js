String.$method('parseQuery', function() {
    // states: 0 - reading key, 1 - reading value
    var mode = 0, result = {}, value = '', char, name;

    function addValue(key, value) {
        if (result[name] === undefined) {
            result[name] = [];
        }
        result[name].push(value);
    }

    for (var i=0; i < this.length; i++) {
        char = this[i];
        switch (mode) {
            case 0:
                switch (char) {
                    case '=':
                        name = decodeURIComponent(value);
                        value = '';
                        mode = 1;
                        break;
                    default:
                        value += char;
                }
                break;
            case 1:
                if (char == '&') {
                    addValue(name, decodeURIComponent(value));
                    value = '';
                    name = '';
                    mode = 0;
                } else {
                    value += char;
                }
        }
    }
    if (name) {
        addValue(name, decodeURIComponent(value));
    }

    return result;
});