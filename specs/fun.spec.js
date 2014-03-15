var Fun = require('../lib/fun');

describe('Fun', function() {
  it('takes a single function argument', function() {
    new Fun(function() {});
  });
  it('refuses to take a non-function argument', function() {
    expect(function() { new Fun({}) }).toThrow();
  });
  it('translates the function', function() {
    function f1(v1, v2, next) {
      next(null, v1 + v2, v1 * v2);
    }

    var fun = new Fun(f1);
    var wrapped = fun.wrap();

    var args;
    wrapped(2, 5, function(e, v1, v2) {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args).toEqual([null, 7, 10]);
  });
  it('translates exception into err-calls on the next function', 
      function() {
    function f1(v1, v2, next) {
      throw new Error('SOME_ERROR');
    }

    var fun = new Fun(f1);
    var wrapped = fun.wrap();

    var args;
    wrapped(2, 5, function(e, v1, v2) {
      args = Array.prototype.slice.call(arguments, 0);
    });
    expect(args.length).toEqual(1);
    expect(args[0].message).toEqual('SOME_ERROR');
  });
});
