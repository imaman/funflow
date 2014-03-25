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
  describe('of a map', function() {
    it('is single vertical line when map has a single entry', function() {
      var f = new Conc({
        a: new Fun(function plusOne(v, next) { next(null, v+1) })
      });
      expect('\n' + f.show()).toEqual('\n' + [
        '----------+',
        '          plusOne()',
        '          |',
        '          a:',
        '----------+'
      ].join('\n'));
    });
    it('is two parallel verical lines when map has two entries', function() {
      var f = new Conc({
        a: new Fun(function plusOne(v, next) { next(null, v+1) }),
        b: new Fun(function plusTwo(v, next) { next(null, v+2) })
      });
      expect('\n' + f.show()).toEqual('\n' + [
        '----------+---------+',
        '          plusOne() plusTwo()',
        '          |         |',
        '          a:        b:',
        '----------+---------+'
      ].join('\n'));
    });
  });
});

