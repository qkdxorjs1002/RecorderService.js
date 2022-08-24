const worker = function () {
    /**
     * AudioWorklet Processor Script
     */
    class AudioProcessor extends AudioWorkletProcessor {
        constructor(options) {
            super();
            this.bufferSize = options.processorOptions.bufferSize;
            this.buffer = new Float32Array(this.bufferSize);
        }

        /**
         * Process / Bypass Buffer
         * @param {Array<Array<Float32Array>>} inputList
         * @param {Array<Array<Float32Array>>} outputList
         * @returns {boolean}
         */
        process(inputList, outputList) {
            if (inputList[0].length > 0 && inputList[0][0].length > 0) {
                let inputBuffer = inputList[0][0];
                this.pushToBuffer(inputBuffer);

                if (this.buffer.length >= this.bufferSize) {
                    this.port.postMessage({
                        buffer: this.buffer,
                    });
                }
            }

            return true;
        }

        /**
         * 오디오 RAW 데이터 Buffer
         * @param {Float32Array} buffer
         * @private
         */
        pushToBuffer(buffer) {
            if (this.buffer.length >= this.bufferSize) {
                this.buffer = new Float32Array(0);
            }
            let mergedData = new Float32Array(
                this.buffer.length + buffer.length
            );
            mergedData.set(this.buffer, 0);
            mergedData.set(buffer, this.buffer.length);
            this.buffer = mergedData;
        }

        // /**
        //  * 오디오 RAW 데이터 FIFO Buffer
        //  * @param {Float32Array} buffer
        //  * @private
        //  */
        // _pushToFifoBuffer(buffer) {
        //     let mergedData = new Float32Array(this.buffer.length + buffer.length);
        //     mergedData.set(this.buffer, 0);
        //     mergedData.set(buffer, this.buffer.length);
        //     this.buffer = mergedData.slice(buffer.length, mergedData.length);
        // }
    }

    registerProcessor("audio-processor", AudioProcessor);
};

export default worker;
