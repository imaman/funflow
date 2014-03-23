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
});
