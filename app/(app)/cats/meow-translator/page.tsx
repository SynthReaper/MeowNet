'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { awardMeowTranslationPoints } from '@/lib/actions/gamification';

interface TranslationResult {
  mood: string;
  confidence: number;
  is_fun_feature: boolean;
  disclaimer: string;
}

export default function MeowTranslatorPage() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pointsClaimed, setPointsClaimed] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('kitt');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Clean up audio url
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [audioUrl]);

  // SVG Waveform Drawing during recording
  const startCanvasAnimation = (stream: MediaStream) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!recording) return;
      animationFrameId.current = requestAnimationFrame(draw);
      analyserRef.current?.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        // Vibrant neon matching MeowNet gold/teal
        ctx.fillStyle = `rgb(${235 - i * 2}, ${132 + i * 2}, ${36 + i * 4})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();
  };

  const startRecording = async () => {
    setError(null);
    setResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start();
      setRecording(true);
      startCanvasAnimation(stream);
    } catch (err: any) {
      setError('Microphone access denied or unavailable. Please upload an audio file instead.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setAudioBlob(selectedFile);
      setAudioUrl(URL.createObjectURL(selectedFile));
      setError(null);
      setResult(null);
    }
  };

  const handleTranslate = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setError(null);
    setPointsClaimed(false);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'meow.wav');

    try {
      const res = await fetch('/api/ai/meow', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to translate.');
      }

      const data = await res.json();
      setResult(data);

      // Claim reward points
      try {
        const rewardRes = await awardMeowTranslationPoints();
        if (rewardRes.success) {
          setPointsClaimed(true);
        }
      } catch (rewardErr) {
        console.error("Points award error:", rewardErr);
      }
    } catch (err: any) {
      setError(err.message || 'The ML translator service is currently busy or offline. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Text-to-Speech funny playback
  const speakTranslation = () => {
    if (!result) return;
    
    // Funny translated cat quotes based on mood
    const quotesByMood: Record<string, string[]> = {
      happy: [
        "I am extremely pleased with the scratch sequence. You may continue.",
        "A wonderful day to be pampered by my human servant.",
        "Purr-fection! My kibble level is satisfactory."
      ],
      aggressive: [
        "Step back immediately, large hairless biped! This is my sector.",
        "You are testing my feline patience. Hiss!",
        "Do not touch the belly fluff. It is a trap!"
      ],
      hungry: [
        "My food bowl has been empty for exactly two minutes. This is an emergency!",
        "I demand the premium wet food, not the dry biscuits.",
        "Feed me now or prepare for carpet scratches."
      ],
      calling: [
        "Is anyone out there? I require immediate companionship.",
        "Volunteer! Register me in the MeowNet registry immediately.",
        "Attention! The colony demands fresh water."
      ]
    };

    const moodKey = result.mood.toLowerCase();
    const quotes = quotesByMood[moodKey] || [
      "I am a mysterious street cat. My thoughts are beyond your comprehension."
    ];
    const speechText = quotes[Math.floor(Math.random() * quotes.length)];

    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(speechText);
    
    // Set funny cat voice parameters based on selected persona
    if (selectedVoice === 'kitt') {
      utterance.pitch = 2.0; // High pitch kitten
      utterance.rate = 1.2;
    } else if (selectedVoice === 'grumpy') {
      utterance.pitch = 0.5; // Grumpy low pitch senior cat
      utterance.rate = 0.8;
    } else {
      utterance.pitch = 1.0; // Standard cat
      utterance.rate = 1.0;
    }

    synth.speak(utterance);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-12 py-10 md:py-16 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/cats"
          className="flex items-center gap-1 text-[var(--empire-cream)]/50 hover:text-[var(--empire-cream)] text-xs font-bold uppercase tracking-wider w-fit"
        >
          <span className="material-symbols-outlined text-xs">arrow_back</span>
          <span>Cat Logs</span>
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-[var(--empire-gold)] flex items-center gap-3 mt-1">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>spatial_audio</span>
          <span>AI Meow Translator</span>
        </h1>
        <p className="font-body text-base text-[var(--empire-cream)]/70 max-w-xl">
          Record or upload a community stray's vocal meow. Our AI mood classifier estimates their behavioral sentiment!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Card: Input Recorder */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient flex flex-col gap-6">
          <h2 className="font-display text-lg text-[var(--empire-cream)] font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--life-teal)]">mic</span>
            <span>Record Cat Vocalization</span>
          </h2>

          {/* Recording Canvas / Visualizer */}
          <div className="bg-[var(--bg-void)] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[180px] relative overflow-hidden border border-[var(--bg-border)]/20">
            {recording ? (
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={300} height={180} />
            ) : audioUrl ? (
              <div className="flex flex-col items-center gap-3 z-10">
                <span className="material-symbols-outlined text-emerald-400 text-5xl animate-pulse">audiotrack</span>
                <span className="font-body text-xs text-[var(--empire-cream)]/60">Audio file ready for translation</span>
                <audio src={audioUrl} controls className="h-10 mt-1" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 z-10 text-center px-4">
                <span className="material-symbols-outlined text-[var(--empire-cream)]/20 text-5xl">mic_off</span>
                <span className="font-body text-xs text-[var(--empire-cream)]/50">
                  Tap record or upload a meow file (.wav, .mp3) below
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            {recording ? (
              <button
                onClick={stopRecording}
                className="bg-rose-500 text-white hover:bg-rose-600 px-6 py-3.5 rounded-xl font-display text-xs font-bold uppercase transition-all shadow-md flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <span className="material-symbols-outlined text-sm">stop</span>
                <span>Stop Recording</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={loading}
                className="bg-[var(--empire-gold)] text-white hover:bg-[#e6b020] px-6 py-3.5 rounded-xl font-display text-xs font-bold uppercase transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">mic</span>
                <span>Record Audio</span>
              </button>
            )}
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[var(--bg-border)]/20"></div>
            <span className="flex-shrink mx-4 text-[9px] font-bold text-[var(--empire-cream)]/40 uppercase">OR</span>
            <div className="flex-grow border-t border-[var(--bg-border)]/20"></div>
          </div>

          {/* File Upload Fallback */}
          <div>
            <label className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider block mb-2">Upload Audio File</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={loading || recording}
              className="w-full bg-[var(--bg-elevated)]/60 text-[var(--empire-cream)] font-body text-xs p-3 rounded-xl border border-[var(--bg-border)]/50 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-[var(--empire-gold)] file:text-white hover:file:bg-[#e6b020] file:cursor-pointer"
            />
          </div>

          <button
            onClick={handleTranslate}
            disabled={loading || recording || !audioBlob}
            className="w-full bg-[var(--life-teal)] text-white hover:opacity-90 px-6 py-4 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            <span className="material-symbols-outlined">spatial_audio</span>
            {loading ? 'AI Classifying meow...' : 'Translate Meow Mood'}
          </button>
        </div>

        {/* Right Card: Result & TTS */}
        <div className="md:col-span-5 flex flex-col gap-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">info</span>
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-[var(--bg-border)] shadow-ambient flex flex-col gap-6 animate-fade-in">
              <div>
                <span className="text-[10px] font-bold text-[var(--empire-cream)]/50 uppercase tracking-wider block">Classification Result</span>
                <h3 className="font-display text-2xl text-[var(--life-teal)] font-bold mt-1 uppercase">
                  Mood: {result.mood}
                </h3>
                <span className="font-data text-xs text-[var(--empire-cream)]/40 block mt-0.5">
                  {(result.confidence * 100).toFixed(0)}% AI confidence rating
                </span>
              </div>

              {pointsClaimed && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[10px] font-bold flex items-center gap-1.5 animate-bounce">
                  <span className="material-symbols-outlined text-xs">stars</span>
                  <span>+10 XP Empire Points Earned!</span>
                </div>
              )}

              {/* Text to Speech Voiceover Panel */}
              <div className="border-t border-[var(--bg-border)]/30 pt-4 flex flex-col gap-4">
                <div>
                  <h4 className="font-display text-xs font-bold text-[var(--empire-cream)]">🔊 Funny AI voice translation</h4>
                  <p className="font-body text-[10px] text-[var(--empire-cream)]/50 mt-0.5">
                    Select a translation vocal persona and listen to their inner thoughts:
                  </p>
                </div>

                <div className="flex gap-2">
                  {(['kitt', 'grumpy', 'standard'] as const).map(voice => (
                    <button
                      key={voice}
                      onClick={() => setSelectedVoice(voice)}
                      className={`flex-1 py-2 rounded-lg font-display text-[9px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
                        selectedVoice === voice 
                          ? 'bg-[var(--empire-gold)] text-white border-[var(--empire-gold)] shadow-sm'
                          : 'bg-[var(--bg-elevated)] text-[var(--empire-cream)]/60 border-[var(--bg-border)]/35 hover:bg-[var(--bg-border)]/10'
                      }`}
                    >
                      {voice === 'kitt' && '🐱 Kitten'}
                      {voice === 'grumpy' && '👴 Grumpy'}
                      {voice === 'standard' && '🐈 Standard'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={speakTranslation}
                  className="bg-[var(--bg-elevated)] border border-[var(--bg-border)]/65 text-[var(--empire-cream)] hover:bg-[var(--bg-border)]/20 py-3 rounded-xl font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">volume_up</span>
                  <span>Speak Translation</span>
                </button>
              </div>

              <p className="font-body text-[9px] text-[var(--empire-cream)]/40 italic leading-relaxed pt-3 border-t border-[var(--bg-border)]/20">
                {result.disclaimer}
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-elevated)]/15 border border-[var(--bg-border)]/40 p-8 rounded-3xl text-center shadow-ambient text-[var(--empire-cream)]/45 font-body text-xs italic min-h-[220px] flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-3xl opacity-30">spatial_audio</span>
              <span>Submit a meow audio to see behavioral translations here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
