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
  if (self.kids.length === 1) {
    return function() {
      self.kids[0].wrap().apply(null, arguments);
    }
  }

  if (self.kids.length === 2) {
    var w0 = self.kids[0].wrap();
    var w1 = self.kids[1].wrap();

    function both(e) {
      var args = Array.prototype.slice.call(arguments, 1);
      var next = args.pop();

      function temp(e, v) {
        if (e) return w1(e);
        w1(null, v, next);
      };
      w0.call(null, [e].concat(args).concat(temp));
    }

    return both;
  }

  var couple = [ self.kids[0], self.kids[1] ];
  var w0 = new Seq(couple).wrap();
  var w1 = self.kids[2].wrap();

  function both(e, v, next) {
    w0(e, v, function(e, v) {
      if (e) return w1(e);
      w1(null, v, next);
    });
  }

  return both;
}

module.exports = Seq;


