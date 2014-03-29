require('util-is');
var util = require('util');

function spawn(parent, props) {
  var defs = {}, key;
  for (key in props) {
    if (props.hasOwnProperty(key)) {
      defs[key] = {value: props[key], enumerable: true};
    }
  }
  return Object.create(parent, defs);
}

function intoDiagram(a) {
  var res = [];
  return a.map(function(x) {
    if (util.isPureObject(x)) {
      return Object.keys(x);
    }
    return x;
  });
}

var Node = spawn({}, {
  addKid: function(k) {
    this.kids.push(k);
  },
  followedBy: function(n) {
    this.addKid(n);
  }
});

var Scanner = spawn({}, {
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
    var node = spawn(Node, { kids: [], ownValue: '+', followedBy: function(x) { merge.addKid(x); }});
    var merge = spawn(Node, { kids: [], ownValue: '---' });
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
    var node = spawn(Node, { kids: [], ownValue: o });
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
  var scanner = spawn(Scanner);
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
  describe('spwned object', function() {
    it('has sll props of parents', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p);
      expect(s.a).toEqual('A');
      expect(s.b).toEqual('B');
    });
    it('is affected by a prop-mutation on the parent', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p);
      p.a = 'SOME_NEW_VALUE';
      expect(s.a).toEqual('SOME_NEW_VALUE');
    });
    it('does not affect parent', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 'C', d: 'D'});
      expect(p.c).toBe(undefined);
      expect(p.d).toBe(undefined);
    });
    it('does not show parent props in its JSON representation', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p);
      expect(JSON.stringify(s)).toEqual('{}');
    });
    it('can be created with its own props', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 'C', d: 'D'});
      expect(s.c).toEqual('C');
      expect(s.d).toEqual('D');
    });
    it('contains its own props in its JSON representation', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 'C', d: 'D'});
      expect(JSON.stringify(s)).toEqual('{"c":"C","d":"D"}');
    });
    it('can have own functions', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 5, f: function(n) { return n + this.c }});
      expect(s.f(2)).toEqual(7);
    });
    it('does not show own methods in its JSON representation', function() {
      var p = { a: 'A', b: 'B' };
      var s = spawn(p, { c: 5, f: function(n) { return n + this.c }});
      expect(JSON.stringify(s)).toEqual('{"c":5}');
    });
    it('inherits methods from parent', function() {
      var p = { a: 'A', b: 'B', f: function(v) { return this.a + this.b + this.c + v}};
      var s = spawn(p, { c: 'C' });
      expect(s.f('D')).toEqual('ABCD');
    });
    it('allows a parent method to call overriding method', function() {
      var p = { f: function(v) { return '_' + this.g() + '_' }, g: function() { return 'p' } };
      var s = spawn(p, { g: function() { return 's' }});
      expect(s.f()).toEqual('_s_');
    });
  });
});
