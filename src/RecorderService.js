/**
 * Recorder Service
 * WebAudioAPI
 * @author paragonnov
 * @license MIT
 */

import EncoderWav from "./encoder-wav-worker.js";

/**
 * RecorderService
 * @class
 */
export default class RecorderService {

    /**
     * @param {Object} config                                     설정
     * @param {Boolean} config.broadcastAudioProcessEvents        오디오 처리 이벤트 발생 여부
     * @param {Boolean} config.enableDynamicsCompressor           오디오 리미터 사용 여부
     * @param {Boolean} config.noAudioWorklet                     AudioWorkletNode 사용 여부
     * @param {Number} config.micGain                             마이크 입력 증폭
     * @param {Number} config.outputGain                          오디오 증폭
     * @param {Number} config.bufferSize                          오디오 버퍼 크기
     * @param {Boolean} config.stopTracksAndCloseCtxWhenFinished  녹음 종료 후 자원 해제 여부
     * @param {Boolean} config.usingMediaRecorder                 MediaRecorder 사용 여부
     * @param {Boolean} config.makeBlob                           오디오 결과 Blob 생성 여부
     * @param {String} config.latencyHint                         오디오 처리 우선 순위 (balanced | interactive | playback)
     * @param {Number} config.sampleRate                          오디오 샘플링 레이트
     * @param {Boolean} config.debugging                          콘솔 디버깅 출력 여부
     * @param {MediaTrackConstraintSet} config.audioConstraints   MediaTrackOption.audio
     */
    constructor (config) {
        // Chrome, Safari AudioContext
        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        // Dedicated DOM
        this.em = document.createDocumentFragment();

        this.state = "inactive";

        this.chunks = [];
        this.chunkType = "";

        this.encoderMimeType = "audio/wav";

        this.config = {
            sampleRate: 48000,
            channelCount: 2,
            latencyHint: "interactive",
            bufferSize: 4096,
            micGain: 1.0,
            outputGain: 1.0,
            broadcastAudioProcessEvents: false,
            enableDynamicsCompressor: false,
            noAudioWorklet: false,
            usingMediaRecorder: typeof window.MediaRecorder !== "undefined",
            makeBlob: true,
            stopTracksAndCloseCtxWhenFinished: true,
            debugging: false,
            audioConstraints: { }
        };

        if (config != undefined) {
            Object.assign(this.config, config);
        }
    }

    /**
     * 사전 정의된 설정으로 생성
     * @param {Object} config                                     설정
     * @param {Boolean} config.broadcastAudioProcessEvents        오디오 처리 이벤트 발생 여부
     * @param {Boolean} config.enableDynamicsCompressor           오디오 리미터 사용 여부
     * @param {Boolean} config.noAudioWorklet                     AudioWorkletNode 사용 여부
     * @param {Number} config.micGain                             마이크 입력 증폭
     * @param {Number} config.outputGain                          오디오 증폭
     * @param {Number} config.bufferSize                          오디오 버퍼 크기
     * @param {Boolean} config.stopTracksAndCloseCtxWhenFinished  녹음 종료 후 자원 해제 여부
     * @param {Boolean} config.usingMediaRecorder                 MediaRecorder 사용 여부
     * @param {Boolean} config.makeBlob                           오디오 결과 Blob 생성 여부
     * @param {String} config.latencyHint                         오디오 처리 우선 순위 (balanced | interactive | playback)
     * @param {Number} config.sampleRate                          오디오 샘플링 레이트
     * @param {Boolean} config.debugging                          콘솔 디버깅 출력 여부
     * @param {MediaTrackConstraintSet} config.audioConstraints   MediaTrackOption.audio
     * @returns {RecorderService} RecorderService
     */
    static createPreConfigured(config) {
        let _config = {
            sampleRate: 16000,
            channelCount: 1,
            broadcastAudioProcessEvents: true,
            enableDynamicsCompressor: true,
            usingMediaRecorder: false,
            makeBlob: true,
            debugging: true,
            audioConstraints: {
                autoGainControl: false,
                noiseSuppression: false
            }
        };
        if (config != undefined) {
            Object.assign(_config, config);
        }

        const userAgentAlias = this.getUserAgentAlias();
        console.log("RecorderService: UserAgentAlias:", userAgentAlias);

        // 기기 화이트리스트 설정
        if (userAgentAlias === "ios") {
            // Empty
        } else if (userAgentAlias === "mac") {
            Object.assign(_config, {
                audioConstraints: undefined
            });
        } else if (userAgentAlias === "android-s8") {
            Object.assign(_config, {
                micGain: 30.0,
                outputGain: 1.0,
                audioConstraints: {
                    echoCancellation: false
                }
            });
        } else if (userAgentAlias === "android-note20ultra") {
            // Empty
        } else if (userAgentAlias === "android-v500") {
            // Empty
        } else if (userAgentAlias === "other") {
            // Empty
        }

        console.log("RecorderService: Config", _config);

        return new RecorderService(_config);
    }

