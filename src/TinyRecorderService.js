/**
 * RecorderService
 * WebAudioAPI 오디오 녹음, 버퍼 처리, 인코딩 라이브러리
 *
 * @author paragonnov
 * @email qkdxorjs1002@gmail.com
 * @license GPL-3.0
 * @link https://github.com/qkdxorjs1002/RecorderService.js
 * @class
 */
export default class TinyRecorderService extends EventTarget {
    /**
     * @typedef {Object} RecorderServiceConfig                  RecorderService 설정
     * @property {Number} bufferSize                            오디오 버퍼 크기 [2^{12}=4096] {12}
     * @property {Boolean} callingMode                          전화 모드 {false}
     * @property {Boolean} verbose                              콘솔 로그 보기 {true}
     * @property {Boolean} debug                                콘솔 디버그 로그 보기 {false}
     * @property {MediaTrackConstraintSet} audioConstraints     {@link https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings MediaTrackSettings} 참조 {Object}
     */

    /**
     * RecorderService
     * @param {RecorderServiceConfig} config
     * @example
     * // Default config
     * {
     *     bufferSize: 12,
     *     callingMode: false,
     *     verbose: true,
     *     debug: false
     * }
     */
    constructor(config) {
        super();
        // Chrome, Safari AudioContext
        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        this.state = "inactive";
        this.isBufferProduced = false;

        this.config = {
            preferredBufferSec: 3,
            bufferSize: 14,
            verbose: true,
            callingMode: false,
            debug: false,
            audioConstraints: {},
        };

        this.buffer = new Float32Array();

        this.applyConfig(config);

        this.info("RecorderService: Config", this.config);
    }

    /**
     * 설정 적용
     * @param {RecorderServiceConfig} config 설정
     */
    applyConfig(config) {
        if (config != undefined) {
            Object.assign(this.config, config);
        }
    }

    /**
     * AudioContext 및 Node 초기화
     * @returns {(Promise<MediaStream>|void)}
     */
    async init() {
        this.info("RecorderService: Initialization");

        if (this.state !== "inactive") {
            return;
        }

        // getUserMedia 지원 여부 검증
        if (
            !navigator ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            alert("navigator.mediaDevices.getUserMedia error");
            return;
        }

        // WebAudioAPI AudioContext 초기화
        this.audioCtx = new AudioContext();
        this.debug("RecorderService: AudioContext", this.audioCtx);

        this.sampleRate = this.audioCtx.sampleRate;
        this.debug("RecorderService: AudioContext SampleRate", this.sampleRate);

        if (this.audioCtx) {
            this.audioCtx.suspend();
        }

        this.bufferSize = 2 ** Math.min(14, this.config.bufferSize);
        this.debug("RecorderService: Preferred BufferSize", this.bufferSize);

        this.processorNode = this.audioCtx.createScriptProcessor(
            this.bufferSize,
            1,
            1
        );
        this.debug("RecorderService: ScriptProcessorNode", this.processorNode);

        if (this.audioCtx.createMediaStreamDestination) {
            this.destinationNode = this.audioCtx.createMediaStreamDestination();
        } else {
            this.destinationNode = this.audioCtx.destination;
        }

        // 입력 장치 설정
        const device = this.config.callingMode
            ? await this.getAudioInputDeviceInfo()
            : undefined;
        if (!device) {
            this.config.callingMode = false;
        }

        // getUserMedia 제약
        const userMediaConstraints = {
            audio: Object.assign(
                {
                    channelCount: this.config.channelCount,
                    deviceId: device ? device.deviceId : undefined,
                },
                this.config.audioConstraints
            ),
        };
        this.debug(
            "RecorderService: UserMediaConstraints",
            userMediaConstraints
        );

        // MediaStream 요청
        return navigator.mediaDevices
            .getUserMedia(userMediaConstraints)
            .then((stream) => {
                this.debug("RecorderService: MediaStream", stream);
                /**
                 * MediaStream 이벤트 트리거
                 */
                this.dispatchEvent(
                    new CustomEvent("gotstream", { detail: { stream } })
                );
                this._init(stream);
            })
            .catch((err) => this._onError(err));
    }

    /**
     * AudioContext Node 연결, 오디오 처리
     * @private
     * @param {MediaStream} stream
     */
    _init(stream) {
        this.micAudioStream = stream;

        // MediaStreamSourceNode - 미디어 스트림 입력 Node
        this.inputStreamNode = this.audioCtx.createMediaStreamSource(
            this.micAudioStream
        );
        this.audioCtx = this.inputStreamNode.context;

        // ScriptProcessorNode || AudioWorkletNode 및 GainNode 연결
        this.inputStreamNode.connect(this.processorNode);

        this.processorNode.connect(this.destinationNode);

        if (this.audioCtx && this.audioCtx.state === "suspended") {
            this.audioCtx.resume();
        }

        this.state = "inited";
    }

