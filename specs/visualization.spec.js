var Graph = require('../lib/graph');
var rootFromDsl = require('../lib/dsl').rootFromDsl;
var show = require('../lib/visualization').show;

describe('visualization', function() {
  describe('show', function() {
    it('is a string with horizontal indentation', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      expect(show(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '   a',
        '   r1',
        '      b1',
        '      b2']);
    });
    it('nests as needed', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1');
      g.connect('r1', 'b2');
      g.connect('r1', 'r2');
      g.connect('r2', 'b3');
      g.connect('r2', 'r3');
      g.connect('r3', 'b4');
      g.connect('r3', 'b5');
      g.connect('r3', 'b6');
      g.connect('r2', 'b7');
      g.connect('r0', 'c');
      g.connect('r0', 'd');

      expect(show(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '   a',
        '   r1',
        '      b1',
        '      b2',
        '      r2',
        '         b3',
        '         r3',
        '            b4',
        '            b5',
        '            b6',
        '         b7',
        '   c',
        '   d']);
    });
    it('children of a "conc" node are indented horizontally', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'b1').from.type = 'conc';
      g.connect('r1', 'b2');

      expect(show(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '   a',
        '   r1',
        '      b1 b2']);
    });
    it('two-level concurrency', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r1', 'r2').from.type = 'conc';
      g.connect('r1', 'b3');
      g.connect('r2', 'b1').from.type = 'conc';
      g.connect('r2', 'b2');

      expect(show(g.vertex('r0')).split('\n')).toEqual([
        'r0',
        '   a',
        '   r1',
        '      r2       b3',
        '         b1 b2'
      ]);
    });
    it('concurrency at root', function() {
      var g = Graph.new_();
      g.connect('r0', 'a').from.type = 'conc';
      g.connect('r0', 'b');

      expect(show(g.vertex('r0'))).toEqual([
        'r0',
        '   a b'
      ].join('\n'));
    });
    it('concurrency with inner sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';

      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      expect('\n' + show(g.vertex('r0'))).toEqual(['',
        'r0',
        '   r1',
        '      b1',
        '      b2'
      ].join('\n'));
    });
    it('sequence inside a concurrent branch', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'b2');

      g.connect('r1', 'b1');

      expect('\n' + show(g.vertex('r0'))).toEqual(['',
        'r0',
        '   r1    b2',
        '      b1'
      ].join('\n'));
    });
    it('concurrent branch inside a sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r0', 'b');

      g.connect('r1', 'c1').from.type = 'conc';
      g.connect('r1', 'c2');

      expect('\n' + show(g.vertex('r0'))).toEqual(['',
        'r0',
        '   a',
        '   r1',
        '      c1 c2',
        '   b'
      ].join('\n'));
    });
    it('two concurrent sequences', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'r2');

      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      g.connect('r2', 'b3');
      g.connect('r2', 'b4');
      g.connect('r2', 'b5');

      expect(show(g.vertex('r0'))).toEqual([
        'r0',
        '   r1    r2',
        '      b1    b3',
        '      b2    b4',
        '            b5'
      ].join('\n'));
    });
    it('two level concurrency with nested sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');

      g.connect('r1', 'r2').from.type = 'conc';
      g.connect('r1', 'r3');
      g.connect('r2', 'r4').from.type = 'conc';
      g.connect('r2', 'b1');

      g.connect('r4', 'b3');
      g.connect('r4', 'b4');
      g.connect('r4', 'b5');

      g.connect('r3', 'b6');
      g.connect('r3', 'b7');

      expect('\n' + show(g.vertex('r0'))).toEqual(['',
        'r0',
        '   a',
        '   r1',
        '      r2          r3',
        '         r4    b1    b6',
        '            b3       b7',
        '            b4',
        '            b5'
      ].join('\n'));
    });
    it('allows sequences to be laid out vertically', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r0', 'b');

      g.connect('r1', 'c1').from.type = 'conc';
      g.connect('r1', 'c2');

      expect('\n' + show(g.vertex('r0'), {seqShift: 0})).toEqual(['',
        'r0',
        'a',
        'r1',
        '   c1 c2',
        'b'
      ].join('\n'));
    });
    it('concurrent branch inside a no-shift sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'a');
      g.connect('r0', 'r1');
      g.connect('r0', 'b');

      g.connect('r1', 'c1').from.type = 'conc';
      g.connect('r1', 'c2');

      expect('\n' + show(g.vertex('r0'), {seqShift: 0})).toEqual(['',
        'r0',
        'a',
        'r1',
        '   c1 c2',
        'b'
      ].join('\n'));
    });
    it('no shift sequence inside a concurrent branch', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'b1');

      g.connect('r1', 'b2');
      g.connect('r1', 'b3');

      expect('\n' + show(g.vertex('r0'), {seqShift: 0})).toEqual(['',
        'r0',
        '   r1 b1',
        '   b2',
        '   b3'
      ].join('\n'));
    });
    it('no-shift branch', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'r2');

      g.connect('r1', 'b1');
      g.connect('r2', 'b2');

      expect('\n' + show(g.vertex('r0'), {branchShift: 0})).toEqual(['',
        'r0 r1    r2',
        '      b1    b2'
      ].join('\n'));
    });
    it('no-shift branch inside a sequence', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1');
      g.connect('r0', 'c');
      g.connect('r0', 'd');

      g.connect('r1', 'r2').from.type = 'conc';
      g.connect('r1', 'r3');

      g.connect('r2', 'b1');
      g.connect('r3', 'b2');

      expect('\n' + show(g.vertex('r0'), {branchShift: 0})).toEqual(['',
        'r0',
        '   r1 r2    r3',
        '         b1    b2',
        '   c',
        '   d'
      ].join('\n'));
    });
    it('no-shifting of both sequences and branches', function() {
      var g = Graph.new_();
      g.connect('r0', 'r1').from.type = 'conc';
      g.connect('r0', 'r2');

      g.connect('r1', 'b1');
      g.connect('r1', 'b2');

      g.connect('r2', 'b3');
      g.connect('r2', 'b4');
      g.connect('r2', 'b5');

      expect('\n' + show(g.vertex('r0'), {seqShift: 0, branchShift: 0})).toEqual(['',
        'r0 r1 r2',
        '   b1 b3',
        '   b2 b4',
        '      b5'
      ].join('\n'));
    });
  });
  describe('integration', function() {
    it('can render a tree constructed from DSL', function() {
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



