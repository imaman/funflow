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
  setType: function(arg) { this.type_ = arg; return this },
  setName: function(arg) { this.name = arg; return this },
  setPayload: function(arg) { this.payload_ = arg; return this },
  key: function() { return this.key_ },
  payload: function() { return this.payload_ },
  isFork: function() {
    return this.type_ === TYPE_FORK;
  },
  isSequence: function() {
    return !this.isFork() && (this.kids_.length > 0)
  },
  toString: function() { return this.key_ }
}, function(defs, id, kids) {
  return { kids_: kids || [], key_: id }
});

var Fork = Node.extend({
  isFork: function() { return true }
});

function rootFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var n = 0;

  function nextId() {
    var result = prefix + n;
    n += 1;
    return result;
  }

  function translate(dsl) {
    if (util.isArray(dsl)) {
      return Node.new_(nextId(), dsl.map(function(current) {
        return translate(current);
      }));
    }

    if (util.isPureObject(dsl)) {
      return Fork.new_(nextId(),
          Object.keys(dsl).map(function(k) {
        return translate(dsl[k]).setName(k);
      })).setType(TYPE_FORK);
    }

    if (util.isFunction(dsl)) {
      return Node.new_(nextId(), undefined).setPayload(dsl);
    }

    return Node.new_(dsl.toString(), undefined);
  }
  return translate(dsl);
}

exports.rootFromDsl = rootFromDsl;

