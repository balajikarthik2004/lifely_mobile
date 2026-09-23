const fs = require('fs');

function writeWav(filename) {
    const sampleRate = 44100;
    const duration = 0.5; // seconds
    const numSamples = sampleRate * duration;
    
    // A simple Ding sound consists of a fundamental frequency (e.g., 880Hz, A5) 
    // and maybe a few harmonics, with an exponential decay envelope.
    const freq1 = 880; // A5
    const freq2 = 1760; // A6
    const freq3 = 2640; // E7
    
    // Create buffer for 1 channel, 16-bit PCM
    const buffer = Buffer.alloc(44 + numSamples * 2);
    
    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + numSamples * 2, 4);
    buffer.write('WAVE', 8);
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(1, 22); // NumChannels (1)
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    
    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(numSamples * 2, 40);
    
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        
        let val = 0;
        
        // Note 1: C5 (523.25 Hz) plays from 0.0s to 0.15s, with its own envelope
        if (t < 0.15) {
            const env1 = Math.exp(-t * 20); // Fast decay
            val += (
                Math.sin(2 * Math.PI * 523.25 * t) * 0.6 +
                Math.sin(2 * Math.PI * 1046.50 * t) * 0.2 // harmonic
            ) * env1 * 0.5;
        }
        
        // Note 2: E5 (659.25 Hz) plays from 0.05s
        if (t >= 0.05) {
            const t2 = t - 0.05;
            const env2 = Math.exp(-t2 * 15);
            val += (
                Math.sin(2 * Math.PI * 659.25 * t2) * 0.6 +
                Math.sin(2 * Math.PI * 1318.51 * t2) * 0.2
            ) * env2 * 0.5;
        }

        // Note 3: G5 (783.99 Hz) plays from 0.1s to end
        if (t >= 0.1) {
            const t3 = t - 0.1;
            const env3 = Math.exp(-t3 * 10);
            val += (
                Math.sin(2 * Math.PI * 783.99 * t3) * 0.5 +
                Math.sin(2 * Math.PI * 1567.98 * t3) * 0.2 +
                Math.sin(2 * Math.PI * 2351.97 * t3) * 0.1
            ) * env3 * 0.7; // slightly louder final note
        }
        
        // Soft clipping / compression to make it sound full but not harsh
        val = Math.tanh(val);
        
        // 16-bit signed integer range: -32768 to 32767
        let pcm = Math.floor(val * 32767);
        if (pcm > 32767) pcm = 32767;
        if (pcm < -32768) pcm = -32768;
        
        buffer.writeInt16LE(pcm, offset);
        offset += 2;
    }
    
    fs.writeFileSync(filename, buffer);
    console.log(`Generated ${filename}`);
}

writeWav('c:\\Users\\BalajiKrishnan\\Desktop\\tracker\\lifely\\assets\\success.wav');
