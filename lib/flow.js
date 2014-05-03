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
      var execution = Execution.new_(next, self.root_, self.v0_, args).go();
      execution.put(self.v0_, 'output', execution.inputs_);
      execution.continueFrom(self.v0_);
      return execution;
    };
  },
  run: function() {
    return this.asFunction().apply(null, arguments);
  },
  toString: function() {
    return '\n' + show(this.root_, {connect: true, downArrows: true, forkArrows: true});
  }
}, function(defs, root, v0) {
  return { root_: root, v0_: v0 }
});

exports.Flow = Flow;

