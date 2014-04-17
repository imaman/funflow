var Top = require('../lib/top').Top;
var u_ = require('underscore');

var Screen = Top.extend({
  putAt: function(row, col, value) {
    this.entries.push({
      r: this.base.r + row,
      c: this.base.c + col,
      v: value});
  },
  nested: function(offsetRow, offsetCol) {
    var result = this.new_();
    result.entries = this.entries;
    result.base = {
      r: offsetRow + this.base.r,
      c: offsetCol + this.base.c
    };
    return result;
  },
  render: function(spacing) {
    var max = this.entries.reduce(function(soFar, current) {
      var maxR = Math.max(soFar.r, current.r);
      var maxC = Math.max(soFar.c, current.c);
      return {r: maxR, c: maxC};
    }, {r: 0, c: 0});

    var widths = u_.range(0, max.c + 1).map(u_.constant(1));

    this.entries.forEach(function(current) {
      var c = current.c;
      widths[c] = Math.max(widths[c], current.v.length);
    });
    widths = widths.map(function(current) {
      var width = (spacing === undefined) ? 2 : current + spacing;
      return u_.range(width).map(u_.constant(' ')).join('');
    });

    function padRight(s, c) {
      if (spacing === undefined)
        return s + widths[c];
      return s + widths[c].substring(s.length);
    }

    var r;
    var c;

    var lines = [];
    for (r = 0; r <= max.r; ++r) {
      var line = [];
      for (c = 0; c <= max.c; ++c) {
        var es = this.entries.filter(function(current) { return current.r === r && current.c === c });
        if (es.length > 1) {
          es[0] = es[es.length - 1];
        }

        var s = ' ';
        if (es.length === 1) {
          s = es[0].v.toString();
        }

        line.push(padRight(s, c));
      }
      lines.push(line.join('').replace(/[ ]+$/, ''));
    }
    return lines.join('\n');
  }
},
function() {
  return { entries: [], base: {c: 0, r: 0} }
});

exports.Screen = Screen;

