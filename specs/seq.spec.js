var Seq = require('../lib/seq');

describe('Seq', function() {
  it('takes a single function argument', function() {
    new Seq([]);
  });
  it('refuses to take a non-array argument', function() {
    expect(function() { new Seq({}) }).toThrow();
  });
  it('translates the function', function() {
  });
});
