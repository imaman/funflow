var Graph = require('../lib/graph');
var Top = require('../lib/top').Top;
require('util-is');
var util = require('util');

var TYPE_FORK = 'fork';

var Node = Top.extend({
  kids: function() { return this.kids_ },
  branchNames: function() {
    if (!this.isFork())
      throw new Error('Branches are present only in forks');
    return this.v_.outgoing().map(function(e) { return e.name })
  },
  setType: function(arg) { this.type_ = arg },
  key: function() { return this.v_.key },
  payload: function() { return this.v_.payload },
  isFork: function() {
    return this.type_ === TYPE_FORK;
  },
  isSequence: function() {
    return !this.isFork() && (this.kids_.length > 0)
  },
  toString: function() { return this.v_.key }
}, function(defs, v, kids) {
  return { v_: v, kids_: kids }
});

function rootFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var g = Graph.new_();
  var n = 0;

  function nextId() {
    var result = prefix + n;
    n += 1;
    return result;
  }

  function translate(dsl) {
    var root;
    var kids;
    if (util.isArray(dsl)) {
      root = g.vertex(nextId());

      var node = Node.new_(root, dsl.map(function(current) {
        return translate(current);
      }));
      node.kids().forEach(function(kid) {
        root.connectTo(kid.v_);
      });
      return node;
    }

    if (util.isPureObject(dsl)) {
      root = g.vertex(nextId());

      kids = Object.keys(dsl).map(function(k) {
        return [k,translate(dsl[k])];
      });

      kids.forEach(function(nameAndKid) {
        var name = nameAndKid[0];
        var kid = nameAndKid[1];
        root.connectTo(kid.v_).name = name;
      });
      var node = Node.new_(root, kids.map(function(nameAndKid) {
        return nameAndKid[1];
      }));
      node.setType(TYPE_FORK);
      return node;
    }

    if (util.isFunction(dsl)) {
      root = g.vertex(nextId());
      root.payload = dsl;
      return Node.new_(root, []);
    }

    return Node.new_(g.vertex(dsl), []);
  }
  return translate(dsl);
}

exports.rootFromDsl = rootFromDsl;

