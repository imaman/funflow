var Top = require('../lib/top').Top;
require('util-is');
var util = require('util');

var Node = Top.extend({
  kids: function() { return this.kids_ },
  setName: function(arg) { this.name = arg; return this },
  key: function() { return this.key_ },
  isFork: function() { return false },
  isSequence: function() { return false },
  toString: function() { return this.key_ }
}, function(defs, id, kids) {
  return { kids_: kids || [], key_: id }
});

var Sequence = Node.extend({
  isFork: function() { return false },
  isSequence: function() { return true }
});

var Fork = Node.extend({
  isFork: function() { return true },
  isSequence: function() { return false },
  branchNames: function() {
    return this.kids_.map(function(k) { return k.name });
  },
});

var Terminal = Node.extend({
  setPayload: function(arg) { this.payload_ = arg; return this },
  payload: function() { return this.payload_ }
}, function(defs, id, payload) {
  return { kids_: undefined, key_: id, payload_: payload }
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
      return Sequence.new_(nextId(), dsl.map(function(current) {
        return translate(current);
      }));
    }

    if (util.isPureObject(dsl)) {
      return Fork.new_(nextId(), Object.keys(dsl).map(function(k) {
        return translate(dsl[k]).setName(k);
      }));
    }

    if (util.isFunction(dsl)) {
      return Terminal.new_(nextId(), dsl);
    }

    return Terminal.new_(dsl.toString());
  }
  return translate(dsl);
}

exports.rootFromDsl = rootFromDsl;

