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
    throw new Error('next is undefined');
  }
  f.apply(null, [null].concat(args).concat([next]));
}

Seq.prototype.wrap = function() {
  if (this.kids.length === 1) {
    return this.kids[0].wrap();
  }

  var w0 = this.kids[0].wrap();
  var rest = this.kids.slice(1);
  var w1 = new Seq(rest).wrap();

  return function(e) {
    var args = Array.prototype.slice.call(arguments, 1);
    var trap = args.pop();
    if (e) return trap(e);

    function next(e) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (e) return trap(e);
      invoke(w1, args, trap);
    };
    invoke(w0, args, next);
  }
}

module.exports = Seq;


