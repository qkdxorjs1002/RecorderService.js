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
});
