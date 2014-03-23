require('util-is');
var util = require('util');
var Fun = require('../lib/fun');

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
  if (this.kids.length === 1) {
    return this.kids[0].wrap();
  }

  var rest = this.kids.slice(1);
  var w0 = this.kids[0].wrap();
  var w1 = new Seq(rest).wrap();

  return function(e) {
    var args = Array.prototype.slice.call(arguments, 1);
    var next = args.pop();
    if (e) return next(e);

    function temp(e) {
      var args = Array.prototype.slice.call(arguments, 1);
      if (e) return next(e);
      invoke(w1, args, next);
    };
    invoke(w0, args, temp);
  }
}

module.exports = Seq;


