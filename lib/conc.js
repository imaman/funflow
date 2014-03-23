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
    Object.keys(self.flows).forEach(function(k) {
      self.flows[k].wrap()(e, v, function(e, v) {
        if (e) return next(e);
        result[k] = v;
      });
    });
    next(null, result);
  };
}

module.exports = Conc;


