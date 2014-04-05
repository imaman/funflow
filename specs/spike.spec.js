require('util-is');
var util = require('util');
var Graph = require('../lib/graph');
var Top = require('../lib/top').Top;

function intoDiagram(a) {
  var res = [];
  return a.map(function(x) {
    if (util.isPureObject(x)) {
      return Object.keys(x);
    }
    return x;
  });
}

var Node = Top.extend({
  addKid: function(k) {
    this.kids.push(k);
  },
  followedBy: function(n) {
    this.addKid(n);
  }
}, function() { return { kids: [] }});

var Scanner = Top.extend({
  waitlist: [],
  addToWaitList: function(v) {
    this.waitlist.push(v);
  },
  schedule: function(o) {
    this.waitlist.push(this.translate(o));
  },
  translateArray: function(o) {
    console.log('ARRAY ' + JSON.stringify(o));
    if (o.length === 0)
      throw new Error('Cannot translate an empty array');

    var self = this;
    var nodes = o.map(function(current) {
      return self.translate(current);
    });
    nodes.forEach(function(current, i) {
      if (i > 0)
        nodes[i-1].followedBy(current);
    });
    return nodes[0];
  },
  translateObject: function(o) {
    console.log('OBJECT ' + JSON.stringify(o));
    var self = this;
    var node =  Node.extend({ ownValue: '+', followedBy: function(x) { merge.addKid(x); }});
    var merge = Node.extend({ownValue: '---' });
    Object.keys(o).forEach(function(k) {
      var v = o[k];
      console.log('  k=' + k + ', v=' + v);
      var kid = self.translate(v);
      node.addKid(kid);
      kid.followedBy(merge);
//      console.log('  ----> #keys=' + Object.keys(o).length, '#kids=' + node.kids.length);
    });

    return node;
  },

  translateTerminal: function(o) {
    console.log('TERMINAL ' + JSON.stringify(o));
    var node = Node.extend({ownValue: o });
    return node;
  },

  translate: function(o) {
    if (util.isArray(o)) {
      return this.translateArray(o);
    }

    if (util.isPureObject(o)) {
      return this.translateObject(o);
    }

    return this.translateTerminal(o);
  },
  run: function(output) {
    console.log('.run()');
    var depth = 0;
    while (true) {
      ++depth;
      if (depth > 100)
        throw new Error('Too deep');
      if (this.waitlist.length === 0)
        return;

      var self = this;

      var copy = [].concat(this.waitlist);
      this.waitlist.splice(0);
      copy.forEach(function(current) {
        ++depth;
        if (depth > 100)
          throw new Error('Too deep');
        console.log('discovered ' + JSON.stringify(current));
        if (current.ownValue) {
          output.push(current.ownValue);
        }

        console.log('kids=' + JSON.stringify(current.kids));
        current.kids.forEach(function(k) {
          self.waitlist.push(k);
        });
      });
    }
  }
});

function order(a) {
  if (!util.isArray(a)) {
    throw new Error('Expected array, but go ' + a);
  }
  var scanner = Scanner.new_();
  scanner.schedule(a);
  var result = [];
  scanner.run(result);

  return result;
}


describe('ASCII diagram', function() {
  it('is a single column when the flow is sequential', function() {
    var f = ['a', 'b', 'c'];
    expect(intoDiagram(f)).toEqual(['a', 'b' ,'c']);
  });
  it('is has an array in each row at which two cocurrent flows exists', function() {
    var f = ['a', {b1: 'B1', b2: 'B2'}, 'c'];
    expect(intoDiagram(f)).toEqual(['a', ['b1', 'b2'] ,'c']);
  });
  xit('computes printing order', function() {
    //expect(order(['a'])).toEqual(['a']);
    //expect(order(['a,b,c,d'])).toEqual(['a,b,c,d']);
    expect(order(['a', {b1: 'B1', b2: 'B2' }, 'c'])).
        toEqual(['a'], ['+', 'B1', 'B2'], ['c']);
  });
  function transform(g, visited, v) {
    var targets = v.targets();
    if (targets.length === 0)
      return v;

    if (targets.length === 1) {
      return transform(g, visited, targets[0]);
    }

    var result = g.vertex(- Number(v));
    targets.forEach(function(t) {
      transform(g, visited, t).connectTo(result);
    });

    return result;
  }
  describe('tree to dag transformation', function() {
    function keys(vertices) {
      return vertices.map(function(v) { return v.key });
    }

    it('adds a merge vertex for each split vertex', function() {
      var g = Graph.new_();
      g.connect(1, 100);
      g.connect(1, 200);
      transform(g, {}, g.vertex(1));

      expect(g.vertices().map(function(v) { return v.key })).toEqual([1,100,200,-1]);
    });
    it('adds an edge from each branch of the split to the merge vertex', function() {
      var g = Graph.new_();
      g.connect(1, 100);
      g.connect(1, 200);
      transform(g, {}, g.vertex(1));

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

      transform(g, {}, g.vertex(1));

      expect(keys(g.vertex(-11).sources())).toEqual([111, 112]);
      expect(keys(g.vertex(-12).sources())).toEqual([121, 122]);
      expect(keys(g.vertex(-1).sources())).toEqual([-11, -12]);
    });
    it('keeps linear sequences as-is', function() {
      var g = Graph.new_();
      g.connect(1, 2);
      g.connect(2, 3);

      transform(g, {}, g.vertex(1));

      expect(g.edges().map(function(e) { return e.toString()})).toEqual(['1 -> 2', '2 -> 3']);
    });
    it('connects last vertex in a sequence to the merge vertex of the parent', function() {
      var g = Graph.new_();
      g.connect(1, 10);
      g.connect(1, 20);
      g.connect(10, 11);
      g.connect(11, 12);
      g.connect(12, 13);

      transform(g, {}, g.vertex(1));

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
  });
});
