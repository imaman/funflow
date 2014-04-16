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
      expect(screen.render().split('\n')).toEqual([
        'A B',
        'C D'
      ]);
    });
    it('allows custom spacing', function() {
      var screen = Screen.new_();
      screen.putAt(0, 0, 'A');
      screen.putAt(0, 1, 'B');
      screen.putAt(1, 0, 'C');
      screen.putAt(1, 1, 'D');
      expect(screen.render(1).split('\n')).toEqual([
        'AB',
        'CD'
      ]);
    });
    it('handles holes', function() {
      var screen = Screen.new_();
      screen.putAt(0, 2, 'A');
      screen.putAt(2, 1, 'B');
      expect(screen.render(1).split('\n')).toEqual([
        '  A',
        '',
        ' B'
      ]);
    });
  });
});