    /**
     * UserAgent Alias 반환
     * @returns {string} "android", "android-s8", "ios", "other"
     */
    static getUserAgentAlias() {
        const userAgent = navigator.userAgent.toLowerCase();

        if (userAgent.indexOf("android") > -1) {                // Android
            if (userAgent.indexOf("sm-g950") > -1) {            //// Galaxy S8
                return "android-s8";
            } else if (userAgent.indexOf("sm-n986") > -1) {     //// Galaxy Note20Ultra
                return "android-note20ultra";
            } else if (userAgent.indexOf("lm-v500") > -1) {     //// LG V50 ThinQ
                return "android-v500";
            }
            return "android";
        } else if (userAgent.indexOf("iphone") > -1             //// iPhone
                || userAgent.indexOf("ipad") > -1               //// iPad
                || userAgent.indexOf("ipod") > -1) {            //// iPod
            return "ios";
        }  else if (userAgent.indexOf("macintosh") > -1) {      //// Mac
            return "mac";
        } 

        return "other";
    }

    /**
     * 인코딩 Worker 생성
     * @param {*} fn Worker script
     * @returns {Worker} 인코딩 Worker
     */
    createWorker(fn) {
        let js = fn
            .toString()
            .replace(/^function\s*\(\)\s*{/, "")
            .replace(/}$/, "");
        let blob = new Blob([js]);

        return new Worker(URL.createObjectURL(blob));
    }

    /**
     * AudioContext 및 Node 초기화, 녹음 시작
     * @returns {void, Promise<MediaStream>}
     */
    async record() {
        console.log("RecorderService: Start recording");

        if (this.state !== "inactive") {
            return ;
        }

        // getUserMedia 지원 여부 검증
        if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("navigator.mediaDevices.getUserMedia error");
            return ;
        }

        // WebAudioAPI AudioContext 초기화
        this.audioCtx = new AudioContext({
            latencyHint: this.config.latencyHint,
            sampleRate: this.config.sampleRate
        });
        console.log("RecorderService: AudioContext", this.audioCtx);

        // GainNode - 오디오 증폭 Node
        this.micGainNode = this.audioCtx.createGain();
        this.outputGainNode = this.audioCtx.createGain();

        // DynamicCompressorNode - 오디오 리미터 Node
        if (this.config.enableDynamicsCompressor) {
            this.dynamicsCompressorNode = this.audioCtx.createDynamicsCompressor();
        }

        // AudioWorkletNode || ScriptProcessorNode - 오디오 버퍼 처리 Node
        if (this.config.broadcastAudioProcessEvents || !this.config.usingMediaRecorder) {
            try {
                await this.audioCtx.audioWorklet.addModule("./RecorderService.js/AudioProcessor.js").then(() => {
                    if (this.config.noAudioWorklet) {
                        throw "RecorderService: Config: noAudioWorklet: true";
                    }
    
                    this.processorNode = new AudioWorkletNode(this.audioCtx, "audio-processor", {
                        numberOfInputs: this.config.channelCount,
                        numberOfOutputs: this.config.channelCount,
                        processorOptions: {
                            bufferSize: this.config.bufferSize,
                        }
                    });
                    console.log("RecorderService: AudioWorkletNode", this.processorNode);
    
                    this.audioBuffer = this.audioCtx.createBuffer(
                        this.config.channelCount,
                        this.config.bufferSize,
                        this.audioCtx.sampleRate
                    );
                    console.log("RecorderService: AudioBuffer", this.audioBuffer);
                });
            } catch(e) {
                // AudioWorkletNode 생성 실패시, ScriptProcessorNode 시도
                console.log("RecorderService: AudioWorkletNode is not available. Use ScriptProcessorNode.", e);
                this.config.noAudioWorklet = true;
                this.processorNode = this.audioCtx.createScriptProcessor(
                    this.config.bufferSize,
                    this.config.channelCount,
                    1
                );
                console.log("RecorderService: ScriptProcessorNode", this.processorNode);
            }
        }

