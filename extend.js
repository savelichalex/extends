if (typeof Function.prototype.extends === "undefined") {
	Object.defineProperty(Function.prototype, 'extends', {
		value       : extend,
		writable    : false,
		enumerable  : false,
		configurable: false
	});
}

function extend(Parent) {

    var thisClassName = this.name || getFuncName(this),
        parentClassName = Parent.name || getFuncName(Parent);

    function getFuncName(func) {
        var funcNameRegExp = /^function\s*([^\s(]+)/;
        return funcNameRegExp.exec(func.toString())[1];
    }

    function getFunctionArgs(func) {
        var result = /function[\w\s\$_]*\(([\w\s,]*)[\/\*]*\)/g.exec(func.toString());

        return {
            args: result[1].trim()
        }
    }

    function rootClass( func ) {
        var thisClassName = func.name,
            thisProtoKeys = Object.keys(func.prototype),
            thisProtoKeysLength = thisProtoKeys.length,
            i;

        if (!thisClassName) { //if function.name not working
            var functionNameRegExp = /^function\s*([^\s(]+)/;
            thisClassName = functionNameRegExp.exec(func.toString())[1];
        }

        func.prototype.inheritChain = [thisClassName];

        for (i = 0; i < thisProtoKeysLength; i++) {
            if (typeof func.prototype[thisProtoKeys[i]] === 'function') {
                func.prototype[thisClassName + '$' + thisProtoKeys[i]] = func.prototype[thisProtoKeys[i]];
                func.prototype[thisProtoKeys[i]] = func.prototype[thisClassName + '$' + thisProtoKeys[i]];

                func.prototype[thisClassName + '$' + thisProtoKeys[i]].inherited = true;
            }
        }
    }


    if( !Parent.prototype.inheritChain ) {
        rootClass( Parent );
    }

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

    var parentConstructor = getFunctionArgs(Parent.toString());

    this.prototype[parentClassName + '$constructor'] = Parent;

    this.prototype[parentClassName + '$constructor'].inherited = true;

    this.prototype.super = eval.call(null, '(function superFn(' + parentConstructor.args + ') {' +
        'this.changeSuperContext(); ' +
        'var i = this.activeSuperContext + \'$constructor\';' +
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

    for (i = 0; i < parentProtoKeysLength; i++) {
        if (!hasInThisPrototype[parentProtoKeys[i]]) {
            if (typeof Parent.prototype[parentProtoKeys[i]] === 'function') {
                if (Parent.prototype[parentProtoKeys[i]].inherited) {
                    this.prototype[parentProtoKeys[i]] = Parent.prototype[parentProtoKeys[i]];
                } else {
                    this.prototype[parentClassName + '$' + parentProtoKeys[i]] = Parent.prototype[parentProtoKeys[i]];

                    this.prototype[parentProtoKeys[i]] = this.prototype[parentClassName + '$' + parentProtoKeys[i]];

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
            funcInStr = getFunctionArgs(this.prototype[thisProtoKeys[i]]);

            this.prototype[thisClassName + '$' + thisProtoKeys[i]] = this.prototype[thisProtoKeys[i]];

            this.prototype[thisProtoKeys[i]] = this.prototype[thisClassName + '$' + thisProtoKeys[i]];

            this.prototype.super[thisProtoKeys[i]] = eval.call(null, '(function super$' + thisProtoKeys[i] + '(' + funcInStr.args + ') {' +
                'this.activeSuperContext = \'' + thisClassName + '\';' +
                'this.changeSuperContext(); ' +
                'var i = this.activeSuperContext + \'$' + thisProtoKeys[i] + '\';' +
                'var res = this[i](' + funcInStr.args + ');' +
                'this.activeSuperContext = \'' + thisClassName + '\';' +
                'return res; })'
            );
        }
    }
}