    /**
     * 마이크 스트림 이벤트 리스너 추가
     * @param {Function} listener
     */
    addGotStreamEventListener(listener) {
        this.addEventListener("gotstream", listener);
    }

    /**
     * 오디오 버퍼 이벤트 리스너 추가
     * @param {Function} listener
     */
    addBufferEventListener(listener) {
        this.addEventListener("audioprocess", listener);
    }

    /**
     * 오류 이벤트 리스너 추가
     * @param {Function} listener
     */
    addErrorEventListener(listener) {
        this.addEventListener("error", listener);
    }

    /**
     * 오디오 입력장치 가져오기
     */
    async getAudioInputDeviceInfo() {
        // 입력 장치 설정
        const audioDevices = await navigator.mediaDevices.enumerateDevices();
        this.debug("RecorderService: AudioInputDeviceList", audioDevices);

        const audioInputDevices = [];
        audioDevices.forEach((device) => {
            if (device.kind.toLowerCase().includes("audioinput")) {
                audioInputDevices.push(device);
            }
        });
        if (audioInputDevices.length <= 0) {
            return;
        }

        const inputDevice =
            audioInputDevices.find((device) =>
                device.label.toLowerCase().includes("usb")
            ) ||
            audioInputDevices.find((device) =>
                device.label.toLowerCase().includes("headset")
            );
        if (inputDevice) {
            this.debug("RecorderService: AudioInputDevice", inputDevice);
        }

        return inputDevice;
    }

    /**
     * 녹음 시작
     * @returns {Promise|void}
     */
    record() {
        if (this.state !== "inited") {
            if (this.state !== "inactive") {
                return;
            }

            return this.init().then(() => {
                this._record();
            });
        }

        this._record();
    }

    _record() {
        this.info("RecorderService: Start Recording");
        this._resume();

        this.processorNode.onaudioprocess = (e) => this._onAudioProcess(e);
        this.info("RecorderService: ProcessorNode", this.processorNode);
    }

    /**
     * 녹음 일시정지
     */
    pause() {
        if (this.state !== "recording") {
            return;
        }

        this.info("RecorderService: Pause Recording");
        this.state = "paused";
    }

    /**
     * 녹음 이어하기
     */
    resume() {
        if (!(this.state === "paused")) {
            return;
        }

        this.info("RecorderService: Resume Recording");
        this._resume();
    }

    _resume() {
        this.state = "recording";
    }

    /**
     * 오디오 버퍼 처리
     * @param {AudioProcessingEvent} event                     오디오 버퍼 처리 이벤트
     * @private
     */
    _onAudioProcess(event) {
        this.isBufferProduced = true;

        if (this.state !== "recording") {
            return;
        }

        if (this.config.debug) {
            const now = new Date().getTime();
            this.debug(
                "RecorderService: BufferToBufferTime",
                now - (this.pre || now),
                event
            );
            this.pre = now;
        }

        if (
            this.buffer.length >
            this.audioCtx.sampleRate * this.config.preferredBufferSec
        ) {
            this.buffer = new Float32Array();
        }

        const arrayBuffer = event.inputBuffer.getChannelData(0);
        let mergedData = new Float32Array(
            this.buffer.length + arrayBuffer.length
        );
        mergedData.set(this.buffer, 0);
        mergedData.set(arrayBuffer, this.buffer.length);
        this.buffer = mergedData;

        this.dispatchEvent(
            new CustomEvent("audioprocess", {
                detail: {
                    arrayBuffer: arrayBuffer,
                    bufferedBuffer:
                        this.buffer.length >
                        this.audioCtx.sampleRate *
                            this.config.preferredBufferSec
                            ? this.buffer
                            : undefined,
                },
            })
        );
    }

    /**
     * 녹음 종료 및 인코딩 데이터 Dump, 자원 해체
     */
    async stop() {
        this.info("RecorderService: Stop Recording");

        if (this.state === "inactive") {
            return;
        }

        this.state = "inactive";
        this._destroy();
    }

    /**
     * 모든 자원 해제
     */
    release() {
        if (this.state !== "inactive") {
            return;
        }

        this._destroy();
    }

    /**
     * 오디오 관련 자원 해제
     * @private
     */
    _destroy() {
        if (this.destinationNode) {
            this.destinationNode.disconnect();
            this.destinationNode = null;
        }

        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode = null;
        }

        if (this.inputStreamNode) {
            this.inputStreamNode.disconnect();
            this.inputStreamNode = null;
        }

        if (this.micAudioStream) {
            this.micAudioStream.getTracks().forEach((track) => track.stop());
            this.micAudioStream = null;
        }

        if (this.audioCtx) {
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
        // 오류 이벤트 트리거
        this.dispatchEvent(
            new Event("error", {
                detail: event,
            })
        );
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