        // MediaStreamDestinationNode - 미디어 스트림 목적지 Node
        if (this.audioCtx.createMediaStreamDestination) {
            this.destinationNode = this.audioCtx.createMediaStreamDestination();
        } else {
            this.destinationNode = this.audioCtx.destination;
        }

        // Blob 생성하고, MediaRecorder 사용 안할 경우, 인코딩 Worker 초기화
        if (!this.config.usingMediaRecorder && this.config.makeBlob) {
            this.encoderWorker = this.createWorker(EncoderWav);
            this.encoderMimeType = "audio/wav";

            // 인코딩 Worker 이벤트 리스너 추가
            this.encoderWorker.addEventListener("message", (e) => {
                let event = new Event("dataavailable");
                event.data = new Blob(e.data, { type: this.encoderMimeType });

                this._onDataAvailable(event);
            });
        }

        // getUserMedia 제약
        const userMediaConstraints = {
            audio: Object.assign({
                sampleRate: this.config.sampleRate,
                channelCount: this.config.channelCount
            }, this.config.audioConstraints)
        };

        console.log("RecorderService: UserMediaConstraints -", userMediaConstraints);

        // 미디어 소스 ID
        if (this.config.deviceId) {
            userMediaConstraints.audio.deviceId = this.config.deviceId;
        }

