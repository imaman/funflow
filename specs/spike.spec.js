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
    var temp = [];
    var q = [];
    q.push({v: v, depth: 0});
    var visitCountByVertex = {};

    while(q.length > 0) {
      var current = q.shift();
      var visitCount = visitCountByVertex[current.v] || 0;
      visitCount += 1;
      visitCountByVertex[current.v] = visitCount;
      if (visitCount < current.v.incoming().length) {
        continue;
      }

      temp.push(current);
      current.v.targets().forEach(function(t) {
        q.push({v: t, depth: current.depth + 1});
      });
    }

    function groupBy(array, map) {
      var groups = {};
      array.forEach(function(o) {
        var group = JSON.stringify(map(o));
        groups[group] = groups[group] || [];
        groups[group].push(o);
      });
      return groups;
    }

    var groups = groupBy(temp, function(o) { return o.depth });
    var result = Object.keys(groups).map(function(k) {
      return {d: k, vs: groups[k].map(function(x) { return x.v })}
    });
    result.sort(function(x, y) {
      var dx = Number(x.d);
      var dy = Number(y.d);
      return (dx === dy) ? 0 : (dx < dy) ? -1 : 1;
    });
    return result.map(function(x) { return x.vs.map(function(v) { return v.toString() }) });
  }
  describe('dag to ASCII diagram', function() {
    describe('printing order', function() {
      it('is linear in a sequence', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'c');
        expect(order(g.vertex('a'))).toEqual([
          ['a'],
          ['b'],
          ['c']]);
      });
      it('is parallel for branches', function() {
        var g = Graph.new_();
        g.connect('a', 'a1');
        g.connect('a', 'a2');
        expect(order(g.vertex('a'))).toEqual([
          ['a'],
          ['a1', 'a2']]);
      });
      it('each vertex appears once', function() {
        var g = Graph.new_();
        g.connect('a', 'a1');
        g.connect('a', 'a2');
        g.connect('a1', 'b');
        g.connect('a2', 'b');
        g.connect('b', 'c');
        expect(order(g.vertex('a'))).toEqual([
          ['a'],
          ['a1', 'a2'],
          ['b'],
          ['c']]);
      });
      it('a vertex appears only after all incoming edges have been traversed', function() {
        var g = Graph.new_();
        g.connect('a', 'a1');
        g.connect('a', 'a2');
        g.connect('a1', 'a1_1');
        g.connect('a1_1', 'b');
        g.connect('a2', 'b');
        g.connect('b', 'c');
        expect(order(g.vertex('a'))).toEqual([
          ['a'],
          ['a1', 'a2'],
          ['a1_1'],
          ['b'],
          ['c']]);
      });
    });
    describe('width', function() {
      function preOrder(root, f) {
        function dfs(v) {
          var outgoing = v.outgoing();
          if (outgoing.length === 0) {
            return f([], undefined);
          }
          if (outgoing.length === 1) {
            return f([], dfs(outgoing[0].to));
          }

          var acc = [];
          var next;
          outgoing.forEach(function(e) {
            if (e.type === 'next')
              next = dfs(e.to);
            else
              acc.push(dfs(e.to));
          });
          return f(acc, next);
        }

        return dfs(root);
      }

      function width(v) {
        return preOrder(v, function(kids, next) {
          if (kids.length === 0 && next === undefined)
            return 1;

          if (kids.length === 0)
            return next;

          var widthOfKids = kids.reduce(function(a,b) { return a + b }, 1);
          return Math.max(widthOfKids, next);
        });
      }
      it('of a seq. is 1', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'c');
        g.connect('c', 'd');

        expect(width(g.vertex('a'))).toEqual(1);
      });
      it('adds 1 for each conc branch', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'b1');
        g.connect('b', 'b2');
        g.connect('b', 'b3');
        g.connect('b', 'c').type = 'next';
        g.connect('c', 'd');

        expect(width(g.vertex('a'))).toEqual(4);
      });
      it('allows conc branches to be of different lengths', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'b1');
        g.connect('b', 'b2');
        g.connect('b2', 'b2_1');
        g.connect('b2_1', 'b2_2');
        g.connect('b', 'b3');
        g.connect('b', 'c').type = 'next';
        g.connect('c', 'd');

        expect(width(g.vertex('a'))).toEqual(4);
      });
      it('takes max. among several concurrent', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'b1');
        g.connect('b', 'b2');
        g.connect('b', 'b3');
        g.connect('b', 'c').type = 'next';
        g.connect('c', 'd');
        g.connect('d', 'e');
        g.connect('e', 'e1');
        g.connect('e', 'e2');
        g.connect('e', 'e3');
        g.connect('e', 'e4');
        g.connect('e', 'e5');
        g.connect('e', 'f').type = 'next';
        g.connect('f', 'g');

        expect(width(g.vertex('a'))).toEqual(6);
      });
      it('acccumulates nesting of concurrent branches', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'b1');
        g.connect('b1', 'b1_1');
        g.connect('b1', 'b1_2');
        g.connect('b1', 'b1_3');
        g.connect('b1', 'b1_end').type = 'next';
        g.connect('b', 'b2');
        g.connect('b', 'b3');
        g.connect('b', 'c').type = 'next';
        g.connect('c', 'd');
        g.connect('d', 'e');
        g.connect('e', 'e1');
        g.connect('e', 'e2');
        g.connect('e', 'f').type = 'next';
        g.connect('f', 'g');

        expect(width(g.vertex('a'))).toEqual(7);
      });
      it('handles several nesting in parallel', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'b1');
        g.connect('b1', 'b1_1');
        g.connect('b1', 'b1_2');
        g.connect('b1', 'b1_3');
        g.connect('b1', 'b1_end').type = 'next';
        g.connect('b', 'b2');
        g.connect('b', 'b3');
        g.connect('b3', 'b3_1');
        g.connect('b3', 'b3_2');
        g.connect('b3', 'b3_3');
        g.connect('b3', 'b3_4');
        g.connect('b3', 'b3_end').type = 'next';
        g.connect('b', 'c').type = 'next';
        g.connect('c', 'd');
        g.connect('d', 'e');
        g.connect('e', 'e1');
        g.connect('e', 'e2');
        g.connect('e', 'f').type = 'next';
        g.connect('f', 'g');

        expect(width(g.vertex('a'))).toEqual(11);
      });
    });
    describe('printing depth', function() {
      function depth(v) {
        var result = {};
        var countByVertex = {};
        function dfs(v, baseDepth) {
          var count = countByVertex[v] || 0;
          count += 1;
          countByVertex[v] = count;
          if (count < v.incoming().length) {
            return;
          }

          if (v.incoming().length > 1) {
            baseDepth = v.sources().map(function(s) { return result[s] }).reduce(function(soFar, current) {
              if (soFar === undefined)
                return current;
              return soFar < current ? soFar : current;
            }, undefined) - 1;
          }
          result[v] = baseDepth;

          var numTargets = v.targets().length;
          if (numTargets === 0) {
            return;
          }
          if (numTargets === 1) {
            return dfs(v.targets()[0], baseDepth);
          }
          v.targets().forEach(function(t, index) {
            dfs(t, baseDepth + index + 1);
          });
        }

        dfs(v, 0);
        return result;
      }
      it('is zero for a pure sequence', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'c');
        expect(depth(g.vertex('a'))).toEqual({
          a: 0,
          b: 0,
          c: 0});
      });
      it('is +1 for each conc branch', function() {
        var g = Graph.new_();
        g.connect('a', 'b');
        g.connect('b', 'b1');
        g.connect('b', 'b2');
        g.connect('b1', 'c');
        g.connect('b2', 'c');

        expect(depth(g.vertex('a'))).toEqual({
          a: 0,
          b: 0,
          b1: 1,
          b2: 2,
          c: 0});
      });
    });
  });
});



