'use strict';

import RecorderService from '../src/RecorderService.js'

let wavesurfer, recorderService;
let recording = false;

// Init & load
document.addEventListener('DOMContentLoaded', function() {
    let micBtn = document.querySelector('#micBtn');
    let micPauseBtn = document.querySelector('#micPauseBtn');

    // Init wavesurfer
    wavesurfer = WaveSurfer.create({
        width: 360,
        height: 200,
        container: "#waveform",
        backgroundColor: "#c3c3ff",
        opacity: 0.8,
        waveColor: "black",
        progressColor: "grey",
        cursorColor: "#FF6060",
        cursorWidth: 1,
        barRadius: 0,
        barWidth: 2,
        barHeight: 1,
        barGap: 1,
        barMinHeight: 0,
        mediaControls: false,
        fillParent: true
    });
    wavesurfer.stop();

    wavesurfer.on('error', function(e) {
        console.warn(e);
    });

    wavesurfer.on('seek', function(where) {
        wavesurfer.play();
    });

    recorderService = RecorderService.createPreConfigured({
        debug: true,
        micGain: 2.0,
    });

    recorderService.addBufferEventListener(async (event) => {
        let audioBuffer = event.detail.audioBuffer;

        wavesurfer.loadDecodedBuffer(audioBuffer);
    });

    recorderService.addRecordedEventListener(async (event) => {
        document.querySelector('#blobUrl').innerHTML = event.detail.recorded.blobUrl;

        wavesurfer.on('ready', function () {
            wavesurfer.play();
        });
        wavesurfer.load(event.detail.recorded.blobUrl);
    });

    micBtn.onclick = function() {
        if (!recording) {
            wavesurfer.un('ready');
            recorderService.record();
            recording = true;
        } else {
            recorderService.stop();
            recording = false;
        }
    };

    micPauseBtn.onclick = function() {
        if (recorderService.state === "recording") {
            recorderService.pause();
        } else if (recorderService.state === "paused") {
            recorderService.resume();
        }
    };    
});
