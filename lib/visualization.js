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

  function translate(dsl) {
    var root;
    if (util.isArray(dsl)) {
      var name = prefix + n;
      n += 1;
      root = g.vertex(name);

      dsl.forEach(function(current) {
        var child = translate(current);
        root.connectTo(child);
      });
      return root;
    }

    if (util.isPureObject(dsl)) {
      var name = prefix + n;
      n += 1;
      root = g.vertex(name);
      Object.keys(dsl).forEach(function(k) {
        var v = translate(dsl[k]);
        root.connectTo(v);
      });
      root.type = 'conc';
      return root;
    }

    return g.vertex(dsl);
  }
  translate(dsl);
  return g;
}

function show(v, options) {
  options = extend({seqShift: 1, branchShift: 1, connect: false},
      options);
  function preOrder(v, screen) {
    screen.putAt(0, 0, v.key);

    var row = 1;
    var col = 1;
    if (v.type === 'conc') {
      if (options.connect) {
        screen.putAt(0, 0, '|');
        screen.putAt(1, 0, '+', '-');
      }
      var cols = [];
      var bottom = row;
      var displace = options.connect ? 3 : options.branchShift;
      v.targets().forEach(function(t) {
        cols.push(col);
        var dim = preOrder(t, screen.nested(displace, col));
        col += dim.p;
        bottom = Math.max(bottom, displace + dim.s);
      });
      row = bottom;
      if (options.connect) {
        cols.forEach(function(c, index) {
          screen.putAt(1, c, '+', index === (cols.length - 1) ? undefined : '-');
        });
        cols.forEach(function(c) {
          screen.putAt(2, c, '|');
        });
        cols.forEach(function(c, index) {
          screen.putAt(row, c, '|');
          screen.putAt(row + 1, 0, '+', '-');
          screen.putAt(row + 1, c, '+', index === (cols.length - 1) ? undefined : '-');
        });
        row += 2;
      }
    } else if (v.targets().length > 0) {
      if (options.connect)
        screen.putAt(0, 0, '|');
      v.targets().forEach(function(t) {
        var dim = preOrder(t, screen.nested(row, options.seqShift));
        row += dim.s;
        col = Math.max(col, dim.p);
      });
      col += options.seqShift;
    } else {
      if (options.connect) {
        screen.putAt(1, 0 ,'|');
        row += 1;
      }
    }

    return { s: row, p: col };
  }

  var screen = Screen.new_();
  preOrder(v, screen);
  return screen.render(1, function(lines, numRows, numCols) {
    u_.range(0, numCols).forEach(function(c) {
      u_.range(1, numRows).forEach(function(r) {
        var curr = lines[r][c];
        var prev = lines[r-1][c];
        if (prev.trim() === '|' && curr.trim().length === 0) {
          lines[r][c] = ('|' + curr.substring(1));
        }
      });
    });
  });
}

exports.treeFromDsl = treeFromDsl;
exports.show = show;

