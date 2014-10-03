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
  videoPlayerBasePath + '/dependencies.js',
  courseBasePath + '/data/course.js',
  videoPlayerBasePath + '/toc.js'
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
