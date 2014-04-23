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
    return this.kids_.map(function(k) { return k.name });
  },
  setType: function(arg) { this.type_ = arg },
  setName: function(arg) { this.name = arg },
  setKey: function(arg) { this.key_ = arg  },
  setPayload: function(arg) { this.payload_ = arg },
  key: function() { return this.key_ },
  payload: function() { return this.payload_ },
  isFork: function() {
    return this.type_ === TYPE_FORK;
  },
  isSequence: function() {
    return !this.isFork() && (this.kids_.length > 0)
  },
  toString: function() { return this.key_ }
}, function(defs, kids) {
  return { kids_: kids || [] }
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
      var id = nextId();

      var node = Node.new_(dsl.map(function(current) {
        return translate(current);
      }));
      node.setKey(id);
      return node;
    }

    if (util.isPureObject(dsl)) {
      var id = nextId();

      kids = Object.keys(dsl).map(function(k) {
        var kid = translate(dsl[k]);
        kid.setName(k);
        return kid;
      });

      var node = Node.new_(kids);
      node.setType(TYPE_FORK);
      node.setKey(id);
      return node;
    }

    if (util.isFunction(dsl)) {
      var id = nextId();
      var node = Node.new_();
      node.setPayload(dsl);
      node.setKey(id);
      return node;
    }

    var node = Node.new_();
    node.setKey(dsl.toString());
    return node;
  }
  return translate(dsl);
}

exports.rootFromDsl = rootFromDsl;

