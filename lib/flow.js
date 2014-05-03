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
      var execution = Execution.new_(next, self.root_, args, self.realV0_);
      execution.continueFrom(null);
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
  var realV0 = v0.targets()[0];
  if (realV0 === undefined)
    throw new Error();
  return { root_: root, v0_: v0, realV0_: realV0 };
});

exports.Flow = Flow;

