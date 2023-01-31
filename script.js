const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const thingsFoundView = document.getElementById("thingsFoundView");

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia);
  }
  
  // If webcam supported, add event listener to button for when user
  // wants to activate it to call enableCam function which we will 
  // define in the next step.
  if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
  } else {
    console.warn('getUserMedia() is not supported by your browser');
  }
  
  // Placeholder function for next step. Paste over this in the next step.
  function enableCam(event) {
  }
// Enable the live webcam view and start classification.
function enableCam(event) {
    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
      return;
    }
    
    // Hide the button once clicked.
    event.target.classList.add('removed');  
    
    // getUsermedia parameters to force video but not audio.
    const constraints = {
      video: true
    };
  
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      video.srcObject = stream;
      video.addEventListener('loadeddata', predictWebcam);
    });
  }


// Store the resulting model in the global scope of our app.
var model = undefined;

// Before we can use COCO-SSD class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment 
// to get everything needed to run.
// Note: cocoSsd is an external object loaded from our index.html
// script tag import so ignore any warning in Glitch.
cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  // Show demo section now model is ready to use.
  demosSection.classList.remove('invisible');
});

/*blazeface.load().then(function(m) {
    model = m;
    demosSection.classList.remove('invisible');
});
*/


var persons = [];
const dampen = 25;

function predictWebcam() {
    let videoW = video.getAttribute("width");
    let videoH = video.getAttribute("height");

    let canvasW = 200;
    let canvasH = 200;

  model.detect(video).then(function (predictions) {

    let preds = predictions
        .filter(p => p.score > 0.66)
        .filter(p => p.class == "person")
        .map(pred => {
            let [left, top, width, height ] = pred.bbox;
            left *= 0.9;
            top *= 0.9;
            let z = canvasW/width;
            let zw = videoW*z;
            let zh = videoH*z;
            let cx = -(left + width/2)*z + canvasW/2;
            //let cy = -(top + height/2)*z + canvasH/2;
            let cy = -top*z;
            return [zw, zh, cx, cy];
        });
  /*
  model.estimateFaces(video, false).then(function(predictions) {
    let preds = predictions
        .filter(p => p.probability[0] > 0.66)
        .map(pred => {
            let { topLeft, bottomRight } = pred;
            let [ left, top ] = topLeft;
            let [ right, bottom ] = bottomRight;
            let width = right-left;
            let height = bottom-top;
            let wm = height*0.3;
            left -= wm;
            top -= wm*2;
            width += wm*2;
            height += wm*2;
            let z = canvasW/width;
            let zw = videoW*z;
            let zh = videoH*z;
            let cx = -(left + width/2)*z + canvasW/2;
            //let cy = -(top + height/2)*z + canvasH/2;
            let cy = -top*z;
            return [zw, zh, cx, cy];
        });*/


    persons.forEach(p => p.ticks--);
    persons.filter(p => p.ticks < 1).forEach(p => {
        try {
            thingsFoundView.removeChild(p.canvas);
        } catch(e) {

        }
    });
    persons = persons.filter(p => p.ticks >= 1);

    for (let i = persons.length; i < preds.length; i++) {
        let canvas = document.createElement("canvas");
        canvas.setAttribute("width", canvasW);
        canvas.setAttribute("height", canvasH);
        persons.push({canvas, d: [Infinity, Infinity, Infinity, Infinity], ticks: 100 });
        thingsFoundView.appendChild(canvas);
    }

    let pickList = persons.slice(0);
    for (let p of preds) {
        let choice = pickList[0];
        let min = Infinity;
        for (let per of pickList) {
            let dist = Math.pow(per.d[2] - p[2], 2) + Math.pow(per.d[3] - p[3], 2);
            if (dist < min) {
                choice = per;
                min = dist;
            }
        }
        pickList = pickList.filter(a => a != choice);
        choice.ticks++;
        if (choice.d[0] == Infinity) choice.d = [...p];
        for(let i = 0; i < 4; i++) {
            choice.d[i] = choice.d[i] + (p[i] - choice.d[i])/dampen;
        }
    }


    for (let p of persons) {
        let context = p.canvas.getContext('2d');
        let [zw, zh, cx, cy] = p.d;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, p.canvas.width, p.canvas.height);
        context.drawImage(video, cx, cy, zw, zh);
    }



/*
    for (let [i, pred] of preds.entries()) {

        let [left, top, width, height ] = pred.bbox;

        left *= 0.9;
        top *= 0.9;

        if (!thingsFound[i]) {
            thingsFound[i] = document.createElement("canvas");    
            thingsFoundView.appendChild(thingsFound[i])
        }
        let img = thingsFound[i];
        let rx = 200/width;
        let ry = 200/height;
        let r = Math.max(rx, ry);
        let zw = videoW*r;
        let zh = videoH*r;
        let cx = -(left + width/2)*r + 100;
        let cy = -(top + height/2)*r + 100;

        let oldZW = img.datazw || zw;
        let oldZH = img.datazh || zh;
        let oldCX = img.datazcx || cx;
        let oldCY = img.datazcy || cy;

        let damp = 25;
        img.datazcx = oldCX + (-oldCX+cx)/damp;
        img.datazcy = oldCY + (-oldCY+cy)/damp;
        img.datazw = oldZW + (-oldZW+zw)/damp;
        img.datazh = oldZH + (-oldZH+zh)/damp;

        let context = img.getContext('2d');
        context.drawImage(video, img.datazcx, img.datazcy, img.datazw, img.datazh);

    }*/
    
    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
  });
}