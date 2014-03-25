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
  return function(e) {
    var args = Array.prototype.slice.call(arguments, 1);
    var trap = args.pop();
    if (e) return trap(e);
    var result = {};
    var keys = Object.keys(self.flows);
    var left = keys.length;
    keys.forEach(function(k) {
      function next(e) {
        if (e) return trap(e);
        var args = Array.prototype.slice.call(arguments, 1);
        if (args.length === 1)
          result[k] = args[0];
        else
          result[k] = args;
        left--;
        if (left === 0) trap(null, result);
      }
      var wrapped = self.flows[k].wrap();
      invoke(wrapped, args, next);
    });
  };
}

function tabulate(filler, f, n) {
  var arr;
  var i;
  if (arguments.length === 2) {
    arr = f;

    var line = '';
    var at = 0;
    arr.forEach(function(s, i) {
      for (var j = at; j < (i+1) * 10; ++j)
        line += filler;
      line += s;
      at = (i+1) * 10 + s.length;
    });

    return line;
  }

  arr = [];
  for (i = 0; i < n; ++i)
    arr.push(f(i));
  return tabulate(filler, arr);
}


Conc.prototype.show = function() {
  var self = this;
  var keys = Object.keys(self.flows);
  var n = keys.map(function(k) { return self.flows[k].show(); });

  return [
    tabulate('-', function() { return '+' }, n.length),
    tabulate(' ', n),
    tabulate(' ', function() { return '|' }, n.length),
    tabulate(' ', function(i) { return keys[i] + ':' }, n.length),
    tabulate('-', function() { return '+' }, n.length)
  ].join('\n');
};

module.exports = Conc;


