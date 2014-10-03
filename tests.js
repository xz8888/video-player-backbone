QUnit.log = function(result, message) {
  console.log(result + ' -- ' + message);
}

var models = CGAVideoPlayer.models;
var views = CGAVideoPlayer.views;

$(document).ready(function() {
  module("Views")
  test("ButtonView", function() {
    var textButton = new views.ButtonView({text: 'Sample Text'});
    equal(textButton.el.tagName.toLowerCase(), 'button');
    equal($(textButton.el).find('span').html(), 'Sample Text');
    ok($(textButton.el).hasClass('ui-button'));

    var iconButton = new views.ButtonView({icon: 'ui-icon-play'});
    equal(iconButton.el.tagName.toLowerCase(), 'button');
    ok($(iconButton.el).find('span').hasClass('ui-icon-play'));
  });
});
