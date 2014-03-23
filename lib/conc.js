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
    self.flows.plus5.wrap()(e, v, function(e, v) {
      if (e) return next(e);
      next(null, { plus5: v });
    });
  }
}

module.exports = Conc;


