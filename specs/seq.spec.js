var Seq = require('../lib/seq');
var Fun = require('../lib/fun');

describe('Seq', function() {
  it('takes a single function argument', function() {
    new Seq([]);
  });
  it('refuses to take a non-array argument', function() {
    expect(function() { new Seq({}) }).toThrow();
  });
  it('translates a single function', function() {
    var seq = new Seq([
      new Fun(function(v1, v2, next) { next(null, v1 + v2) })
    ]);
    var wrapped = seq.wrap();
    var args;
    wrapped(null, 3, 8, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args).toEqual([null, 11]);
  });
  it('translates a sequence of two functions', function() {
    console.log('\n------------------------------------------\n');
    var seq = new Seq([
      new Fun(function(v1, v2, next) {
        next(null, v1 + v2) }),
      new Fun(function(v, next) {
        next(null, v * v) })
    ]);
    var wrapped = seq.wrap();
    var args;
    wrapped(2, 4, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args).toEqual([null, 36]);
  });
});
