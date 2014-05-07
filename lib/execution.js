var show = require('./visualization').show;
var u_ = require('underscore');
var Top = require('./top').Top;

var Output = Top.extend({
  asArray: function(arity) {
    if (arguments.length === 0)
      return this.arr_;
    var result = this.arr_.slice(1);
    if (arity === 1)
      result = result[0];
    return result;
  },
  error: function() { return this.arr_[0]; },
  translateError: function(execution) {
    var err = this.arr_[0];
    if (err && !err.flowTrace) {
      var newErr = new Error(err.message || err.toString());
      newErr.casue = err;
      newErr.flowTrace = execution.toString();
      this.arr_[0] = newErr;
    }
  },
  toString: function() {
    var temp = this.arr_.slice(0);
    if (temp[0]) {
      temp[0] = temp[0].toString();
    }
    return JSON.stringify(temp);
  }
}, function(defs, arr) {
  if (arr.length === 0)
    arr = [null];
  return { arr_: arr }
});

var Step = Top.extend({
  markCompleted: function() { this.completed = true; },
  isEndOfFlow: function() {
    return this.vertex && this.vertex.outgoing().length === 0
  },
  storeAt: function(object, slot) {
    object[slot] = this.output.asArray(this.vertex && this.vertex.outArity);
    return this.output.error();
  },
  computeDispatching: function(toStep, execution, next) {
    var outgoingArgs = [].concat(this.output.asArray());
    var nextWithStep = next.bind(null, toStep);
    outgoingArgs.push(nextWithStep);
    outgoingArgs.push(execution);
    return { args: outgoingArgs, next: nextWithStep, execution: execution, to: toStep };
  }
}, function(defs, v, output, nexts) {
  return { vertex: v, output: output || null, nexts: nexts || v.targets(),
    completed: false }
});

var Execution = Top.extend({
  run: function(e) {
    if (++this.runCount_ > 1) {
      throw new Error('An Execution can only run once.');
    }
    var args = u_.toArray(arguments);
    var next = args.pop();
    if (e) return next(e);
    this.inputs_ = args;
    this.callback = next;
    var self = this;
    return this.continueFrom(Step.new_(null, Output.new_(self.inputs_), [self.realV0_]));
  },
  ids: function() {
    return Object.keys(this.buf_).map(
      function(x) { return Number(x) });
  },
  outputOf: function(id) {
    return this.buf_[id].output.asArray();
  },
  stepFromVertex: function(v) {
    var self = this;
    var res = self.buf_[v.key];
    if (res)
      return res;
    res = Step.new_(v);
    self.buf_[v.key] = res;
    return res;
  },
  continueFrom: function(step) {
    var self = this;
    if (this.isDone_)
      return;
    this.stepsToProcess_.push(step);
    pump();

    function next(step) {
      var output = Output.new_(u_.toArray(arguments).slice(1));
      // We first need to store output in execution: when translateError() is
      // called, we get the textual representaition of execution and we want it
      // to include output.
      step.output = output;
      if (self.options_.translateErrors) {
        output.translateError(self);
      }
      self.continueFrom(step);
    }

    function pump() {
      if (self.pumpOn_)
        return;

      self.pumpOn_ = true;
      try {
        while (self.stepsToProcess_.length > 0) {
          var step = self.stepsToProcess_.pop();
          step.markCompleted();
          processCompleted(step);
        }
      } finally {
        self.pumpOn_ = false;
      }
    }

    function finalize(step) {
      self.isDone_ = true;
      return self.callback.apply(null, step.output.asArray());
    }

    function dispatch(fromStep, toStep) {
      var dispatching = fromStep.computeDispatching(toStep, self, next);
      try {
        toStep.vertex.payloadWithExecution.apply(null, dispatching);
      } catch (err) {
        dispatching.next(err);
      }
    }

    function processCompleted(step) {
      if (step.isEndOfFlow())
        return finalize(step);

      step.nexts.forEach(function(t) {
        dispatch(step, self.stepFromVertex(t));
      });
    }
  },
  toString: function() {
    var lines = '\n' + show(this.root_, {connect: true, downArrows: true, forkArrows: true});
    lines = lines.split('\n');
    if (this.buf_.length > 0) {
      lines.push('Outputs:');
      lines = lines.concat(this.buf_.map(function(curr, index) {
        return '  - ' + index + ' => ' + curr.output;
      }));
    }
    return lines.join('\n');
  }
}, function(defs, callback, root, inputs, realV0, options) {
  return { buf_: [], callback: callback, root_: root, stepsToProcess_: [],
    pumpOn_: false, isDone_: false, inputs_: inputs, realV0_: realV0,
    runCount_: 0, options_: options || {} }
});

function createPayloadWithExecution(v, isMerge) {
  if (isMerge)
    return payloadWithExecution.bind(null, v);
  return function(v, dispatching) {
    v.payload.apply(null, dispatching.args);
  }
}

function payloadWithExecution(v, dispatching) {
  var args = dispatching.args;
  var execution = args.pop();

  if (execution.stepFromVertex(v).completed) {
    return;
  }
  var next = args.pop();

  var inputs = {};
  var err;

  var slottedSteps = v.incoming().map(function(edge) {
    return { slot: edge.slot, step: execution.stepFromVertex(edge.from) }
  });
  var completed = slottedSteps.filter(function(current) {
    return current.step.completed;
  });
  completed.forEach(function(current) {
    // TODO: move on as soon as an err is produced by any of the branches.
    // currently errors are detected only after all inputs are ready.
    err = err || current.step.storeAt(inputs, current.slot);
  });
  if (err) return next(err);
  v.merge(inputs, next);
}


exports.Execution = Execution;
exports.createPayloadWithExecution = createPayloadWithExecution;
