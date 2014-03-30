require('util-is');
var util = require('util');
var Graph = require('../lib/graph');
var spawn = require('../lib/top').spawn;

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
});
