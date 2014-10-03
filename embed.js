document.write('\
  <script src="http://cdnjs.cloudflare.com/ajax/libs/jquery/1.6.4/jquery.min.js" type="text/javascript"></script>\
  <script src="http://cdnjs.cloudflare.com/ajax/libs/datejs/1.0/date.min.js" type="text/javascript"></script>\
  <script src="http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.4.4/underscore-min.js" type="text/javascript"></script>\
  <script src="http://cdnjs.cloudflare.com/ajax/libs/underscore.string/2.3.0/underscore.string.min.js" type="text/javascript"></script>\
  <script src="http://cdnjs.cloudflare.com/ajax/libs/backbone.js/0.5.3/backbone-min.js" type="text/javascript"></script>\
');

findBasePath = function(fullPath) {
  var pathComponents = fullPath.split('/');
  // remove the last path component
  pathComponents.pop();
  var basePath = pathComponents.join('/');

  return basePath;
}

var videoPlayerBasePath = findBasePath(document.getElementById('video-player-embed').src);
var courseBasePath = findBasePath(window.location.pathname);

// 
// Embed Scripts
//

var requiredScripts = [
  videoPlayerBasePath + '/dependencies/jquery.popupWindow.js',
  videoPlayerBasePath + '/dependencies/jwplayer/jwplayer.js',
  videoPlayerBasePath + '/dependencies/flash_detect_min.js',
  videoPlayerBasePath + '/vendor/jquery-ui/js/jquery-ui-1.8.16.custom.min.js',
  videoPlayerBasePath + '/utils.js',
  videoPlayerBasePath + '/debug.js',
  videoPlayerBasePath + '/settings.js',
  courseBasePath + '/data/course.js',
  videoPlayerBasePath + '/video.js',
  videoPlayerBasePath + '/tableOfContents.js',
  videoPlayerBasePath + '/views.js',
  videoPlayerBasePath + '/initTableOfContents.js'
];

// store the url to the course data in settings
CGAVideoPlayer = {
  settings: {
    courseDataUrl: courseBasePath + '/data/course.js',
    playerUrl: videoPlayerBasePath + '/player.html'
  }
}

// create script elements for all the required scripts using the video player base path
for(var i = 0; i < requiredScripts.length; i++) {
  document.write('<script type="text/javascript" src="' + requiredScripts[i] + '"></script>');
}
