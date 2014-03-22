require('util-is');
var util = require('util');

function Seq(a) {
  if (!util.isArray(a)) {
    throw new Error('a is not an array: ' + a);
  }
  this.kids = a;
}

function invoke(f, args, next) {
  if (next === undefined) {
    throw new Error('next is undefined. args=' + JSON.stringify(args));
  }
  f.apply(null, [null].concat(args).concat([next]));
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

      function temp(e) {
        if (e) return w1(e);
        var args = Array.prototype.slice.call(arguments, 1);
        invoke(w1, args, next);
      };
      invoke(w0, args, temp);
    }

    return both;
  }

  var rest = self.kids.slice(1);
  var w0 = new Seq([self.kids[0]]).wrap();
  var w1 = new Seq(rest).wrap();

  function both2(e) {
    var args = Array.prototype.slice.call(arguments, 1);
    var next = args.pop();

    function temp(e) {
      if (e) return w1(e);
      var args = Array.prototype.slice.call(arguments, 1);
      invoke(w1, args, next);
    };
    invoke(w0, args, temp);
  }

  return both2;
}

module.exports = Seq;


