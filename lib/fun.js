require('util-is');
var util = require('util');

function Fun(f) {
  if (!util.isFunction(f)) {
    throw new Error('f is not a function: ' + f);
  }
  this.f = f;
}

Fun.prototype.wrap = function() {
  var self = this;
  return function(e) {
    var args = Array.prototype.slice.call(arguments, 1);
    var n = args[args.length - 1];
    if (e) return n(e);
    try {
      return self.f.apply(null, args);
    } catch (e) {
      n(e);
    }
  }
}

module.exports = Fun;

