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
  return function() {
    try {
      return self.f.apply(null, arguments);
    } catch (e) {
      var n = arguments[arguments.length - 1];
      n(e);
    }
  }
}

module.exports = Fun;

