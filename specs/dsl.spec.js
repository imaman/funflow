var treeFromDsl = require('../lib/dsl').treeFromDsl;
var u_ = require('underscore');

describe('DSL', function() {
  function verify(actual, expected) {
    var acc = [];
    function toS(n) {
      return n.displayName ? n.displayName() : n.toString()
    }
    function dfs(n) {
      n.forEach(function(t) {

        acc.push(toS(n) + ' -> ' + toS(t));
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
      var g = treeFromDsl(input, 't');
      verify(g, [
        't0 -> 100',
        't0 -> 200',
        't0 -> 300']);
    });
    it('converts a pure-object into a multi-child node', function() {
      var input = {a: 'A', b: 'B', c: 'C' };
      var g = treeFromDsl(input, 't');
      verify(g, [
        't0 -> A',
        't0 -> B',
        't0 -> C' ]);
    });
    it('handles nesting', function() {
      var input = ['a', {b1: 'B1', b2: 'B2'}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g, [
        't0 -> a',
        't0 -> t2',
        't2 -> B1',
        't2 -> B2',
        't0 -> c' ]);
    });
    it('map of arrays', function() {
      var input = ['a', {b1: ['B11', 'B12'], b2: ['B21', 'B22']}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g, [
        't0 -> a',
        't0 -> c',
        't0 -> t2',
        't2 -> t3',
        't2 -> t6',
        't3 -> B11',
        't3 -> B12',
        't6 -> B21',
        't6 -> B22'
      ]);
    });
    it('map of arrays of different lengths', function() {
      var input = ['a', {b1: ['B11', 'B12', 'B13'], b2: ['B21', 'B22', 'B23', 'B24'], b3: ['B31']}, 'c'];
      var g = treeFromDsl(input, 't');
      verify(g, [
        't0 -> a',
        't0 -> c',
        't0 -> t2',
        't12 -> B31',
        't2 -> t12',
        't2 -> t3',
        't2 -> t7',
        't3 -> B11',
        't3 -> B12',
        't3 -> B13',
        't7 -> B21',
        't7 -> B22',
        't7 -> B23',
        't7 -> B24'
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
      verify(g, [
        't0 -> a',
        't0 -> c',
        't0 -> d',
        't0 -> t2',
        't11 -> t12',
        't11 -> t15',
        't11 -> t19',
        't12 -> B211',
        't12 -> B212',
        't15 -> B221',
        't15 -> B222',
        't15 -> B223',
        't19 -> B231',
        't19 -> B232',
        't2 -> t11',
        't2 -> t3',
        't3 -> t4',
        't3 -> t7',
        't4 -> B111',
        't4 -> B112',
        't7 -> B121',
        't7 -> B122',
        't7 -> B123'
      ]);
    });
    it('tags split edges with the corresponding attribute name', function() {
      var root = treeFromDsl({b1: 'B1', b2: 'B2'});
      expect(root.map(function(x) { return x.slot() })).toEqual(['b1', 'b2']);
    });
  });
  describe('with real functions', function() {
    it('generates a unique key for a function vertex', function() {
      var g = treeFromDsl([function a1() {}, function a2() {}], 't');
      verify(g, [
        't0 -> a1',
        't0 -> a2'
      ]);
    });
    it('stores the function in .payload', function() {
      var acc = '';
      function f1() { acc += 'f1' }
      function f2() { acc += 'f2' }
      var root = treeFromDsl([f1, f2], 't');
      var temp = root.map(function(x) { return x.payload() });
      temp[0](null);
      expect(acc).toEqual('f1');
      temp[1](null);
      expect(acc).toEqual('f1f2');
    });
  });
  describe('visitation', function() {
    it('dispatches .fork() in a fork', function() {
      var fork = treeFromDsl({a: function a1() {}});
      var captured;
      var others = 0;
      fork.accept({
        fork: function(n) { captured = n },
        sequence: function(n) { ++others },
        terminal: function(n) { ++others }
      });

      expect(others).toEqual(0);
      expect(captured).toBe(fork);
    });
    it('dispatches .sequence() in a sequence', function() {
      var seq = treeFromDsl([function a1() {}]);
      var captured;
      var others = 0;
      seq.accept({
        fork: function(n) { ++others },
        sequence: function(n) { captured = n },
        terminal: function(n) { ++others }
      });

      expect(others).toEqual(0);
      expect(captured).toBe(seq);
    });
    it('dispatches .terminal() in a terminal', function() {
      var terminal = treeFromDsl(function a1() {});
      var captured;
      var others = 0;
      terminal.accept({
        fork: function(n) { ++others },
        sequence: function(n) { ++others },
        computation: function(n) { captured = n }
      });

      expect(others).toEqual(0);
      expect(captured).toBe(terminal);
    });
  });
});
