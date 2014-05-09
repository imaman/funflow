var u_ = require('underscore');
var Top = require('./top').Top;
var Execution = require('./execution').Execution;
var show = require('./visualization').show;

var Flow = Top.extend({
  newExecution: function(deprecate) {
    if (deprecate)
      throw new Error('no arg. should be passed here');
    return Execution.new_(null, this.root_, null, this.realV0_, this.options_);
  },
  asFunction: function() {
    var self = this;
    return function(e) {
      var exec = self.newExecution();
      exec.run.apply(exec, arguments);
      return exec;
    };
  },
  run: function() {
    return this.asFunction().apply(null, arguments);
  },
  toString: function() {
    return '\n' + show(this.root_, {connect: true, downArrows: true, forkArrows: true});
  }
}, function(defs, root, realV0, options) {
  return { root_: root, realV0_: realV0, options_: options };
});

exports.Flow = Flow;

