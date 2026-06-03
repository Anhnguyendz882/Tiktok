(() => {
    if (window.twilightSpatialV34Active) return;
    window.twilightSpatialV34Active = true;

    console.log("[WAR ENGINE V34.1] FIXED SYNTAX. READY TO DEPLOY.");

    const EngineConfig = {
        state: {
            isActive: true,
            masterGain: 1200000,      
            mp3ExtraBoost: 35,        
            panningValue: -0.50,      
            reverbDecay: 0.50,        
            reverbDelayTime: 0.015,   
            bassBoost: 35,            
            trebleScream: 28,         
            noiseGateSlider: 25,      
            autoLoopActive: false,    
            panelX: 30,
            panelY: 30
        }
    };

    const trackedPipelines = new Set();
    let globalAudioContext = null;
    let globalAudioBuffer = null;

    function initContext() {
        if (!globalAudioContext) {
            globalAudioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: "interactive",
                sampleRate: 48000
            });
        }
        if (globalAudioContext.state === "suspended") globalAudioContext.resume();
        return globalAudioContext;
    }

    function createUnstoppableCurve() {
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; ++i) {
            const x = (i * 2) / samples - 1;
            curve[i] = Math.tanh(x * 35); 
        }
        return curve;
    }

    class SpatialWarPipeline {
        constructor(mediaStream) {
            this.sourceStream = mediaStream;
            this.ctx = initContext();

            this.srcNode = this.ctx.createMediaStreamSource(mediaStream);
            this.dstNode = this.ctx.createMediaStreamDestination();
            this.loopSourceNode = null;

            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.srcNode.connect(this.analyser);

            this.micGateGainNode = this.ctx.createGain();
            this.highPassFilter = this.ctx.createBiquadFilter();
            this.highPassFilter.type = "highpass";
            this.highPassFilter.frequency.setValueAtTime(180, this.ctx.currentTime); 

            this.mainMixerBus = this.ctx.createGain();

            this.internalOverdriveGain = this.ctx.createGain();
            this.bassFilter = this.ctx.createBiquadFilter();
            this.bassFilter.type = "lowshelf";
            this.bassFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

            this.trebleFilter = this.ctx.createBiquadFilter();
            this.trebleFilter.type = "highshelf";
            this.trebleFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);

            this.reverbDelay = this.ctx.createDelay(0.5);
            this.reverbFeedback = this.ctx.createGain();

            this.squashCompressor = this.ctx.createDynamicsCompressor();
            this.squashCompressor.threshold.setValueAtTime(-60, this.ctx.currentTime);
            this.squashCompressor.knee.setValueAtTime(0, this.ctx.currentTime);
            this.squashCompressor.ratio.setValueAtTime(20, this.ctx.currentTime);
            this.squashCompressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
            this.squashCompressor.release.setValueAtTime(0.010, this.ctx.currentTime);

            this.brickwallShaper = this.ctx.createWaveShaper();
            this.brickwallShaper.curve = createUnstoppableCurve();
            this.brickwallShaper.oversample = "4x";

            this.spatialPanner = this.ctx.createStereoPanner();
            this.finalSafetyGain = this.ctx.createGain();

            this.srcNode.connect(this.micGateGainNode);
            this.micGateGainNode.connect(this.highPassFilter);
            this.highPassFilter.connect(this.mainMixerBus);

            this.mainMixerBus.connect(this.internalOverdriveGain);
            this.internalOverdriveGain.connect(this.bassFilter);
            this.bassFilter.connect(this.trebleFilter);

            this.trebleFilter.connect(this.squashCompressor);
            this.trebleFilter.connect(this.reverbDelay);
            this.reverbDelay.connect(this.reverbFeedback);
            this.reverbFeedback.connect(this.reverbDelay);
            this.reverbFeedback.connect(this.squashCompressor);

            this.squashCompressor.connect(this.brickwallShaper);
            this.brickwallShaper.connect(this.spatialPanner); 
            this.spatialPanner.connect(this.finalSafetyGain);
            this.finalSafetyGain.connect(this.dstNode);

            this.smoothedVolume = 0;
            this.startSmoothGateScanner();
            this.updateHardware();

            this.outputStream = new MediaStream();
            this.dstNode.stream.getAudioTracks().forEach(t => this.outputStream.addTrack(t));
            mediaStream.getVideoTracks().forEach(t => this.outputStream.addTrack(t));
        }

        startSmoothGateScanner() {
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const scan = () => {
                if (!trackedPipelines.has(this)) return;

                const s = EngineConfig.state;
                const time = this.ctx.currentTime;

                if (!s.isActive) {
                    this.micGateGainNode.gain.setValueAtTime(1, time);
                    requestAnimationFrame(scan);
                    return;
                }

                if (s.autoLoopActive) {
                    this.micGateGainNode.gain.setValueAtTime(0, time);
                    requestAnimationFrame(scan);
                    return;
                }

                this.analyser.getByteFrequencyData(dataArray);
                let instEnergy = 0;
                for (let i = 0; i < bufferLength; i++) {
                    instEnergy += dataArray[i];
                }
                const currentInstantVol = instEnergy / bufferLength;

                this.smoothedVolume = (this.smoothedVolume * 0.82) + (currentInstantVol * 0.18);

                if (this.smoothedVolume > s.noiseGateSlider) {
                    this.micGateGainNode.gain.setTargetAtTime(1.0, time, 0.004); 
                } else {
                    this.micGateGainNode.gain.setTargetAtTime(0.0, time, 0.08);  
                }

                requestAnimationFrame(scan);
            };
            requestAnimationFrame(scan);
        }

        updateHardware() {
            const s = EngineConfig.state;
            const time = this.ctx.currentTime;

            if (!s.isActive) {
                this.internalOverdriveGain.gain.setValueAtTime(1, time);
                this.bassFilter.gain.setValueAtTime(0, time);
                this.trebleFilter.gain.setValueAtTime(0, time);
                this.reverbFeedback.gain.setValueAtTime(0, time);
                this.spatialPanner.pan.setValueAtTime(0, time); 
                this.finalSafetyGain.gain.setValueAtTime(1, time);
                this.stopLocalLoop();
                return;
            }

            if (s.autoLoopActive && globalAudioBuffer) {
                if (!this.loopSourceNode) {
                    this.loopSourceNode = this.ctx.createBufferSource();
                    this.loopSourceNode.buffer = globalAudioBuffer;
                    this.loopSourceNode.loop = true;

                    this.mp3PreAmp = this.ctx.createGain();
                    this.mp3PreAmp.gain.setValueAtTime(s.mp3ExtraBoost, time);

                    this.loopSourceNode.connect(this.mp3PreAmp);
                    this.mp3PreAmp.connect(this.mainMixerBus);
                    this.loopSourceNode.start(0);
                }
            } else {
                this.stopLocalLoop();
            }

            const parsedGain = 1.0 + (s.masterGain / 300);
            this.internalOverdriveGain.gain.setValueAtTime(parsedGain, time);

            this.bassFilter.gain.setValueAtTime(s.bassBoost, time);
            this.trebleFilter.gain.setValueAtTime(s.trebleScream, time);

            this.reverbDelay.delayTime.setValueAtTime(s.reverbDelayTime, time);
            this.reverbFeedback.gain.setValueAtTime(s.reverbDecay, time);

            this.spatialPanner.pan.setValueAtTime(s.panningValue, time);
            this.finalSafetyGain.gain.setValueAtTime(1.5, time);
        }

        stopLocalLoop() {
            if (this.loopSourceNode) {
                try { this.loopSourceNode.stop(); } catch (e) {}
                try { this.loopSourceNode.disconnect(); } catch (e) {}
                if (this.mp3PreAmp) { try { this.mp3PreAmp.disconnect(); } catch (e) {} }
                this.loopSourceNode = null;
            }
        }
    }

    const nativeGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async function(constraints) {
        if (constraints && constraints.audio) {
            constraints.audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
            const originalStream = await nativeGetUserMedia.apply(this, arguments);
            try {
                const pipe = new SpatialWarPipeline(originalStream);
                trackedPipelines.add(pipe);
                return pipe.outputStream;
            } catch (err) {
                return originalStream;
            }
        }
        return nativeGetUserMedia.apply(this, arguments);
    };

    function refreshPipelines() {
        trackedPipelines.forEach(p => {
            try { p.updateHardware(); } catch (e) { trackedPipelines.delete(p); }
        });
    }

    class SpatialWarUI {
        render() {
            this.createStyles();
            this.buildDOM();
            this.bindEvents();
        }

        createStyles() {
            const id = "twi-spatial-css";
            if (document.getElementById(id)) return;
            const style = document.createElement("style");
            style.id = id;
            style.innerHTML = "#twi-panel { position: fixed; top: " + EngineConfig.state.panelY + "px; left: " + EngineConfig.state.panelX + "px; width: 430px; background: #040408; border: 2px solid #ff0055; border-radius: 4px; z-index: 9999999; font-family: 'Consolas', monospace; color: #fff; box-shadow: 0 0 35px rgba(255, 0, 85, 0.4); }\n.twi-head { background: #090912; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ff0055; cursor: move; }\n.twi-title { font-weight: bold; font-size: 13px; color: #ff0055; text-shadow: 0 0 8px #ff0055; }\n.twi-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }\n.twi-row { background: #090714; border: 1px solid rgba(255, 0, 85, 0.15); padding: 10px; border-radius: 3px; }\n.twi-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }\n.twi-text { font-size: 11px; color: #00ffcc; font-weight: bold; text-transform: uppercase; }\n.twi-badge { font-size: 11px; color: #ff0055; font-weight: bold; background: #010103; padding: 2px 6px; border: 1px solid rgba(255, 0, 85, 0.3); min-width: 65px; text-align: center; }\n.twi-slider { -webkit-appearance: none; width: 100%; height: 5px; background: #110e21; outline: none; }\n.twi-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; background: #ff0055; cursor: pointer; box-shadow: 0 0 6px #ff0055; border-radius: 2px; }\n.twi-slider::-webkit-slider-thumb:hover { background: #00ffcc; box-shadow: 0 0 6px #00ffcc; }\n.twi-switch { position: relative; width: 40px; height: 20px; }\n.twi-switch input { opacity: 0; width: 0; height: 0; }\n.twi-toggle { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #110e21; border: 1px solid #00ffcc; border-radius: 10px; transition: 0.2s; }\n.twi-toggle:before { position: absolute; content: \"\"; height: 12px; width: 12px; left: 3px; bottom: 3px; background: #00ffcc; border-radius: 50%; transition: 0.2s; }\ninput:checked + .twi-toggle { background: #ff0055; border-color: #ff0055; }\ninput:checked + .twi-toggle:before { transform: translateX(20px); background: #040408; }\n.twi-file-btn { background: #080614; border: 1px dashed #ff0055; color: #00ffcc; font-size: 11px; font-weight: bold; padding: 8px; text-align: center; cursor: pointer; border-radius: 3px; margin-top: 5px; }\n.twi-warn { font-size: 10px; color: #ff0055; border-left: 2px solid #00ffcc; padding-left: 8px; line-height: 1.4; font-weight: bold; background: rgba(255, 0, 85, 0.02); padding-top: 5px; padding-bottom: 5px; }\n#twi-ball { position: fixed; bottom: 25px; right: 25px; width: 55px; height: 55px; border-radius: 50%; background: #040408; border: 2px solid #ff0055; z-index: 9999998; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; box-shadow: 0 0 20px rgba(255, 0, 85, 0.4); }";
            document.head.appendChild(style);
        }

        buildDOM() {
            const ball = document.createElement("div");
            ball.id = "twi-ball";
            ball.innerHTML = "🌶️";
            document.body.appendChild(ball);
            this.btnBall = ball;

            const panel = document.createElement("div");
            panel.id = "twi-panel";
            panel.innerHTML = '\n                <div class="twi-head">\n                    <div class="twi-title">TWILIGHT UNCOUNTERABLE v34.1</div>\n                    <div style="font-size: 9px; color: #00ffcc; font-weight: bold;">SPATIAL BLOCK</div>\n                </div>\n                <div class="twi-body">\n                    <div class="twi-row twi-flex">\n                        <div class="twi-text" style="color:#ff0055;">KÍCH HOẠT HỆ THỐNG ENGINE (ON/OFF)</div>\n                        <label class="twi-switch"><input type="checkbox" id="twi-on"><span class="twi-toggle"></span></label>\n                    </div>\n\n                    <div class="twi-row" style="border: 1px solid #00ffcc; background: #031012;">\n                        <div class="twi-flex">\n                            <div class="twi-text" style="color: #00ffcc;">🎧 CHẾ ĐỘ ĐÈ 2 TAI (TRÁI - GIỮA MATRIX)</div>\n                            <div class="twi-badge" id="lbl-pan" style="color: #00ffcc;">Trái-Giữa</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-pan" min="-1.0" max="0.0" step="0.05" value="-0.50">\n                    </div>\n\n                    <div class="twi-row" style="border: 1px solid #ff0055; background: #0d0412;">\n                        <div class="twi-flex">\n                            <div class="twi-text" style="color: #ff0055;">🤖 CHẾ ĐỘ TREO NGÔN (CÔ LẬP MIC ĐOÀN)</div>\n                            <label class="twi-switch"><input type="checkbox" id="twi-loop-on"><span class="twi-toggle"></span></label>\n                        </div>\n                        <input type="file" id="twi-uploader" accept="audio/*" style="display:none;">\n                        <div class="twi-file-btn" id="twi-upload-btn">NẠP FILE NGÔN CỦA ÔNG (.MP3 / .WAV)</div>\n                        \n                        <div class="twi-flex" style="margin-top: 8px;">\n                            <div class="twi-text" style="color: #ff0055; font-size:10px;">⚡ KÍCH PHÓNG ĐẠI MP3 TREO NGÔN</div>\n                            <div class="twi-badge" id="lbl-mp3boost">x35</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-mp3boost" min="10" max="80" step="5" value="35">\n                    </div>\n\n                    <div class="twi-row">\n                        <div class="twi-flex">\n                            <div class="twi-text" style="color: #ff0055;">🛡️ CỔNG BẢO VỆ CHỐNG RÈ GIẬT (NOISE GATE)</div>\n                            <div class="twi-badge" id="lbl-gate">25 Lv</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-gate" min="5" max="75" step="1" value="25">\n                    </div>\n\n                    <div class="twi-row">\n                        <div class="twi-flex">\n                            <div class="twi-text">MASTER LOUD GAIN (ĐÈ SÀN CHÁY MIC)</div>\n                            <div class="twi-badge" id="lbl-gain">1,200,000</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-gain" min="100000" max="2500000" step="100000" value="1200000">\n                    </div>\n\n                    <div class="twi-row">\n                        <div class="twi-flex">\n                            <div class="twi-text">WESTERN DECAY (ĐỘ VANG PHÒNG ĐẤU)</div>\n                            <div class="twi-badge" id="lbl-decay">50%</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-decay" min="10" max="90" step="1" value="50">\n                    </div>\n\n                    <div class="twi-row">\n                        <div class="twi-flex">\n                            <div class="twi-text">RESONANCE PITCH (ĐỘ VỠ ĐANH TIẾNG)</div>\n                            <div class="twi-badge" id="lbl-time">0.015s</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-time" min="0.005" max="0.050" step="0.005" value="0.015">\n                    </div>\n\n                    <div class="twi-row">\n                        <div class="twi-flex">\n                            <div class="twi-text">BASS BOOST (NỘI LỰC ĐÈ SÀN)</div>\n                            <div class="twi-badge" id="lbl-bass">35 dB</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-bass" min="0" max="50" step="1" value="35">\n                    </div>\n\n                    <div class="twi-row">\n                        <div class="twi-flex">\n                            <div class="twi-text">TREBLE SCREAM (HỦY DIỆT TẠP ÂM ĐỐI THỦ)</div>\n                            <div class="twi-badge" id="lbl-treble">28 dB</div>\n                        </div>\n                        <input type="range" class="twi-slider" id="input-treble" min="0" max="50" step="1" value="28">\n                    </div>\n\n                    <div class="twi-warn">\n                        📌 YÊU CẦU: TẮT hết Khử tiếng vang / Lọc tiếng ồn mặc định của Discord đi nhé.\n                    </div>\n                </div>';
            document.body.appendChild(panel);
            this.win = panel;
        }

        bindEvents() {
            let visible = true;
            this.btnBall.onclick = () => {
                visible = !visible;
                this.win.style.display = visible ? "block" : "none";
                initContext();
            };

            const head = this.win.querySelector(".twi-head");
            let drag = false, x = 0, y = 0;
            head.onmousedown = (e) => { drag = true; x = e.clientX - this.win.offsetLeft; y = e.clientY - this.win.offsetTop; };
            window.onmousemove = (e) => { if (!drag) return; this.win.style.left = (e.clientX - x) + "px"; this.win.style.top = (e.clientY - y) + "px"; };
            window.onmouseup = () => drag = false;

            const uploader = document.getElementById("twi-uploader");
            const uploadBtn = document.getElementById("twi-upload-btn");
            uploadBtn.onclick = () => uploader.click();
            
            uploader.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                uploadBtn.innerText = "ĐANG GIẢI MÃ BLOCK MP3... ⚙️";
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const ctx = initContext();
                        ctx.decodeAudioData(evt.target.result, (buffer) => {
                            globalAudioBuffer = buffer;
                            uploadBtn.innerText = "✅ ĐÃ NẠP: " + file.name.substring(0, 10);
                            uploadBtn.style.borderColor = "#00ffcc";
                            refreshPipelines();
                        }, () => {
                            uploadBtn.innerText = "❌ LỖI FILE!";
                        });
                    } catch (err) {
                        uploadBtn.innerText = "❌ THẤT BẠI!";
                    }
                };
                reader.readAsArrayBuffer(file);
            };

            document.getElementById("twi-on").checked = EngineConfig.state.isActive;
            document.getElementById("twi-on").onchange = (e) => {
                EngineConfig.state.isActive = e.target.checked;
                initContext();
                refreshPipelines();
            };

            document.getElementById("twi-loop-on").checked = EngineConfig.state.autoLoopActive;
            document.getElementById("twi-loop-on").onchange = (e) => {
                if (e.target.checked && !globalAudioBuffer) {
                    alert("Nạp file MP3 treo ngôn vào trước ông ơi!");
                    e.target.checked = false;
                    return;
                }
                EngineConfig.state.autoLoopActive = e.target.checked;
                refreshPipelines();
            };

            document.getElementById("input-pan").oninput = (e) => {
                const v = parseFloat(e.target.value);
                EngineConfig.state.panningValue = v;
                let txt = "Trái-Giữa";
                if (v === -1.0) txt = "Thuần Trái";
                if (v === 0.0) txt = "Chính Giữa";
                document.getElementById("lbl-pan").innerText = txt + " (" + v + ")";
                refreshPipelines();
            };

            document.getElementById("input-mp3boost").oninput = (e) => {
                const v = parseInt(e.target.value);
                EngineConfig.state.mp3ExtraBoost = v;
                document.getElementById("lbl-mp3boost").innerText = "x" + v;
                refreshPipelines();
            };

            document.getElementById("input-gate").oninput = (e) => {
                const v = parseInt(e.target.value);
                EngineConfig.state.noiseGateSlider = v;
                document.getElementById("lbl-gate").innerText = v + " Lv";
            };

            document.getElementById("input-gain").oninput = (e) => {
                const v = parseInt(e.target.value);
                EngineConfig.state.masterGain = v;
                document.getElementById("lbl-gain").innerText = v.toLocaleString();
                refreshPipelines();
            };

            document.getElementById("input-decay").oninput = (e) => {
                const v = parseInt(e.target.value);
                EngineConfig.state.reverbDecay = v / 100;
                document.getElementById("lbl-decay").innerText = v + "%";
                refreshPipelines();
            };

            document.getElementById("input-time").oninput = (e) => {
                const v = parseFloat(e.target.value);
                EngineConfig.state.reverbDelayTime = v;
                document.getElementById("lbl-time").innerText = v + "s";
                refreshPipelines();
            };

            document.getElementById("input-bass").oninput = (e) => {
                const v = parseInt(e.target.value);
                EngineConfig.state.bassBoost = v;
                document.getElementById("lbl-bass").innerText = v + " dB";
                refreshPipelines();
            };

            document.getElementById("input-treble").oninput = (e) => {
                const v = parseInt(e.target.value);
                EngineConfig.state.trebleScream = v;
                document.getElementById("lbl-treble").innerText = v + " dB";
                refreshPipelines();
            };
        }
    }

    const start = () => { new SpatialWarUI().render(); };
    if (document.body) start();
    else window.addEventListener("DOMContentLoaded", start);
})();
