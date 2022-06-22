import EncoderWav from "./encoder-wav-worker.js";
import Resampler from "./Resampler.js";

/**
 * RecorderService
 * WebAudioAPI 오디오 녹음, 버퍼 처리, 인코딩 라이브러리
 * 
 * @author paragonnov
 * @email qkdxorjs1002@gmail.com
 * @license GPL-3.0
 * @link https://github.com/qkdxorjs1002/RecorderService.js
 * @class
 * @example
 * // Initialize Pre-configured RecorderService
 * let recorderService = RecorderService.createPreConfigured();
 * 
 * // Add event listener to get audio buffer data
 * // event.detail.audioBuffer -> AudioBuffer
 * // event.detail.arrayBuffer -> Float32Array
 * recorderService.em.addEventListener('onaudioprocess', (event) =>
 *     wavesurfer.loadDecodedBuffer(event.detail.audioBuffer));
 * // Add event listener for recorded data
 * recorderService.em.addEventListener('recorded', (event) => {
 *     // event.detail.recorded.blob -> Blob
 *     // event.detail.recorded.blobUrl -> String
 *     wavesurfer.load(event.detail.recorded.blobUrl);
 * });
 * 
 * // Start recording
 * recorderService.record()
 *     .then(() => {
 *         // after start recording
 *     })
 *     .catch(() => {
 *         // catch exception
 *     });
 * 
 * // Stop recording
 * recorderService.stop();
 */

export default class RecorderService {

    /**
     * @typedef {Object} RecorderServiceConfig                  RecorderService 설정
     * @property {Number} sampleRate                            오디오 샘플링 레이트 {16000}
     * @property {Number} channelCount                          오디오 입력, 처리될 채널 수 {1}
     * @property {String} latencyHint                           오디오 처리 우선 순위 [balanced | interactive | playback] {interactive}
     * @property {Number} bufferSize                            오디오 버퍼 크기 [2^{12}=4096] {12}
     * @property {Number} micGain                               오디오 입력 증폭 {1.0}
     * @property {Number} outputGain                            오디오 출력 증폭 (MediaRecorder) {1.0}
     * @property {Boolean} broadcastAudioProcessEvents          오디오 처리 이벤트 발생 여부 {true}
     * @property {Boolean} enableDynamicsCompressor             오디오 리미터 사용 여부 {true}
     * @property {Boolean} noAudioWorklet                       AudioWorkletNode 사용 여부 (ScriptProcessorNode -> Deprecated) {false}
     * @property {Boolean} usingMediaRecorder                   MediaRecorder 사용 여부 {window.MediaRecorder}
     * @property {Boolean} makeBlob                             오디오 결과 Blob 생성 여부 {true}
     * @property {Boolean} verbose                              콘솔 로그 보기 {true}
     * @property {Boolean} debug                                콘솔 디버그 로그 보기 {false}
     * @property {Boolean} stopTracksAndCloseCtxWhenFinished    녹음 종료 후 자원 해제 여부 {true}
     * @property {String} audioProcessor                        AudioProcessor 경로 {./AudioProcessor.js}
     * @property {MediaTrackConstraintSet} audioConstraints     {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings MediaTrackSettings} 참조 {Object}
     */

    /**
     * RecorderService
     * @param {RecorderServiceConfig} config 
     * @example
     * // Default config
     * {
     *     sampleRate: 16000,
     *     channelCount: 1,
     *     latencyHint: "interactive",
     *     bufferSize: 12,
     *     micGain: 1.0,
     *     outputGain: 1.0,
     *     broadcastAudioProcessEvents: true,
     *     enableDynamicsCompressor: true,
     *     noAudioWorklet: false,
     *     usingMediaRecorder: typeof window.MediaRecorder !== "undefined",
     *     makeBlob: true,
     *     verbose: true,
     *     debug: false,
     *     stopTracksAndCloseCtxWhenFinished: true,
     *     audioProcessor: "./AudioProcessor.js",
     *     audioConstraints: { }
     * }
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
            sampleRate: 16000,
            channelCount: 1,
            latencyHint: "interactive",
            bufferSize: 12,
            micGain: 1.0,
            outputGain: 1.0,
            broadcastAudioProcessEvents: true,
            enableDynamicsCompressor: true,
            noAudioWorklet: false,
            usingMediaRecorder: typeof window.MediaRecorder !== "undefined",
            makeBlob: true,
            verbose: true,
            debug: false,
            stopTracksAndCloseCtxWhenFinished: true,
            audioProcessor: "./AudioProcessor.js",
            audioConstraints: { }
        };

        if (config != undefined) {
            Object.assign(this.config, config);
        }

        this.info("RecorderService: Config", this.config);
    }
    
    /**
     * createPreConfigured
     * 사전 정의된 설정으로 인스턴스 생성
     * @param {(RecorderServiceConfig|null)} config
     * @example
     * // Assign to default config
     * {
     *     usingMediaRecorder: false,
     *     audioConstraints: {
     *         autoGainControl: false,
     *         noiseSuppression: false
     *     }
     * }
     */
    static createPreConfigured(config) {
        let _config = {
            usingMediaRecorder: false,
            audioConstraints: {
                autoGainControl: false,
                noiseSuppression: false
            }
        };
        if (config != undefined) {
            Object.assign(_config, config);
        }

        const userAgentAlias = this.getUserAgentAlias();

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

        return new RecorderService(_config);
    }

