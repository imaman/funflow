var Screen = require('../lib/screen').Screen;


describe('screen', function() {
  it('is initially empty', function() {
    var screen = Screen.new_();
    expect(screen.render()).toEqual('');
  });
  describe('rendering', function() {
    it('is based on row,col coordinates', function() {
      var screen = Screen.new_();
      screen.putAt(0, 0, 'A');
      screen.putAt(0, 1, 'B');
      screen.putAt(1, 0, 'C');
      screen.putAt(1, 1, 'D');
      expect(screen.render(0).split('\n')).toEqual([
        'AB',
        'CD'
      ]);
    });
    it('allows custom spacing', function() {
      var screen = Screen.new_();
      screen.putAt(0, 0, 'A');
      screen.putAt(0, 1, 'B');
      screen.putAt(1, 0, 'C');
      screen.putAt(1, 1, 'D');
      expect(screen.render(1).split('\n')).toEqual([
        'A B',
        'C D'
      ]);
    });
    it('handles holes', function() {
      var screen = Screen.new_();
      screen.putAt(0, 2, 'A');
      screen.putAt(2, 1, 'B');
      expect(screen.render(0).split('\n')).toEqual([
        '  A',
        '',
        ' B'
      ]);
    });
  });
  describe('column alignment', function() {
    it('chooses a width for each column based on widest string there in', function() {
      var screen = Screen.new_();
      screen.putAt(0, 1, 'AB');
      screen.putAt(0, 2, 'CDEFGH');
      screen.putAt(1, 1, 'M');
      screen.putAt(1, 2, 'N');
      screen.putAt(2, 0, 'VWXY');
      screen.putAt(2, 3, 'Z');
      expect(screen.render(1).split('\n')).toEqual([
        '     AB CDEFGH',
        '     M  N',
        'VWXY           Z',
      ]);
    });
    it('allows a cell to specify custom filler value', function() {
      var screen = Screen.new_();
      screen.putAt(0, 1, 'AB');
      screen.putAt(0, 2, 'CDEFGH');
      screen.putAt(1, 0, 'L', '.');
      screen.putAt(1, 1, 'M');
      screen.putAt(1, 2, 'N', '-');
      screen.putAt(2, 0, 'VWXY');
      screen.putAt(2, 3, 'Z');
      expect('\n' + screen.render(1)).toEqual(['',
        '     AB CDEFGH',
        'L....M  N------',
        'VWXY           Z',
      ].join('\n'));
    });
    it('takes only the most recent entry', function() {
      var screen = Screen.new_();
      screen.putAt(0, 0, 'string_to_be_overwritten');
      screen.putAt(0, 0, 'a');
      screen.putAt(0, 1, 'b');
      expect(screen.render(1)).toEqual('a b');
    });
  });
  describe('sub screening', function() {
    it('allows nested screen to be created with relative offsets', function() {
      var screen = Screen.new_();
      screen.putAt(0, 2, 'A');
      var sub = screen.nested(1, 3);
      sub.putAt(0, 0, 'B');
      sub.putAt(1, 2, 'C');
      screen.putAt(1, 1, 'D');

      expect(screen.render(0).split('\n')).toEqual([
        '  A',
        ' D B',
        '     C'
      ]);
    });
    it('uses relative offsets when creating deeply nested screens', function() {
      var screen = Screen.new_();
      var fromOneThree = screen.nested(1, 3);
      var fromThreeFour = fromOneThree.nested(2, 1);
      fromThreeFour.putAt(0, 0, 'A');
      fromThreeFour.putAt(0, 1, 'B');
      fromThreeFour.putAt(1, 0, 'C');

      expect(screen.render(0).split('\n')).toEqual([
        '',
        '',
        '',
        '    AB',
        '    C'
      ]);
    });
  });
});
