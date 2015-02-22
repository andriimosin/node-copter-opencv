var arDrone = require('ar-drone');
var http    = require('http');
var cv      = require('../lib/opencv');

console.log('Connecting png stream ...');

var arDrone  = require("ar-drone"),
    client   = arDrone.createClient(),
    angle    = 64,
    speed    = 0.6;

client.calibrate(0);

// client.config('control:altitude_max', 1000);
// client.config('control:control_vz_max', 1000);
// client.config('control:control_yaw', 4.0);
// client.config('control:euler_angle_max', 0.3);

client.config('control:outdoor', false);
client.config('control:flight_without_shell', false);

client.takeoff()

client
  .after(30000, function() {
    this.stop();
    this.land();
  });

var pngStream = arDrone.createClient().getPngStream();
var server = http.createServer(function(req, res) {

  res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=--daboundary' });

  var lastPng;
  pngStream
    .on('error', console.log)
    .on('data', function(pngBuffer) {
      lastPng = pngBuffer;

      var lower_threshold = [40, 0, 180];
      var upper_threshold = [135, 110, 255];

      cv.readImage(lastPng, function(err, im){
        if (err) throw err;
        if (im.width() < 1 || im.height() < 1) throw new Error('Image has no size');

        im.inRange(lower_threshold, upper_threshold);
        
        contours = im.findContours();
        console.log(contours.size());
        if (contours.size() > 1) {
          client.front(0.08);
          console.log('FLYING FRONT')
        } else {
          client.stop()
          console.log('FLYING STOP!!!!!')
        }

        sendPng(im.toBuffer());
      });
  });

  function sendPng(buffer) {
    console.log('Buffer length: ' + buffer.length);
    res.write('--daboundary\nContent-Type: image/png\nContent-length: ' + buffer.length + '\n\n');
    res.write(buffer);
  }
});

server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});