    /**
     * UserAgent Alias 반환
     * @returns {String}
     *     "android", "android-s8", "android-note20ultra", "android-v500",
     *     "ios", "ipad", "ipod", "mac",
     *     "other"
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
     * @param {Object} fn Worker script
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
     * @returns {(Promise<MediaStream>|void)}
     */
    async record() {
        this.info("RecorderService: Start recording");

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
        this.debug("RecorderService: AudioContext", this.audioCtx);

        // GainNode - 오디오 증폭 Node
        this.micGainNode = this.audioCtx.createGain();
        this.outputGainNode = this.audioCtx.createGain();

        // DynamicCompressorNode - 오디오 리미터 Node
        if (this.config.enableDynamicsCompressor) {
            this.dynamicsCompressorNode = this.audioCtx.createDynamicsCompressor();
        }
        
        /**
         * config.sampleRate와 마이크 입력 SampleRate가 다를 경우,
         * 설정된 config.bufferSize와 근사한 크기의 리샘플링된 버퍼를 출력하기 위해 목표 버퍼 크기 설정
         */
        this.bufferSizeRatio = this.audioCtx.sampleRate / this.config.sampleRate;
        this.bufferSize = 2 ** Math.min((this.config.bufferSize + Math.round(this.bufferSizeRatio) - 1), 14);
        this.debug("RecorderService: Preferred BufferSize", this.bufferSize, this.bufferSizeRatio);

        // AudioWorkletNode || ScriptProcessorNode - 오디오 버퍼 처리 Node
        if (this.config.broadcastAudioProcessEvents || !this.config.usingMediaRecorder) {
            try {
                await this.audioCtx.audioWorklet.addModule(this.config.audioProcessor).then(() => {
                    this.debug("RecorderService: Use AudioWorkletNode with AudioProcessor", this.config.audioProcessor);
                    if (this.config.noAudioWorklet) {
                        throw "RecorderService: Config: noAudioWorklet: true";
                    }
    
                    this.processorNode = new AudioWorkletNode(this.audioCtx, "audio-processor", {
                        numberOfInputs: this.config.channelCount,
                        numberOfOutputs: this.config.channelCount,
                        processorOptions: {
                            bufferSize: this.bufferSize,
                        }
                    });
                    this.debug("RecorderService: AudioWorkletNode", this.processorNode);
    
                    this.audioBuffer = this.audioCtx.createBuffer(
                        this.config.channelCount,
                        this.bufferSize,
                        this.audioCtx.sampleRate
                    );
                    this.debug("RecorderService: AudioBuffer", this.audioBuffer);
                });
            } catch(e) {
                // AudioWorkletNode 생성 실패시, ScriptProcessorNode 시도
                this.warn("RecorderService: AudioWorkletNode is not available. Use ScriptProcessorNode.", e);
                this.config.noAudioWorklet = true;
                this.processorNode = this.audioCtx.createScriptProcessor(
                    this.bufferSize,
                    this.config.channelCount,
                    1
                );
                this.debug("RecorderService: ScriptProcessorNode", this.processorNode);
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
                //sampleRate: this.config.sampleRate,
                channelCount: this.config.channelCount
            }, this.config.audioConstraints)
        };

        this.debug("RecorderService: UserMediaConstraints", userMediaConstraints);

        // 미디어 소스 ID
        if (this.config.deviceId) {
            userMediaConstraints.audio.deviceId = this.config.deviceId;
        }

