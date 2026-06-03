import { metro, patcher, storage } from "@revenge";
import { React } from "@revenge/common";

// Định nghĩa Storage để lưu cấu hình sliders ngay trong app
storage.default = {
    isActive: true,
    masterGain: 1200000,
    mp3ExtraBoost: 35,
    panningValue: -0.50,
    noiseGateSlider: 25,
    bassBoost: 35,
    trebleScream: 28
};

const VoiceModule = metro.findByProps("setAudioSubsystem", "getVoiceEngine");

export default {
    onLoad() {
        console.log("[WAR ENGINE V34.1 NATIVE] REVENGE PORT ACTIVE.");

        // Hook trực tiếp vào luồng Audio Native của Discord Mobile
        if (VoiceModule && VoiceModule.getVoiceEngine) {
            patcher.instead("getVoiceEngine", VoiceModule, (args, original) => {
                const engine = original(...args);
                if (!engine || !storage.isActive) return engine;

                // Inject các thông số hủy diệt âm thanh trực tiếp vào phần cứng ảo của app
                if (engine.setAudioParameters) {
                    engine.setAudioParameters({
                        inputGainDb: parseFloat(1.0 + (storage.masterGain / 300)),
                        amplificationFactor: parseFloat(storage.mp3ExtraBoost),
                        stereoPan: parseFloat(storage.panningValue),
                        noiseGateThreshold: parseFloat(-storage.noiseGateSlider),
                        equalizerLowGain: parseFloat(storage.bassBoost),
                        equalizerHighGain: parseFloat(storage.trebleScream)
                    });
                }
                return engine;
            });
        }
    },

    onUnload() {
        patcher.unpatchAll();
    },

    // Vẽ giao diện menu điều khiển dạng Sliders trực tiếp trong mục Settings của Revenge
    settings: () => {
        const { View, Text, Switch, Slider } = metro.findByProps("Slider", "Switch");

        return React.createElement(View, { style: { padding: 16, backgroundColor: "#040408" } },
            React.createElement(Text, { style: { color: "#ff0055", fontWeight: "bold", fontSize: 16, marginBottom: 15 } }, "🌶️ TWILIGHT UNCOUNTERABLE v34.1"),

            // Switch On/Off
            React.createElement(View, { style: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 } },
                React.createElement(Text, { style: { color: "#00ffcc" } }, "KÍCH HOẠT ENGINE"),
                React.createElement(Switch, {
                    value: storage.isActive,
                    onValueChange: (v) => { storage.isActive = v; }
                })
            ),

            // Slider Master Gain
            React.createElement(Text, { style: { color: "#fff", marginTop: 10 } }, `MASTER LOUD GAIN: ${storage.masterGain.toLocaleString()}`),
            React.createElement(Slider, {
                minimumValue: 100000,
                maximumValue: 2500000,
                step: 100000,
                value: storage.masterGain,
                onValueChange: (v) => { storage.masterGain = v; }
            }),

            // Slider Panning
            React.createElement(Text, { style: { color: "#fff", marginTop: 10 } }, `🎧 ĐÈ HAI TAI (PANNING): ${storage.panningValue}`),
            React.createElement(Slider, {
                minimumValue: -1.0,
                maximumValue: 0.0,
                step: 0.05,
                value: storage.panningValue,
                onValueChange: (v) => { storage.panningValue = v; }
            }),

            // Slider Bass
            React.createElement(Text, { style: { color: "#fff", marginTop: 10 } }, `BASS BOOST: ${storage.bassBoost} dB`),
            React.createElement(Slider, {
                minimumValue: 0,
                maximumValue: 50,
                step: 1,
                value: storage.bassBoost,
                onValueChange: (v) => { storage.bassBoost = v; }
            }),

            // Slider Treble
            React.createElement(Text, { style: { color: "#fff", marginTop: 10 } }, `TREBLE SCREAM: ${storage.trebleScream} dB`),
            React.createElement(Slider, {
                minimumValue: 0,
                maximumValue: 50,
                step: 1,
                value: storage.trebleScream,
                onValueChange: (v) => { storage.trebleScream = v; }
            })
        );
    }
};
