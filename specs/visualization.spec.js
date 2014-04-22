var Graph = require('../lib/graph');
var rootFromDsl = require('../lib/dsl').rootFromDsl;
var show = require('../lib/visualization').show;

describe('visualization', function() {
  describe('integration', function() {
    it('of a DSL containing plain strings', function() {
      var g = rootFromDsl(['a', {b1: 'B1', b2: 'B2'}, 'c'], 't');
      expect('\n' + show(g, {seqShift: 0})).toEqual(['',
        't0',
        'a',
        't1',
        '   B1 B2',
        'c'
      ].join('\n'));
    });
    it('can render a tree a deeply nested DSL', function() {
      var g = rootFromDsl([
        'a',
        {
          b1: [
            'B1',
            {b11: 'B11', b12: ['B121', 'B122', 'B123']},
            'B13'
          ],
          b2: {b21: 'B21', b22: 'B22'}
        },
        { b3: 'B3', b4: 'B5' }
      ], 't');
      expect('\n' + show(g, {seqShift: 0})).toEqual(['',
        't0',
        'a',
        't1',
        '   t2           t5',
        '   B1              B21 B22',
        '   t3',
        '       B11 t4',
        '           B121',
        '           B122',
        '           B123',
        '   B13',
        't6',
        '   B3  B5'
      ].join('\n'));
    });
  });
  describe('of real functions', function() {
    it('uses the function name for its visual representation', function() {
      var g = rootFromDsl([function f1() {}, function f2() {}], 't');
      expect('\n' + show(g)).toEqual(['',
        't0',
        '   f1',
        '   f2'
      ].join('\n'));
    });
    it('uses a unique name if the function is unnamed', function() {
      var g = rootFromDsl([function () {}, function () {}], 't');
      expect('\n' + show(g)).toEqual(['',
        't0',
        '   t1',
        '   t2'
      ].join('\n'));
    });
  });
  describe('diargam', function() {
    it('connects sequence vertices', function() {
      var g = rootFromDsl(['a', 'b', 'c', 'd']);
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        'a',
        '|',
        'b',
        '|',
        'c',
        '|',
        'd',
        '|'
      ].join('\n'));
    });
    it('connects split vertices', function() {
      var g = rootFromDsl({a: 'A', b: 'B', c: 'C'});
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        '+-+-+-+',
        '  | | |',
        '  A B C',
        '  | | |',
        '  | | |',
        '+-+-+-+'
      ].join('\n'));
    });
    it('can add left/right arrows', function() {
      var g = rootFromDsl({a: 'A', b: 'B', c: 'C'});
      expect('\n' + show(g, {splitArrows: true, connect: true})).toEqual(['',
        '|',
        '+->-+-+-+',
        '    | | |',
        '    A B C',
        '    | | |',
        '    | | |',
        '+-<-+-+-+',
      ].join('\n'));
    });
    it('extends vertical connector all the way down', function() {
      var g = rootFromDsl({a: 'A', b: ['B1', 'B2', 'B3']});
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        '+-+-+',
        '  | |',
        '  A |',
        '  | B1',
        '  | |',
        '  | B2',
        '  | |',
        '  | B3',
        '  | |',
        '  | |',
        '+-+-+'
      ].join('\n'));
    });
    it('can add a down-arrow after three bars', function() {
      var g = rootFromDsl({a: 'A', b: ['B1', 'B2', 'B3']});
      expect('\n' + show(g, {connect: true, downArrows: true})).toEqual(['',
        '|',
        '+-+-+',
        '  | |',
        '  A |',
        '  | B1',
        '  | |',
        '  | B2',
        '  v |',
        '  | B3',
        '  | |',
        '  | |',
        '+-+-+'
      ].join('\n'));
    });
    it('connects deeply nested graph', function() {
      var g = rootFromDsl([
        'a',
        {b1: 'B1', b2: 'B2', b3: {b4: 'B4', b5: 'B5'}},
        {c1: 'C1', c2: ['C3', 'C4']},
        'd']);
      expect('\n' + show(g, {connect: true})).toEqual(['',
        '|',
        'a',
        '|',
        '|',
        '+-+--+--+',
        '  |  |  |',
        '  B1 B2 |',
        '  |  |  +-+--+',
        '  |  |    |  |',
        '  |  |    B4 B5',
        '  |  |    |  |',
        '  |  |    |  |',
        '  |  |  +-+--+',
        '  |  |  |',
        '+-+--+--+',
        '|',
        '+-+--+',
        '  |  |',
        '  C1 |',
        '  |  C3',
        '  |  |',
        '  |  C4',
        '  |  |',
        '  |  |',
        '+-+--+',
        'd',
        '|'
      ].join('\n'));
    });
  });
});



