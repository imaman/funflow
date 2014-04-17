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
      expect(screen.render(0, '.').split('\n')).toEqual([
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
  });
});
