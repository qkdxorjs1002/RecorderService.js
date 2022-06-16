# RecorderService.js

WebAudioAPI Audio Recorder Service

| RecorderService                                 | AudioWorkletProcessor                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| ![RecorderService](.github/recorderservice.png) | ![AudioWorketProcessor](.github/audioworkletprocessor.png) |

## Tutorial

```javascript
// Initialize Pre-configured RecorderService
var recorderSrvc = RecorderService.createPreConfigured();

// Add event listener to get audio buffer data
// event.detail.buffer -> AudioBuffer
recorderSrvc.em.addEventListener("onaudioprocess", (event) =>
    wavesurfer.loadDecodedBuffer(event.detail.buffer));

// Add event listener for recorded data
recorderSrvc.em.addEventListener("recorded", (event) => {
    // event.detail.recorded.blob -> Blob
    // event.detail.recorded.blobUrl -> String
    wavesurfer.load(event.detail.recorded.blobUrl);
});

// Start recording
recorderSrvc.record()
    .then(() => {
        // after start recording
    })
    .catch(() => {
        // catch exception
    });

// Stop recording
recorderSrvc.stop();
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
