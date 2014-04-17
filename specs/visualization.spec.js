var Graph = require('../lib/graph');
var treeFromDsl = require('../lib/visualization').treeFromDsl;
var show = require('../lib/visualization').show;
var u_ = require('underscore');

describe('tree/dag representation', function() {
  function verify(actual, expected) {
    actual = actual.map(function(x) { return x.toString() });
    actual.sort();
    expected.sort();
    u_.zip(actual, expected).forEach(function (pair) {
      expect(pair[0]).toEqual(pair[1]);
    });
    expect(actual).toEqual(expected);
  }
  describe('DSL to tree', function() {
    it('converts an array into a linear list', function() {
      var input = [100, 200, 300];
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        't0 -> 100',
        't0 -> 200',
        't0 -> 300']);
    });
    it('converts a pure-object into a multi-child node', function() {
      var input = {a: 'A', b: 'B', c: 'C' };
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        't0 -> A',
        't0 -> B',
        't0 -> C' ]);
    });
    it('handles nesting', function() {
      var input = ['a', {b1: 'B1', b2: 'B2'}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        't0 -> a',
        't0 -> t1',
        't1 -> B1',
        't1 -> B2',
        't0 -> c' ]);
    });
    it('map of arrays', function() {
      var input = ['a', {b1: ['B11', 'B12'], b2: ['B21', 'B22']}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        't0 -> a',
        't0 -> t1',
        't0 -> c',
        't1 -> t2',
        't2 -> B11',
        't2 -> B12',
        't1 -> t3',
        't3 -> B21',
        't3 -> B22']);
    });
    it('map of arrays of different lengths', function() {
      var input = ['a', {b1: ['B11', 'B12', 'B13'], b2: ['B21', 'B22', 'B23', 'B24'], b3: ['B31']}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        't0 -> a',
        't0 -> t1',
        't0 -> c',

        't1 -> t2',
        't1 -> t3',
        't1 -> t4',

        't2 -> B11',
        't2 -> B12',
        't2 -> B13',

        't3 -> B21',
        't3 -> B22',
        't3 -> B23',
        't3 -> B24',

        't4 -> B31'
      ]);
    });
    it('map of arrays of maps', function() {
      var input = ['a', {
        b1: [
          { b111: 'B111', b112: 'B112' },
          { b121: 'B121', b122: 'B122', b123: 'B123' }
        ],
        b2: [
          { b211: 'B211', b212: 'B212' },
          { b221: 'B221', b222: 'B222', b223: 'B223' },
          { b231: 'B231', b232: 'B232' }
        ]},
        'c',
        'd'];
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        't0 -> a',
        't0 -> t1',
        't0 -> c',
        't0 -> d',

        't1 -> t2',
        't1 -> t5',

        't2 -> t3',
        't2 -> t4',

        't5 -> t6',
        't5 -> t7',
        't5 -> t8',

        't3 -> B111',
        't3 -> B112',

        't4 -> B121',
        't4 -> B122',
        't4 -> B123',

        't6 -> B211',
        't6 -> B212',

        't7 -> B221',
        't7 -> B222',
        't7 -> B223',

        't8 -> B231',
        't8 -> B232'
      ]);
    });
    it('tags split vertices with "conc"', function() {
      var input = ['a', {b1: 'B1', b2: 'B2'}, 'c'];
      var g = treeFromDsl(input, 't');
      expect(g.vertex('t0').type).toBe(undefined);
      expect(g.vertex('a').type).toBe(undefined);
      expect(g.vertex('t1').type).toEqual('conc');
      expect(g.vertex('B1').type).toBe(undefined);
      expect(g.vertex('B2').type).toBe(undefined);
      expect(g.vertex('c').type).toBe(undefined);
    });
  });
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
});



