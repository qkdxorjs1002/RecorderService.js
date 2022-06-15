'use strict';

import RecorderService from "./RecorderService.js/RecorderService.js";

let wavesurfer, recorderService, pre;
let recording = false;

// Init & load
document.addEventListener('DOMContentLoaded', function() {
    let micBtn = document.querySelector('#micBtn');

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

    recorderService = RecorderService.createPreConfigured({
        bufferSize: 4096,
        makeBlob: true,
    });

    recorderService.em.addEventListener("onaudioprocess", (event) => {
        let buffer = event.detail.buffer;

        const now = new Date().getTime();
        console.log("ProcessingTime", now - pre, buffer);
        pre = now;

        wavesurfer.loadDecodedBuffer(buffer);
    });

    recorderService.em.addEventListener("recorded", (event) => {
        document.querySelector('#blobUrl').innerHTML = event.detail.recorded.blobUrl;
        wavesurfer.load(event.detail.recorded.blobUrl);
        wavesurfer.playPause();
    });

    micBtn.onclick = function() {
        if (!recording) {
            recorderService.record();
            recording = true;
        } else {
            recorderService.stop();
            recording = false;
        }
    };
});
