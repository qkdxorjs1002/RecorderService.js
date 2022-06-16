# Documentation

commit - [2ad836557f9688ccf991f8a1237b3e2803acecb3](https://github.com/qkdxorjs1002/RecorderService.js/commit/2ad836557f9688ccf991f8a1237b3e2803acecb3)

- [Documentation](#documentation)
  - [class `RecorderService`](#class-recorderservice)
    - [constructor RecordService`(config|null)`](#constructor-recordserviceconfignull)
      - [Parameter *"config"* | `Map`](#parameter-config--map)
      - [Construct `RecordService`](#construct-recordservice)
    - [static function `createPreConfigured()`](#static-function-createpreconfigured)
      - [return `RecordService`](#return-recordservice)
    - [static function `getUserAgentAlias()`](#static-function-getuseragentalias)
      - [return `String`](#return-string)
    - [function `createWorker(fn)`](#function-createworkerfn)
      - [Parameter *"fn"* | `ImportedScript`](#parameter-fn--importedscript)
      - [Return `Worker`](#return-worker)
    - [async function `record()`](#async-function-record)
      - [Return `Promise`](#return-promise)
    - [function `_record(stream)`](#function-_recordstream)
      - [Parameter *"stream"* | `MediaStream`](#parameter-stream--mediastream)
    - [function `_onAudioProcess()`](#function-_onaudioprocess)
      - [Parameter *"event"* | ``](#parameter-event--)
    - [function `stop()`](#function-stop)
    - [function `_onDataAvailable(event)`](#function-_ondataavailableevent)
      - [Parameter *"event"* | ``](#parameter-event---1)
    - [function `_onError(event)`](#function-_onerrorevent)
    - [function `_debug(run, config)`](#function-_debugrun-config)
      - [Parameter *"run"* | `function`](#parameter-run--function)
      - [Parameter *"config"* | `Config`](#parameter-config--config)
  - [class `AudioProcessor`](#class-audioprocessor)
    - [constructor `AudioProcessor()`](#constructor-audioprocessor)
      - [Construct `AudioProcessor`](#construct-audioprocessor)
    - [function `process(inputList, outputList)`](#function-processinputlist-outputlist)
      - [Parameter *inputList* | ``](#parameter-inputlist--)
      - [Parameter *outputList* | ``](#parameter-outputlist--)

## class `RecorderService`

```javascript
/**
 * Recorder Service
 * WebAudioAPI
 */
```

### constructor RecordService`(config|null)`

#### Parameter *"config"* | `Map`

| Config                              | Type   | Default      | Description                                           |
| ----------------------------------- | ------ | ------------ | ----------------------------------------------------- |
| 'broadcastAudioProcessEvents'       | bool   | false        | 오디오 처리 이벤트 발생 여부                          |
| 'enableDynamicsCompressor'          | bool   | false        | 오디오 리미터 사용 여부                               |
| 'noAudioWorklet'                    | bool   | false        | AudioWorkletNode 사용 여부                            |
| 'micGain'                           | float  | 1.0          | 마이크 입력 증폭                                      |
| 'outputGain'                        | float  | 1.0          | 오디오 증폭                                           |
| 'processorBufferSize'               | int    | 2048         | ScriptProcessor 버퍼 크기                             |
| 'stopTracksAndCloseCtxWhenFinished' | bool   | true         | 녹음 종료 후 자원 해제 여부                           |
| 'usingMediaRecorder'                | bool   | Chrome: true | MediaRecorder 사용 여부                               |
| 'latencyHint'                       | String | balanced     | 오디오 처리 우선 순위 (balanced/interactive/playback) |
| 'sampleRate'                        | int    | 48000        | 오디오 샘플링 레이트                                  |
| 'debugging'                         | String | false        | 콘솔 디버깅 출력 여부                                 |
| 'audioConstraints'                  | Map    | { }          | MediaTrackOption.audio                                |

#### Construct `RecordService`

---

### static function `createPreConfigured()`

> User-Agent에 의존하여 기기별 사전 정의된 설정으로 초기화

```javascript
/**
 * 사전 정의된 설정으로 생성
 * @returns {RecorderService} RecorderService
 */
```

| Pre-Configured Config               | type   | default          | Description                                           |
| ----------------------------------- | ------ | ---------------- | ----------------------------------------------------- |
| 'broadcastAudioProcessEvents'       | bool   | true             | 오디오 처리 이벤트 발생 여부                          |
| 'enableDynamicsCompressor'          | bool   | true             | 오디오 리미터 사용 여부                               |
| 'noAudioWorklet'                    | bool   | false            | AudioWorkletNode 사용 여부                            |
| 'micGain'                           | float  | 1.0              | 마이크 입력 증폭                                      |
| 'outputGain'                        | float  | 1.0              | 오디오 증폭                                           |
| 'processorBufferSize'               | int    | 0                | ScriptProcessor 버퍼 크기                             |
| 'stopTracksAndCloseCtxWhenFinished' | bool   | true             | 녹음 종료 후 자원 해제 여부                           |
| 'usingMediaRecorder'                | bool   | false            | MediaRecorder 사용 여부                               |
| 'latencyHint'                       | String | interactive      | 오디오 처리 우선 순위 (balanced/interactive/playback) |
| 'sampleRate'                        | int    | 16000            | 오디오 샘플링 레이트                                  |
| 'debugging'                         | String | true             | 콘솔 디버깅 출력 여부                                 |
| 'audioConstraints'                  | Map    | AudioConstraints | MediaTrackOption.audio                                |

#### return `RecordService`

---

### static function `getUserAgentAlias()`

> UserAgent Alias 반환

```javascript
/**
 * UserAgent Alias 반환
 * @returns {string} 'android', 'android-s8', 'ios', 'other'
 */
```

#### return `String`

| value       | `android`      | `android-s8`      | `ios`        | `other`  |
| ----------- | -------------- | ----------------- | ------------ | -------- |
| Description | Android Device | Samsung Galaxy S8 | Apple iPhone | PC, ETC. |

---

### function `createWorker(fn)`

```javascript
/**
 * 인코딩 Worker 생성
 * @param {*} fn Worker script
 * @returns {Worker} 인코딩 Worker
 */
```

> 인코딩 Worker 생성

#### Parameter *"fn"* | `ImportedScript`

#### Return `Worker`

---

### async function `record()`

> AudioContext 및 Node 초기화, 녹음 시작

```javascript
/**
 * AudioContext 및 Node 초기화, 녹음 시작
 * @returns {void, Promise<MediaStream>}
 */
```

#### Return `Promise`

---

### function `_record(stream)`

> AudioContext Node 연결, 오디오 처리

```javascript
/**
 * AudioContext Node 연결, 오디오 처리
 * @param {MediaStream} stream
 * @private
 */
```

#### Parameter *"stream"* | `MediaStream`

---

### function `_onAudioProcess()`

> 오디오 버퍼 처리

```javascript
/**
 * 오디오 버퍼 처리
 * @param {*} event
 * @private
 */
```

#### Parameter *"event"* | ``

!!TODO: Link

---

### function `stop()`

> 녹음 종료 및 인코딩 데이터 Dump

```javascript
/**
 * 녹음 종료 및 인코딩 데이터 Dump
 */
```

---

### function `_onDataAvailable(event)`

> 오디오 데이터 후 처리 및 자원 해체

```javascript
/**
 * 오디오 데이터 후 처리 및 자원 해체
 * @param event
 * @private
 */
```

#### Parameter *"event"* | ``

!!TODO: Link

---

### function `_onError(event)`

> 오류 발생 시 이벤트

```javascript
/**
 * 오류 발생 시 이벤트
 * @param event
 * @private
 */
```

!!TODO: Link

---

### function `_debug(run, config)`

> 디버깅

#### Parameter *"run"* | `function`

!!TODO: Link

#### Parameter *"config"* | `Config`

!!TODO: Link

## class `AudioProcessor`

### constructor `AudioProcessor()`

#### Construct `AudioProcessor`

### function `process(inputList, outputList)`

> Process / Bypass Buffer

```javascript
/**
 * Process / Bypass Buffer
 * @param {Array<Array<Float32Array>>} inputList
 * @param outputList
 * @returns {boolean}
 */
```

#### Parameter *inputList* | ``

!!TODO: Link

#### Parameter *outputList* | ``

!!TODO: Link

