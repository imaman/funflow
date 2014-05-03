var u_ = require('underscore');
var Top = require('./top').Top;
var Execution = require('./execution').Execution;
var show = require('./visualization').show;

var Flow = Top.extend({
  asFunction: function() {
    var self = this;
    return function(e) {
      var args = u_.toArray(arguments);
      var next = args.pop();
      if (e) return next(e);
      var execution = Execution.new_(next, self.node, self.v0);
      execution.put(self.v0, 'output', args);
      execution.continueFrom(self.v0);
      return execution;
    };
  },
  run: function() {
    return this.asFunction().apply(null, arguments);
  },
  toString: function() {
    return '\n' + show(this.node, {connect: true, downArrows: true, forkArrows: true});
  }
}, function(defs, node, v0) {
  return { node: node, v0: v0 }
});

exports.Flow = Flow;

