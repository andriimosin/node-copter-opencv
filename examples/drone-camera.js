var arDrone = require('ar-drone');
var http    = require('http');
var cv = require('../lib/opencv');

console.log('Connecting png stream ...');

var pngStream = arDrone.createClient().getPngStream();

var server = http.createServer(function(req, res) {
  // if (!lastPng) {
  //   res.writeHead(503);
  //   res.end('Did not receive any png data yet.');
  //   return;
  // }

  // res.writeHead(200, {'Content-Type': 'image/png'});
  res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' });

  // if (!detectedImg) {
  
  // res.end(lastPng);
  // } else {
    // res.end(detected);
  // }



  var lastPng;
  pngStream
    .on('error', console.log)
    .on('data', function(pngBuffer) {
      lastPng = pngBuffer;

      cv.readImage(lastPng, function(err, im){
        if (err) throw err;
        if (im.width() < 1 || im.height() < 1) throw new Error('Image has no size');

        var detectedImg = false;

        im.detectObject("../data/haarcascade_frontalface_alt.xml", {}, function(err, faces){
          if (err) throw err;

          for (var i = 0; i < faces.length; i++){
            detectedImg = true;

            var face = faces[i];
            im.ellipse(face.x + face.width / 2, face.y + face.height / 2, face.width / 2, face.height / 2);
            im.save('./tmp/face-detection' + new Date().getTime() / 1000 + '.png');
            console.log('Image saved to ./tmp/face-detection.png');

            sendPng(lastPng);
          }
        });
      });


  });

  function sendPng(buffer) {
    console.log('buffer.length');
    console.log(buffer.length);
    res.write('--daboundary\nContent-Type: image/png\nContent-length: ' + buffer.length + '\n\n');
    res.write(buffer);
  }


});


server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});


