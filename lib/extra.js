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
exports.intoDiagram = intoDiagram;

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
    var self = this;
    var node =  Node.extend({ ownValue: '+', followedBy: function(x) { merge.addKid(x); }});
    var merge = Node.extend({ownValue: '---' });
    Object.keys(o).forEach(function(k) {
      var v = o[k];
      var kid = self.translate(v);
      node.addKid(kid);
      kid.followedBy(merge);
    });

    return node;
  },

  translateTerminal: function(o) {
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
        if (current.ownValue) {
          output.push(current.ownValue);
        }

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