        // MediaStream 요청
        return navigator.mediaDevices.getUserMedia(userMediaConstraints)
            .then((stream) => {
                this.debug("RecorderService: MediaStream", stream);
                /**
                 * MediaStream 이벤트 트리거
                 */
                this.em.dispatchEvent(new CustomEvent("gotstream", stream));
                this._record(stream);
            })
            .catch((err) => this._onError(err));
    }

    /**
     * AudioContext Node 연결, 오디오 처리
     * @private
     * @param {MediaStream} stream
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
     * @typedef {Object} AudioProcessingEvent
     * @property {(Float32Array|AudioBuffer)} inputBuffer      입력 버퍼 (AudioWorkletNode / ScriptProcessorNode -> Float32Array / AudioBuffer)
     * @property {(AudioBuffer|undefined)} outputBuffer        출력 버퍼 (AudioWorkletNode / ScriptProcessorNode -> undefined / AudioBuffer)
     * @property {(Float32Array|undefined)} processedBuffer    확장 버퍼된 버퍼 (AudioWorkletNode / ScriptProcessorNode -> Float32Array / undefined)
     * @param {AudioProcessingEvent} event                     오디오 버퍼 처리 이벤트
     * @private
     */
    _onAudioProcess(event) {
        // Raw audio data -> AudioBuffer
        let audioBuffer;
        if (!this.config.noAudioWorklet) {
            audioBuffer = this.audioBuffer;
            audioBuffer.copyToChannel(event.processedBuffer, 0);
        } else {
            audioBuffer = event.inputBuffer;
        }

        let arrayBuffer;
        if (this.bufferSizeRatio != 1) {
            let resampler = new Resampler(
                this.audioCtx.sampleRate, 
                this.config.sampleRate, 
                this.config.channelCount, 
                audioBuffer.getChannelData(0)
            );
            resampler.resampler(Math.ceil(this.bufferSize * this.bufferSizeRatio));
            arrayBuffer = resampler.outputBuffer;
            this.debug("RecorderService: Resampled Buffer", arrayBuffer, resampler);
        } else {
            arrayBuffer = audioBuffer.getChannelData(0);
            this.debug("RecorderService: Original Buffer", arrayBuffer);
        }

        // 오디오 처리 이벤트 트리거
        if (this.config.broadcastAudioProcessEvents) {
            this.em.dispatchEvent(new CustomEvent("onaudioprocess", {
                detail: {
                    audioBuffer: audioBuffer,
                    arrayBuffer: arrayBuffer
                }
            }));
        }

        // Blob 생성하고, MediaRecorder 사용할 경우 오디오 인코딩
        if (!this.config.usingMediaRecorder && this.config.makeBlob) {
            if (this.state === "recording") {
                // 채널 데이터 인코딩 Worker Post
                this.encoderWorker.postMessage([
                    "encode",
                    arrayBuffer
                ]);
            }
        }

        if (this.config.debug) {
            const now = new Date().getTime();
            this.debug("RecorderService: BufferToBufferTime", now - (this.pre || now), event);
            this.pre = now;
        }
    }

    /**
     * 녹음 종료 및 인코딩 데이터 Dump, 자원 해체
     */
    stop() {
        this.info("RecorderService: Stop Recording");

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
                this.encoderWorker.postMessage(["dump", this.config.sampleRate]);
            }
        } else {
            this._destroy();
        }
    }

    /**
     * 오디오 데이터 후 처리 및 자원 해체
     * @param {Event} event
     * @private
     */
    _onDataAvailable(event) {
        this.debug("RecorderService: DataAvailable", event);

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
     * @param {Event} event
     * @private
     */
    _onError(event) {
        this.error("error", event);
        alert(event);
        // 오류 이벤트 트리거
        this.em.dispatchEvent(new Event("error"));
    }

    /**
     * Info log message
     * @param {Array} data
     */
    info(...data) {
        if (this.config.verbose) {
            console.info(...data);
        }
    }

    /**
     * Debug message
     * @param {Array} data
     */
    debug(...data) {
        if (this.config.debug) {
            console.log(...data);
        }
    }

    /**
     * Warn log message
     * @param {Array} data
     */
    warn(...data) {
        if (this.config.verbose) {
            console.warn(...data);
        }
    }

    /**
     * Error log message
     * @param {Array} data
     */
    error(...data) {
        console.error(...data);
    }
}