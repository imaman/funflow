require('util-is');
var util = require('util');

function Seq(a) {
  if (!util.isArray(a)) {
    throw new Error('a is not an array: ' + a);
  }
  this.kids = a;
}

Seq.prototype.wrap = function() {
  var self = this;
  if (self.kids.length == 1) {
    return function() {
      self.kids[0].wrap().apply(null, arguments);
    }
  }

  var w0 = self.kids[0].wrap();
  var w1 = self.kids[1].wrap();

  function both(v1, v2, next) {
    w0(null, v1, v2, function(e, v) {
      if (e) return w1(e);
      w1(null, v, next);
    });
  }

  return both;
}

module.exports = Seq;


