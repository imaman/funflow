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
    var seq = new Seq([
      new Fun(function(v1, next) {
        next(null, v1 + 4) }),
      new Fun(function(v, next) {
        next(null, v * v) })
    ]);
    var wrapped = seq.wrap();
    var args;
    wrapped(null, 2, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args).toEqual([null, 36]);
  });
  it('translates a sequence of three functions', function() {
    var seq = new Seq([
      new Fun(function(v, next) {
        next(null, v * 2) }),
      new Fun(function(v, next) {
        next(null, v * 3) }),
      new Fun(function(v, next) {
        next(null, v * 5) })
    ]);
    var wrapped = seq.wrap();
    var args;
    wrapped(null, 7, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args).toEqual([null, 210]);
  });
  it('supports var args', function() {
    var seq = new Seq([
      new Fun(function(v1, v2, next) {
        next(null, v1+v2, v1*v2, v1-v2) }),
      new Fun(function(a, b, c, next) {
        var avg = (a+b+c) / 7;
        var arr = [a,b,c,avg];
        arr.sort(function(a,b) { return a -b });
        next(null, arr[0], arr[1], arr[2], arr[3])
      })
    ]);
    var wrapped = seq.wrap();
    var args;
    wrapped(null, 14, 6, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args).toEqual([null, 8, 16, 20, 84]);
  });
  it('supports arbitrary long sequences', function() {
    var arr = [];
    for (var i = 0; i < 50; ++i) {
      var fun = new Fun(function(v, next) {
        next(null, v + 1) });
      arr.push(fun);
    }
    var seq = new Seq(arr);

    var wrapped = seq.wrap();
    var args;
    wrapped(null, 0, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args).toEqual([null, 50]);
  });
  it('propagates an external error directly to the trap function', function() {
    var seq = new Seq([
      new Fun(function(v, next) {
        next(null, v + '_1') }),
      new Fun(function(v, next) {
        next(null, v + '_2') })
    ]);
    var wrapped = seq.wrap();
    var args;
    wrapped(new Error('EXTERNAL_ERROR'), '0', function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args.length).toEqual(1);
    expect(args[0].message).toEqual('EXTERNAL_ERROR');
  });
});
