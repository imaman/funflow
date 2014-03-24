require('util-is');
var util = require('util');

function Conc(o) {
  if (!util.isPureObject(o))
    throw new Error('must be an object');
  this.flows = o;
}

function invoke(f, args, next) {
  if (next === undefined) {
    throw new Error('next is undefined');
  }
  f.apply(null, [null].concat(args).concat([next]));
}

Conc.prototype.wrap = function() {
  var self = this;
  return function(e, v, next) {
    var result = {};
    var keys = Object.keys(self.flows);
    var left = keys.length;
    keys.forEach(function(k) {
      self.flows[k].wrap()(e, v, function(e, v) {
        result[k] = v;
        left--;
        if (left === 0) next(null, result);
      });
    });
  };
}

module.exports = Conc;


