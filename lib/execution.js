var show = require('./visualization').show;
var u_ = require('underscore');
var Top = require('./top').Top;
var util = require('util');

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
    if (!err || err.flowTrace)
      return;
    var newErr = new Error(err.message || err.toString());
    newErr.casue = err;
    newErr.flowTrace = execution.toString();
    newErr.execution = execution;
    this.arr_[0] = newErr;
  },
  toString: function() {
    var temp = this.arr_.slice(0);
    if (temp[0]) {
      temp[0] = temp[0].toString();
    }
    try {
      return JSON.stringify(temp);
    } catch (e) {
      return util.inspect(temp)
    }
  }
}, function(defs, arr) {
  if (arr.length === 0)
    arr = [null];
  return { arr_: arr }
});

var Step = Top.extend({
  markCompleted: function() { this.completed = true },
  isEndOfFlow: function() {
    return this.vertex && this.vertex.outgoing().length === 0
  },
  storeAt: function(object, slot) {
    object[slot] = this.output.asArray(this.vertex && this.vertex.outArity);
    return this.output.error();
  },
  propagate: function(execution, next) {
    var self = this;
    this.subsequentSteps_.forEach(function(t) {
      self.run_(execution.stepFromVertex(t), execution, next);
    });
  },
  run_: function(toStep, execution, next) {
    var dispatching = this.computeDispatching_(toStep, execution, next);
    try {
      toStep.vertex.dispatchable.apply(null, [dispatching]);
    } catch (err) {
      dispatching.next(err);
    }
  },
  computeDispatching_: function(toStep, execution, next) {
    var arity = toStep.vertex.inArity;
    var dataToSend = this.output.asArray();
    var boundedNext = next.bind(null, toStep);

    if (arity === undefined)
      arity = dataToSend.length + 1;

    var outgoingArgs = u_.range(arity).map(function(index) {
      if (index === arity - 1) return boundedNext;
      else if (index >= dataToSend.length) return undefined;
      else return dataToSend[index];
    });

    return { args: outgoingArgs, next: boundedNext, execution: execution, toStep: toStep };
  },
  toString: function() { return this.vertex + ' produced ' + this.output }
}, function(defs, v, output, subsequentSteps) {
  return { vertex: v, output: output || null, subsequentSteps_: subsequentSteps || v.targets(),
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
  outputOf: function(name) {
    var steps = this.buf_.filter(function(curr) {
      return curr.vertex.dsl && (curr.vertex.dsl.name() === name);
    });
    if (steps.length === 1) return steps[0].output.asArray();
    throw new Error('Cannot provide the output of vertex "' + name + '" because there are ' + steps.length + ' vertices with that name');
  },
  stepFromVertex: function(v) { return this.buf_[v.key]; },
  continueFrom: function(step) {
    var self = this;
    if (this.isDone_)
      return;
    this.stepsToProcess_.push(step);
    pump();

    function next(step) {
      var output = Output.new_(u_.toArray(arguments).slice(1));
      // We first need to store output in execution: when/if: translateError()
      // translates an error, it captures the textual representaition of the execution. We want this representation to include the most recent output, so we store it inside step.
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
          if (step.isEndOfFlow())
            return finalize(step);

          step.propagate(self, next);
        }
      } finally {
        self.pumpOn_ = false;
      }
    }

    function finalize(step) {
      self.isDone_ = true;
      return self.callback.apply(null, step.output.asArray());
    }
  },
  toString: function() {
    var lines = '\n' + show(this.root_, {connect: true, downArrows: true, forkArrows: true});
    lines = lines.split('\n');
    var effectiveBuf = this.buf_.filter(function(curr) { return curr.output });
    if (effectiveBuf.length > 0) {
      lines.push('Outputs:');
      lines = lines.concat(effectiveBuf.map(function(curr, index) {
        return '  - ' + index + ' => ' + curr.output;
      }));
    }
    return lines.join('\n');
  }
}, function(defs, callback, root, inputs, realV0, orderedVertices, options) {
  return { buf_: orderedVertices.map(function(v) { return Step.new_(v) }), callback: callback, root_: root, stepsToProcess_: [],
    pumpOn_: false, isDone_: false, inputs_: inputs, realV0_: realV0,
    runCount_: 0, options_: options || {} }
});

function createDispatchable(isMerge) {
  if (isMerge)
    return mergingDispatchable;
  return function(dispatching) {
    dispatching.toStep.vertex.payload.apply(null, dispatching.args);
  }
}

function mergingDispatchable(dispatching) {
  if (dispatching.toStep.completed) {
    return;
  }

  var vertex = dispatching.toStep.vertex;
  var execution = dispatching.execution;

  var slottedSteps = vertex.incoming().map(function(edge) {
    return { slot: edge.slot, step: execution.stepFromVertex(edge.from) }
  });
  var completed = slottedSteps.filter(function(current) {
    return current.step.completed;
  });

  var inputs = {};
  var err;
  completed.forEach(function(current) {
    // TODO: move on as soon as an err is produced by any of the branches.
    // currently errors are detected only after all inputs are ready.
    err = err || current.step.storeAt(inputs, current.slot);
  });

  if (err) return dispatching.next(err);
  vertex.merge(inputs, dispatching.next);
}


exports.Execution = Execution;
exports.createDispatchable = createDispatchable;

