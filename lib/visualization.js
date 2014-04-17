require('util-is');
var util = require('util');
var Graph = require('../lib/graph');
var Screen = require('../lib/screen').Screen;
var extend = require('node.extend');
var u_ = require('underscore');

function treeFromDsl(dsl, prefix) {
  prefix = prefix || '_temp_';
  var g = Graph.new_();
  var n = 0;

  function go(dsl) {
    if (util.isArray(dsl)) {
      return dsl.reduceRight(function(soFar, current) {
        var result = go(current);
        if (soFar) {
          var e = result.connectTo(soFar);
          e.type = 'next';
        }
        return result;
      }, null);
    }

    if (util.isPureObject(dsl)) {
      var name = prefix + n;
      n += 1;
      var root = g.vertex(name);
      Object.keys(dsl).forEach(function(k) {
        var v = go(dsl[k]);
        root.connectTo(v);
      });
      return root;
    }

    return g.vertex(dsl);
  }
  go(dsl);
  return g;
}

function dump(v, options) {
  options = extend({seqShift: 1, branchShift: 1}, options);
  function preOrder(v, screen) {
    screen.putAt(0, 0, v.key);

    var row = 1;
    var col = 1;
    if (v.type === 'conc') {
      v.targets().forEach(function(t) {
        var dim = preOrder(t, screen.nested(options.branchShift, col));
        col += dim.p;
        row = Math.max(row, dim.s);
      });
      if (v.targets().length) {
        row += options.branchShift;
      }
    } else {
      v.targets().forEach(function(t) {
        var dim = preOrder(t, screen.nested(row, options.seqShift));
        row += dim.s;
        col = Math.max(col, dim.p);
      });
      if (v.targets().length) {
        col += options.seqShift;
      }
    }

    return { s: row, p: col };
  }

  var screen = Screen.new_();
  preOrder(v, screen);
  return screen.render(1);
}

exports.treeFromDsl = treeFromDsl;
exports.dump = dump;

