var Top = require('../lib/top').Top;
var u_ = require('underscore');

var Screen = Top.extend({
  putAt: function(row, col, value, filler) {
    this.entries.push({
      r: this.base.r + row,
      c: this.base.c + col,
      v: value,
      filler: filler});
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
  computeMax_: function() {
    return this.entries.reduce(function(soFar, current) {
      var maxR = Math.max(soFar.r, current.r);
      var maxC = Math.max(soFar.c, current.c);
      return {r: maxR, c: maxC};
    }, {r: 0, c: 0});
  },

  computeWidths_: function(max, spacing) {
    var widths = u_.range(0, max.c + 1).map(u_.constant(1));

    this.entries.forEach(function(current) {
      var c = current.c;
      widths[c] = Math.max(widths[c], current.v.length);
    });
    widths = widths.map(function(current) {
      var width = (spacing === undefined) ? 2 : current + spacing;
      return u_.range(width).map(u_.constant(' ')).join('');
    });
    return widths;
  },

  padRight_: function(s, c, filler, spacing, widths) {
    if (filler !== undefined && spacing !== undefined) {
      return s + u_.range(widths[c].length - s.length).map(u_.constant(filler)).join('');
    }
    if (spacing === undefined)
      return s + widths[c];
    return s + widths[c].substring(s.length);
  },

  findEntry_: function(r, c) {
    var es = this.entries.filter(function(current) { return current.r === r && current.c === c });
    if (es.length > 1) {
      es[0] = es[es.length - 1];
    }
    return es;
  },


  render: function(spacing) {
    var max = this.computeMax_();
    var widths = this.computeWidths_(max, spacing);

    var lines = [];
    u_.range(0, max.r + 1).forEach(function(r) {
      var line = u_.range(0, max.c + 1).map(function(c) {
        var es = this.findEntry_(r, c);

        var s = ' ';
        var filler = undefined;
        if (es.length >= 1) {
          s = es[0].v.toString();
          filler = es[0].filler;
        }

        return this.padRight_(s, c, filler, spacing, widths);
      }, this);
      lines.push(line.join('').replace(/[ ]+$/, ''));
    }, this);
    return lines.join('\n');
  }
},
function() {
  return { entries: [], base: {c: 0, r: 0} }
});

exports.Screen = Screen;

