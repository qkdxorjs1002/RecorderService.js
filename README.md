# RecorderService.js

WebAudioAPI Audio Recorder Service

| RecorderService                                 | AudioWorkletProcessor                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| ![RecorderService](.github/recorderservice.png) | ![AudioWorketProcessor](.github/audioworkletprocessor.png) |

## Tutorial

```javascript
let recorderService = RecorderService.createPreConfigured({
    debug: true,
    micGain: 1.0,
});

// buffer event
recorderService.addBufferEventListener(async (event) => {
    let audioBuffer = event.detail.audioBuffer;

    wavesurfer.loadDecodedBuffer(audioBuffer);
});

// got stream event
recorderService.addGotStreamEventListener(async () => {
    console.log("'gotstream' Event is triggered...");
});

// recorded event
recorderService.addRecordedEventListener(async (event) => {
    console.log("'dataavailable' Event is triggered...");

    document.querySelector('#blobUrl').innerHTML = event.detail.recorded.blobUrl;

    wavesurfer.on('ready', function () {
        wavesurfer.play();
    });
    wavesurfer.load(event.detail.recorded.blobUrl);
});

// init 
recorderService.init().then(() => {
    console.log("RecorderService is inited...");

    micBtn.style.visibility = "visible";
    micPauseBtn.style.visibility = "visible";
});

micBtn.onclick = function() {
    if (!recording) {
        wavesurfer.un('ready');
        // record
        recorderService.record().then(() => {
            console.log("Start Recording...");
        });
        recording = true;
    } else {
        // stop
        recorderService.stop().then(() => {
            console.log("Stop Recording...");
        });
        recording = false;
    }
};

micPauseBtn.onclick = function() {
    if (recorderService.state === "recording") {
        // pause
        recorderService.pause().then(() => {
            console.log("Pause Recording...");
        });
    } else if (recorderService.state === "paused") {
        //resume
        recorderService.resume().then(() => {
            console.log("Resume Recording...");
        });
    }
};    
```

## Demo

```bash
# install node.js serve
yarn global add serve
# or
npm install -g serve
# run serve
serve --ssl-cert <SSL_CERT_PATH> --ssl-key <SSL_KEY_PATH> ./
# https://localhost:3000/demo
```

## Documentation

[Docs.md](docs.md)
