var Conc = require('../lib/conc');
var Seq = require('../lib/seq');
var Fun = require('../lib/fun');

describe('visualization', function() {
  describe('of a single function', function() {
    it('is simply a string', function() {
      var f = new Fun(function plusOne(v, next) { next(null, v+1) });
      expect(f.show()).toEqual('plusOne()');
    });
    it('is adjusted by the given offset', function() {
      var f = new Fun(function plusOne(v, next) { next(null, v+1) });
      expect(f.show(5)).toEqual('     plusOne()');
    });
  });
});

