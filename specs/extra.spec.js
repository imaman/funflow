var intoDiagram = require('../lib/extra').intoDiagram;

describe('ASCII diagram', function() {
  it('is a single column when the flow is sequential', function() {
    var f = ['a', 'b', 'c'];
    expect(intoDiagram(f)).toEqual(['a', 'b' ,'c']);
  });
  it('is has an array in each row at which two cocurrent flows exists', function() {
    var f = ['a', {b1: 'B1', b2: 'B2'}, 'c'];
    expect(intoDiagram(f)).toEqual(['a', ['b1', 'b2'] ,'c']);
  });
  xit('computes printing order', function() {
    //expect(order(['a'])).toEqual(['a']);
    //expect(order(['a,b,c,d'])).toEqual(['a,b,c,d']);
    expect(order(['a', {b1: 'B1', b2: 'B2' }, 'c'])).
        toEqual(['a'], ['+', 'B1', 'B2'], ['c']);
  });
});