        // MediaStream 요청
        return navigator.mediaDevices.getUserMedia(userMediaConstraints)
            .then((stream) => {
                console.log("RecorderService: MediaStream", stream);
                /**
                 * MediaStream 이벤트 트리거
                 */
                this.em.dispatchEvent(new CustomEvent("gotstream", stream));
                this._record(stream);
            })
            .catch((error) => {
                alert("Error with getUserMedia: " + error.message);
                console.log(error);
            });
    }

    /**
     * AudioContext Node 연결, 오디오 처리
     * @param {MediaStream} stream
     * @private
     */
    _record(stream) {
        this.micAudioStream = stream;

        // MediaStreamSourceNode - 미디어 스트림 입력 Node
        this.inputStreamNode = this.audioCtx.createMediaStreamSource(this.micAudioStream);
        this.audioCtx = this.inputStreamNode.context;
        
        // GainNode 연결 및 증폭 설정 적용
        let nextNode = this.inputStreamNode;

        if (this.micGainNode) {
            this.inputStreamNode.connect(this.micGainNode);
            this.micGainNode.gain.setValueAtTime(this.config.micGain, this.audioCtx.currentTime);
        }
        
        // DynamicsCompressorNode 연결
        if (this.dynamicsCompressorNode) {
            nextNode.connect(this.dynamicsCompressorNode);
            nextNode = this.dynamicsCompressorNode;
        }

        this.state = "recording"

        // ScriptProcessorNode || AudioWorkletNode 및 GainNode 연결
        if (this.processorNode) {
            nextNode.connect(this.processorNode);
            nextNode = this.processorNode;

            // Message Handler
            if (!this.config.noAudioWorklet) {
                this.processorNode.port.onmessage = (e) => this._onAudioProcess(e.data);
            } else {
                this.processorNode.onaudioprocess = (e) => this._onAudioProcess(e);
            }

            if (this.audioCtx && this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }
        }

        if (this.outputGainNode) {
            nextNode.connect(this.outputGainNode);

            // MediaStreamDestinationNode 연결
            this.outputGainNode.connect(this.destinationNode);
            // GainNode 증폭 설정 적용
            this.outputGainNode.gain.setValueAtTime(this.config.outputGain, this.audioCtx.currentTime);    
        }
        
        // Blob 생성하고, MediaRecorder 사용할 경우 이벤트 리스너 추가 및 오디오 인코딩
        if (this.config.usingMediaRecorder && this.config.makeBlob) {
            this.mediaRecorder = new MediaRecorder(this.destinationNode.stream);

            this.mediaRecorder.addEventListener("dataavailable", (event) => this._onDataAvailable(event));
            this.mediaRecorder.addEventListener("error", (event) => this._onError(event));

            this.mediaRecorder.start();
        } else {
            // MediaRecorder 사용하지 않을 경우 증폭 값 0
            if (this.outputGainNode) {
                this.outputGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
            }
        }
    }

    /**
     * 오디오 버퍼 처리
     * @param {*} event
     * @private
     */
    _onAudioProcess(event) {
        // Raw audio data -> AudioBuffer
        if (!this.config.noAudioWorklet) {
            this.audioBuffer.copyToChannel(event.processedBuffer, 0);
        }

        // 오디오 처리 이벤트 트리거
        if (this.config.broadcastAudioProcessEvents) {
            this.em.dispatchEvent(new CustomEvent("onaudioprocess", {
                detail: {
                    buffer: (this.config.noAudioWorklet)
                        ? event.inputBuffer
                        : this.audioBuffer
                }
            }));
        }

        // Blob 생성하고, MediaRecorder 사용할 경우 오디오 인코딩
        if (!this.config.usingMediaRecorder && this.config.makeBlob) {
            if (this.state === "recording") {
                // 채널 데이터 인코딩 Worker Post
                this.encoderWorker.postMessage([
                    "encode",
                    (this.config.noAudioWorklet)
                        ? event.inputBuffer.getChannelData(0)
                        : new Float32Array(event.processedBuffer)
                ]);
            }
        }
    }

    /**
     * 녹음 종료 및 인코딩 데이터 Dump
     */
    stop() {
        console.log("RecorderService: Stop Recording");

        if (this.state === "inactive") {
            return ;
        }

        this.state = "inactive";
        // Blob 생성할 경우
        if (this.config.makeBlob) {
            // MediaRecorder 사용할 경우
            if (this.config.usingMediaRecorder) {
                // MediaRecorder 사용할 경우 정지
                this.mediaRecorder.stop();
            } else {
                // 인코딩 Worker 데이터 dump 요청
                this.encoderWorker.postMessage(["dump", this.audioCtx.sampleRate]);
            }
        } else {
            this._destroy();
        }
    }

    /**
     * 오디오 데이터 후 처리 및 자원 해체
     * @param event
     * @private
     */
    _onDataAvailable(event) {
        console.log("RecorderService: DataAvailable");

        // 오디오 데이터 Push
        this.chunks.push(event.data);
        this.chunkType = event.data.type;

        if (this.state !== "inactive") {
            return ;
        }

        // 오디오 데이터 Blob 생성
        let blob = new Blob(this.chunks, { "type": this.chunkType });
        let blobUrl = URL.createObjectURL(blob);

        // 데이터 정보
        const recorded = {
            ts: new Date().getTime(),
            blob: blob,
            blobUrl: blobUrl,
            mimeType: blob.type,
            size: blob.size
        };

        // 자원 해제
        this._destroy();

        /**
         * 녹음된 오디오 준비됨 이벤트 트리거
         */
        this.em.dispatchEvent(new CustomEvent("recorded", { detail: { recorded: recorded } }));
    }

    /**
     * 오디오 관련 자원 해제
     * @private
     */
    _destroy() {
        this.chunks = [];
        this.chunkType = null;

        if (this.destinationNode) {
            this.destinationNode.disconnect();
            this.destinationNode = null;
        }
        if (this.outputGainNode) {
            this.outputGainNode.disconnect();
            this.outputGainNode = null;
        }
        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode = null;
        }
        if (this.encoderWorker) {
            this.encoderWorker.postMessage(["close"]);
            this.encoderWorker = null;
        }
        if (this.micGainNode) {
            this.micGainNode.disconnect();
            this.micGainNode = null;
        }
        if (this.inputStreamNode) {
            this.inputStreamNode.disconnect();
            this.inputStreamNode = null;
        }

        if (this.config.stopTracksAndCloseCtxWhenFinished) {
            this.micAudioStream.getTracks().forEach((track) => track.stop());
            this.micAudioStream = null;

            this.audioCtx.close();
            this.audioCtx = null;
        }
    }

    /**
     * 오류 발생 시 이벤트
     * @param event
     * @private
     */
    _onError(event) {
        console.log("error", event);
        // 오류 이벤트 트리거
        this.em.dispatchEvent(new Event("error"));
        alert("error:" + event);
    }

    _debug(run, config) {
        if ((config === true || this.config.debugging) && run) {
            run();
        }
    }
}