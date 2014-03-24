var Conc = require('../lib/conc');
var Fun = require('../lib/fun');

describe('Conc', function() {
  it('takes a single object argument', function() {
    new Conc({});
  });
  it('refuses to take a non-object argument', function() {
    expect(function() { new Conc([]) }).toThrow();
  });
  it('executes a single function', function() {
    var conc = new Conc({
      plus5: new Fun(function(v, next) { next(null, v + 5) })
    });
    var wrapped = conc.wrap();
    var args;
    wrapped(null, 3, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args.length).toEqual(2);
    expect(args).toEqual([null, { plus5: 8 }]);
  });
  it('executes several functions', function() {
    var conc = new Conc({
      plus5: new Fun(function(v, next) { next(null, v + 5) }),
      plus7: new Fun(function(v, next) { next(null, v + 7) }),
      plus9: new Fun(function(v, next) { next(null, v + 9) })
    });
    var wrapped = conc.wrap();
    var args;
    wrapped(null, 3, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args.length).toEqual(2);
    expect(args).toEqual([null, { plus5: 8, plus7: 10, plus9: 12 }]);
  });
  it('support var args', function() {
    var conc = new Conc({
      sum: new Fun(function(v1, v2, next) { next(null, v1 + v2) }),
      diff: new Fun(function(v1, v2, next) { next(null, v1 - v2) }),
    });
    var wrapped = conc.wrap();
    var args;
    wrapped(null, 16, 4, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args.length).toEqual(2);
    expect(args).toEqual([null, { sum: 20, diff: 12 }]);
  });
  it('generates an array output if next() is called with several values', function() {
    var conc = new Conc({
      plus123: new Fun(function(v, next) { next(null, v+1, v+2, v+3) })
    });
    var wrapped = conc.wrap();
    var args;
    wrapped(null, 100, function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args.length).toEqual(2);
    expect(args).toEqual([null, { plus123: [101,102,103] }]);
  });
  it('propagates an external error', function() {
    var conc = new Conc({
      a: new Fun(function(v, next) { next(null, v + '_a') }),
      b: new Fun(function(v, next) { next(null, v + '_b') })
    });
    var externalError = new Error('EXTERNAL_ERROR');
    var wrapped = conc.wrap();
    var args;
    wrapped(externalError, 'ab', function() {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args.length).toEqual(1);
    expect(args[0]).toBe(externalError);
  });
  it('nothing is evaluated in the face of an external error', function() {
    var evaluated = [];
    var conc = new Conc({
      a: new Fun(function(v, next) { evaluated.push('a'); next(null, 'a'); }),
      b: new Fun(function(v, next) { evaluated.push('b'); next(null, 'b'); })
    });
    var externalError = new Error('EXTERNAL_ERROR');
    var wrapped = conc.wrap();
    var args;
    wrapped(externalError, 'ab', function() {});
    expect(evaluated).toEqual([]);
  });
});
