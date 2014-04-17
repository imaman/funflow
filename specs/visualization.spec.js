var Graph = require('../lib/graph');
var dagFromTree = require('../lib/visualization').dagFromTree;
var treeFromDsl = require('../lib/visualization').treeFromDsl;
var width = require('../lib/visualization').width;
var order = require('../lib/visualization').order;

describe('tree/dag representation', function() {
  function verify(actual, expected) {
    actual = actual.map(function(x) { return x.toString() });
    actual.sort();
    expected.sort();
    expect(actual).toEqual(expected);
  }
  describe('DSL to tree', function() {
    it('converts an array into a linear list', function() {
      var input = [100, 200, 300];
      var g = treeFromDsl(input);
      verify(g.edges(), [
        '100 -> 200',
        '200 -> 300']);
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
        'a -> t0',
        't0 -> B1',
        't0 -> B2',
        't0 -> c' ]);
    });
    it('map of arrays', function() {
      var input = ['a', {b1: ['B11', 'B12'], b2: ['B21', 'B22']}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        'a -> t0',
        't0 -> B11',
        't0 -> B21',
        't0 -> c',
        'B11 -> B12',
        'B21 -> B22']);
    });
    it('map of arrays of different lengths', function() {
      var input = ['a', {b1: ['B11', 'B12', 'B13'], b2: ['B21', 'B22', 'B23', 'B24'], b3: ['B31']}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g.edges(), [
        'a -> t0',
        't0 -> B11',
        't0 -> B21',
        't0 -> B31',
        't0 -> c',
        'B11 -> B12',
        'B12 -> B13',
        'B21 -> B22',
        'B22 -> B23',
        'B23 -> B24']);
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
      verify(g.edges().filter(function(e) { return e.type === 'next' }), [
        'a -> t0',
        't0 -> c',
        'c -> d',
        't2 -> t1',
        't5 -> t4',
        't4 -> t3']);

      verify(g.edges(), [
        'a -> t0',

        't0 -> t2',
        't0 -> t5',
        't0 -> c',

        't2 -> B111',
        't2 -> B112',
        't2 -> t1',

        't5 -> B211',
        't5 -> B212',
        't5 -> t4',

        't1 -> B121',
        't1 -> B122',
        't1 -> B123',

        't4 -> B221',
        't4 -> B222',
        't4 -> B223',
        't4 -> t3',

        't3 -> B231',
        't3 -> B232',

        'c -> d']);
    });
    it('tags edges in a sequence with "next"', function() {
      var input = ['a', {b1: 'B1', b2: 'B2'}, 'c'];
      var g = treeFromDsl(input);
      expect(g.vertex('a').outgoing().map(function(e) { return e.type })).toEqual(['next']);
      expect(g.vertex('B1').incoming().map(function(e) { return e.type })).toEqual([undefined]);
      expect(g.vertex('B2').incoming().map(function(e) { return e.type })).toEqual([undefined]);
      expect(g.vertex('c').incoming().map(function(e) { return e.type })).toEqual(['next']);
    });
  });
});



