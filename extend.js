Object.defineProperty(Function.prototype, 'extends', {
    value: extend,
    writable: false,
    enumerable: false,
    configurable: false
});

Object.defineProperty(Function.prototype, 'rootClass', {
    value: rootClass,
    writable: false,
    enumerable: false,
    configurable: false
});

function extend(Parent) {

    var thisClassName = this.name || getFuncName(this),
        parentClassName = Parent.name || getFuncName(Parent);

    function getFuncName(func) {
        var funcNameRegExp = /^function\s*([^\s(]+)/;
        return funcNameRegExp.exec(func.toString())[1];
    }

    function getFunctionArgsAndBody(func) {
        var result = /function[\w\s\$\_]*\(([\w\s,]*)[\/\*\*\/]*\)[^{]+\{([\s\S]*)\}$/g.exec(func.toString());

        return {
            args: result[1].trim(),
            body: result[2]
        }
    };

    //extend this prototype
    this.prototype.inheritChain = Array.prototype.slice.call(Parent.prototype.inheritChain);
    this.prototype.inheritChain.push(thisClassName);

    this.prototype.activeSuperContext = thisClassName;
    this.prototype.changeSuperContext = function () {
        var inheritChainLen = this.inheritChain.length;

        for (var i = inheritChainLen; i > -1; i--) {
            if (this.activeSuperContext === this.inheritChain[i]) break;
        }

        this.activeSuperContext = this.inheritChain[i - 1];
    };

    var parentConstructor = getFunctionArgsAndBody(Parent.toString());

    this.prototype[parentClassName + '$constructor'] = Parent;

    this.prototype[parentClassName + '$constructor'].inherited = true;

    this.prototype.super = eval.call(null, '(function superFn(' + parentConstructor.args + ') {' +
        'this.changeSuperContext(); ' +
        'var i = this.activeSuperContext + \'_constructor\';' +
        'this[i](' + parentConstructor.args + ');' +
        'this.activeSuperContext = \'' + thisClassName + '\'; })');

    var thisProtoKeys = Object.keys(this.prototype),
        parentProtoKeys = Object.keys(Parent.prototype),
        thisProtoKeysLength = thisProtoKeys.length,
        parentProtoKeysLength = parentProtoKeys.length,
        funcInStr,
        i;

    function intersect(x, y) {
        var ret = [],
            x_len = x.length,
            y_len = y.length;

        for (var i = 0; i < x_len; i++) {
            for (var z = 0; z < y_len; z++) {
                if (x[i] === y[z]) {
                    ret.push(x[i]);
                    break;
                }
            }
        }

        return ret;
    }

    var hasInThisPrototype = (function (thisProto, parentProto) {
        var intersection = intersect(parentProto, thisProto),
            inter_len = intersection.length,
            result = {};

        for (var i = 0; i < inter_len; i++) {
            result[intersection[i]] = true;
        }

        return result;
    })(thisProtoKeys, parentProtoKeys);

    console.log(hasInThisPrototype, thisProtoKeys, parentProtoKeys);

    for (i = 0; i < parentProtoKeysLength; i++) {
        if (!hasInThisPrototype[parentProtoKeys[i]]) {
            if (typeof Parent.prototype[parentProtoKeys[i]] === 'function') {
                if (Parent.prototype[parentProtoKeys[i]].inherited) {
                    this.prototype[parentProtoKeys[i]] = Parent.prototype[parentProtoKeys[i]];
                } else {
                    this.prototype[parentClassName + '$' + parentProtoKeys[i]] = Parent.prototype[parentProtoKeys[i]];

                    funcInStr = getFunctionArgsAndBody(Parent.prototype[parentProtoKeys[i]]);

                    this.prototype[parentProtoKeys[i]] = eval.call(null, '(function (' + funcInStr.args + ') {' +
                        'return this[\'' + parentClassName + '$' + parentProtoKeys[i] + '\'](' + funcInStr.args + ');' +
                        '})');

                    this.prototype[parentProtoKeys[i]].inherited = true;
                }
            } else {
                this.prototype[parentProtoKeys[i]] = Parent.prototype[parentProtoKeys[i]];
            }
        }
    }

    if (Parent.prototype.super) {
        var superKeys = Object.keys(Parent.prototype.super),
            superKeysLen = superKeys.length;

        for (i = 0; i < superKeysLen; i++) {
            this.prototype.super[superKeys[i]] = Parent.prototype.super[superKeys[i]];
        }
    }

    for (i = 0; i < thisProtoKeysLength; i++) {
        if (typeof this.prototype[thisProtoKeys[i]] === 'function') {
            funcInStr = getFunctionArgsAndBody(this.prototype[thisProtoKeys[i]]);

            this.prototype[thisClassName + '$' + thisProtoKeys[i]] = this.prototype[thisProtoKeys[i]];

            this.prototype[thisProtoKeys[i]] = eval.call(null, '(function (' + funcInStr.args + ') {' +
                'return this[\'' + thisClassName + '$' + thisProtoKeys[i] + '\'](' + funcInStr.args + '); })');

            this.prototype.super[thisProtoKeys[i]] = eval.call(null, '(function super_' + thisProtoKeys[i] + '(' + funcInStr.args + ') {' +
                'this.activeSuperContext = \'' + thisClassName + '\';' +
                'this.changeSuperContext(); ' +
                'var i = this.activeSuperContext + \'_' + thisProtoKeys[i] + '\';' +
                'var res = this[i](' + funcInStr.args + ');' +
                'this.activeSuperContext = \'' + thisClassName + '\';' +
                'return res; })'
            );
        }
    }
}

function rootClass() {
    var thisClassName = this.name,
        thisProtoKeys = Object.keys(this.prototype),
        thisProtoKeysLength = thisProtoKeys.length,
        i, funcInStr;

    if (!thisClassName) { //if function.name not working
        var functionNameRegExp = /^function\s*([^\s(]+)/;
        thisClassName = functionNameRegExp.exec(this.toString())[1];
    }

    var getFunctionBody = function (func) {
        var result = /function[\w\s\$\_]*\(([\w\s,]*)\)[^{]+\{([\s\S]*)\}$/.exec(func.toString());

        return {
            args: result[1],
            body: result[2]
        }
    };

    this.prototype.inheritChain = [thisClassName];

    for (i = 0; i < thisProtoKeysLength; i++) {
        if (typeof this.prototype[thisProtoKeys[i]] === 'function') {
            funcInStr = getFunctionBody(this.prototype[thisProtoKeys[i]]);

            if (funcInStr.args.length === 0) {
                this.prototype[thisClassName + '$' + thisProtoKeys[i]] = this.prototype[thisProtoKeys[i]];
                this.prototype[thisProtoKeys[i]] = Function('return this[\'' + thisClassName + '$' + thisProtoKeys[i] + '\']();');
            } else {
                this.prototype[thisClassName + '$' + thisProtoKeys[i]] = this.prototype[thisProtoKeys[i]]
                this.prototype[thisProtoKeys[i]] = Function(funcInStr.args, 'return this[\'' + thisClassName + '$' + thisProtoKeys[i] + '\'](' + funcInStr.args + ');');
            }
        }
    }
}