var Graph = require('../lib/graph');
var dagFromTree = require('../lib/visualization').dagFromTree;
var treeFromDsl = require('../lib/visualization').treeFromDsl;


describe('tree/dag representation', function() {
  describe('tree to dag', function() {
    function keys(vertices) {
      return vertices.map(function(v) { return v.key });
    }

    it('adds a merge vertex for each split vertex', function() {
      var g = Graph.new_();
      g.connect(1, 100);
      g.connect(1, 200);
      dagFromTree(g, {}, g.vertex(1));

      expect(g.vertices().map(function(v) { return v.key })).toEqual([1,100,200,-1]);
    });
    it('adds an edge from each branch of the split to the merge vertex', function() {
      var g = Graph.new_();
      g.connect(1, 100);
      g.connect(1, 200);
      dagFromTree(g, {}, g.vertex(1));

      expect(keys(g.vertex(-1).sources())).toEqual([100, 200]);
    });
    it('handles nesting of splits', function() {
      var g = Graph.new_();
      //
      // 1---+----------------+
      //     |                |
      //     11---+----+      12--+----+
      //          |    |          |    |
      //          111  112        121  122
      //          |    |          |    |
      //    -11---+----+     -12--+----+
      //     |                |
      // -1--+----------------+
      g.connect(1, 11);
      g.connect(1, 12);

      g.connect(11, 111);
      g.connect(11, 112);

      g.connect(12, 121);
      g.connect(12, 122);

      dagFromTree(g, {}, g.vertex(1));

      expect(keys(g.vertex(-11).sources())).toEqual([111, 112]);
      expect(keys(g.vertex(-12).sources())).toEqual([121, 122]);
      expect(keys(g.vertex(-1).sources())).toEqual([-11, -12]);
    });
    it('keeps linear sequences as-is', function() {
      var g = Graph.new_();
      g.connect(1, 2);
      g.connect(2, 3);

      dagFromTree(g, {}, g.vertex(1));

      expect(g.edges().map(function(e) { return e.toString()})).toEqual(['1 -> 2', '2 -> 3']);
    });
    it('connects last vertex in a sequence to the merge vertex of the parent', function() {
      var g = Graph.new_();
      g.connect(1, 10);
      g.connect(1, 20);
      g.connect(10, 11);
      g.connect(11, 12);
      g.connect(12, 13);

      dagFromTree(g, {}, g.vertex(1));

      expect(keys(g.vertex(-1).sources())).toEqual([13,20]);
      expect(g.edges().map(function(e) { return e.toString()})).toEqual([
        '1 -> 10',
        '1 -> 20',
        '10 -> 11',
        '11 -> 12',
        '12 -> 13',
        '13 -> -1',
        '20 -> -1']);
    });
    it('handles a split in the middle of a sequence', function() {
      var g = Graph.new_();
      g.connect(1, 2);
      g.connect(2, 21);
      g.connect(2, 22);
      g.connect(2, 3).type = 'next';

      dagFromTree(g, {}, g.vertex(1));

      expect(g.edges().map(function(e) { return e.toString()})).toEqual([
        '1 -> 2',
        '2 -> 21',
        '2 -> 22',
        '21 -> -2',
        '22 -> -2',
        '-2 -> 3']);
    });
  });
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
  function order(v) {
    var result = [];
    while(v) {
      result.push([v.toString()]);
      v = v.targets()[0];
    }
    return result;
  }
  describe('dag to ASCII diagram', function() {
    describe('printing order', function() {
      it('linear in a sequence', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'c');
        expect(order(g.vertex('a'))).toEqual([
          ['a'],
          ['b'],
          ['c']]);
      });
    });
  });
});
