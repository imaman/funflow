var rootFromDsl = require('../lib/dsl').rootFromDsl;
var u_ = require('underscore');

describe('DSL', function() {
  function verify(actual, expected) {
    var acc = [];
    function dfs(n) {
      n.kids().forEach(function(t) {
        acc.push(n + ' -> ' + t);
        dfs(t);
      });
    }
    dfs(actual);
    actual = acc;

    actual.sort();
    expected.sort();
    u_.zip(actual, expected).forEach(function (pair) {
      expect(pair[0]).toEqual(pair[1]);
    });
    expect(actual).toEqual(expected);
  }
  describe('to tree', function() {
    it('converts an array into a linear list', function() {
      var input = [100, 200, 300];
      var g = rootFromDsl(input, 't');
      verify(g, [
        't0 -> 100',
        't0 -> 200',
        't0 -> 300']);
    });
    it('converts a pure-object into a multi-child node', function() {
      var input = {a: 'A', b: 'B', c: 'C' };
      var g = rootFromDsl(input, 't');
      verify(g, [
        't0 -> A',
        't0 -> B',
        't0 -> C' ]);
    });
    it('handles nesting', function() {
      var input = ['a', {b1: 'B1', b2: 'B2'}, 'c'];
      var g = rootFromDsl(input, 't');
      verify(g, [
        't0 -> a',
        't0 -> t1',
        't1 -> B1',
        't1 -> B2',
        't0 -> c' ]);
    });
    it('map of arrays', function() {
      var input = ['a', {b1: ['B11', 'B12'], b2: ['B21', 'B22']}, 'c'];
      var g = rootFromDsl(input, 't');
      verify(g, [
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
      var g = rootFromDsl(input, 't');
      verify(g, [
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
      var g = rootFromDsl(input, 't');
      verify(g, [
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
      var g = rootFromDsl(input, 't');
      var acc = {};
      function dfs(n) {
        acc[n] = n;
        n.kids().forEach(function(k) {
          dfs(k);
        });
      }
      dfs(g);
      expect(acc['t0'].type).toBe(undefined);
      expect(acc['a'].type).toBe(undefined);
      expect(acc['t1'].isFork()).toBe(true);
      expect(acc['t1'].isSequence()).toBe(false);
      expect(acc['B1'].type).toBe(undefined);
      expect(acc['B2'].type).toBe(undefined);
      expect(acc['c'].type).toBe(undefined);
    });
    it('tags split edges with the corresponding attribute name', function() {
      var root = rootFromDsl({b1: 'B1', b2: 'B2'});
      expect(root.branchNames()).toEqual(['b1', 'b2']);
    });
  });
  describe('with real functions', function() {
    it('generates a unique key for a function vertex', function() {
      var g = rootFromDsl([function a1() {}, function a2() {}], 't');
      verify(g, [
        't0 -> t1',
        't0 -> t2'
      ]);
    });
    it('stores the function in .payload', function() {
      function f1() {}
      function f2() {}
      var root = rootFromDsl([f1, f2], 't');
      expect(root.kids()[0].payload).toBe(f1);
      expect(root.kids()[1].payload).toBe(f2);
    });
  });
});
