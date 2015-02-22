var arDrone = require('ar-drone');
var http    = require('http');
var cv      = require('../lib/opencv');

console.log('Connecting png stream ...');

var arDrone  = require("ar-drone"),
    client   = arDrone.createClient(),
    angle    = 64,
    speed    = 0.6;


client.config('control:altitude_max', 1000);
client.config('control:control_vz_max', 1000);
client.config('control:control_yaw', 4.0);
client.config('control:euler_angle_max', 0.3);

client.config('control:outdoor', true);
client.config('control:flight_without_shell', true);

// client.takeoff()
// client.calibrate(0);
// client.front(0);

client
  .after(100000, function() {
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

        console.log('contours.size')
        console.log(contours.size())

        if (contours.size() > 1) {
          console.log('FLYING FRONT')

          // old implementation
          //
          // for(i = 0; i < contours.size(); i++) {
          //   var moments = contours.moments(i);
          //   var cgx = Math.round(moments.m10 / moments.m00);
          //   console.log(contours.moments(i));

          //   var left =  100 //im.width()/3 + im.width()/20
          //   var center = 550 //(im.width() - left) + (im.width()/20)
          //   var right =  640 //im.width()

          //   console.log(cgx)
          //   console.log(right)

          //   // if (isNaN(cgx)) {
          //     if ((left < cgx) && (cgx < center)) {
          //       console.log('center')
          //       client.front(0.2);

          //       client.after(50, function() {
          //         this.front(-1);
          //         this.stop();
          //       });

          //     } else if (cgx > center) {
          //       console.log('right')
          //       client.clockwise(0.3);

          //       client.after(50, function() {
          //         this.stop();
          //       });
          //     } else if (cgx < left) {
          //       console.log('left')
          //       client.counterClockwise(0.3);
          //       client.after(50, function() {
          //         this.stop();
          //       });
          //     }
          //    //else {
          //   //   console.log('NAN center')
          //   //   client.front(0.2);
          //   //   client.after(500, function() {
          //   //     this.stop();
          //   //   });
          //   // }
          // }

          for(i = 0; i < contours.size(); i++) {
            var moments = contours.moments(i);
            var cgx = Math.round(moments.m10 / moments.m00);

            var middleLine = im.width()/2;
            var range      = (im.width*25)/100;
            var leftRange  = middleLine - range;
            var rightRange = middleLine + range;

            console.log('cgx: ' + cgx + ', right border: ' + rightRange);

            // turn left
            if (cgx < leftRange) {
              console.log('<<< Turn left')
              client.counterClockwise(0.3);
              client.after(50, function() {
                this.stop();
              });
            // go forward
            } else if ((leftRange < cgx) && (cgx < rightRange)) {
              console.log('^^^ Go forward')
              client.front(0.2);

              client.after(50, function() {
                this.front(-1);
                this.stop();
              });
            // turn right
            } else if (rightRange < cgx) {
              console.log('>>> Turn right')
              client.clockwise(0.3);

              client.after(50, function() {
                this.stop();
              });
            }
          }

        } else if (contours.size() === 0) {
          client.front(-1);
          client.stop()
          console.log('FLYING STOP!!!!!')
        }

        sendPng(im.toBuffer());
      });
  });

  function sendPng(buffer) {
    // console.log('Buffer length: ' + buffer.length);
    res.write('--daboundary\nContent-Type: image/png\nContent-length: ' + buffer.length + '\n\n');
    res.write(buffer);
  }
});

server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});
