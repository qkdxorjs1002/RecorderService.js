/**
 * AudioWorklet Processor Script
 */
class AudioProcessor extends AudioWorkletProcessor {

    constructor() {
        super();
        this._inputBuffer = null;
        this._fifoBuffer = new Float32Array(4096);
    }

    /**
     * Process / Bypass Buffer
     * @param {Array<Array<Float32Array>>} inputList
     * @param outputList
     * @returns {boolean}
     */
    process(inputList, outputList) {
        if (inputList[0].length > 0 && inputList[0][0].length > 0) {
            this._pushToBuffer(inputList[0][0]);
            this._inputBuffer = inputList;
            outputList = this._inputBuffer;

            this.port.postMessage({
                inputBuffer: this._inputBuffer[0][0],
                outputBuffer: outputList[0][0],
                fifoBuffer: this._fifoBuffer
            });
        }

        return true;
    }

    /**
     * 오디오 RAW 데이터 -> AudioBuffer
     * @param {Float32Array} inputArray
     * @private
     */
    _pushToBuffer(inputArray) {
        let mergedData = new Float32Array(this._fifoBuffer.length + inputArray.length);
        mergedData.set(this._fifoBuffer, 0);
        mergedData.set(inputArray, this._fifoBuffer.length);
        this._fifoBuffer = mergedData.slice(inputArray.length, mergedData.length);
    }

}

// /**
//  * Circular Queue for FIFO Buffer (WIP)
//  */
// class BufferQueue {
//
//     constructor(queueSize) {
//         this._queueSize = queueSize;
//         this._fifoBuffer = new Float32Array(queueSize);
//         this._head = 0;
//         this._tail = 0;
//     }
//
//     _pop(popSize) {
//         this._head = (this._head + popSize) % this._queueSize;
//     }
//
//     push(inputArray) {
//         if (inputArray.length > this._queueSize) {
//             throw "AudioProcessor: Process: inputArray length is bigger than bufferSize.";
//         }
//
//         if (this._tail + inputArray.length > this._queueSize - 1) {
//
//         } else {
//             this._fifoBuffer.set(inputArray)
//         }
//     }
// }

registerProcessor('audio-processor', AudioProcessor);