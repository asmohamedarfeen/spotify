import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { ChevronDown, Heart, Download, CheckCircle } from 'lucide-react';

// Extract dominant colors from an image via canvas sampling
function extractColors(imgSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 64;
      canvas.height = 64;
      ctx.drawImage(img, 0, 0, 64, 64);

      const regions = [
        { x: 8, y: 8 },    // top-left
        { x: 48, y: 8 },   // top-right
        { x: 32, y: 32 },  // center
        { x: 8, y: 48 },   // bottom-left
        { x: 48, y: 48 },  // bottom-right
      ];

      const colors = regions.map(({ x, y }) => {
        const data = ctx.getImageData(x, y, 8, 8).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        return {
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        };
      });

      // Sort by saturation to pick the most vibrant colors
      const withSat = colors.map(c => {
        const max = Math.max(c.r, c.g, c.b);
        const min = Math.min(c.r, c.g, c.b);
        const sat = max === 0 ? 0 : (max - min) / max;
        return { ...c, sat };
      });
      withSat.sort((a, b) => b.sat - a.sat);

      resolve(withSat.slice(0, 4));
    };
    img.onerror = () => {
      resolve([
        { r: 29, g: 185, b: 84 },
        { r: 30, g: 50, b: 100 },
        { r: 80, g: 20, b: 120 },
        { r: 20, g: 20, b: 60 },
      ]);
    };
    img.src = imgSrc;
  });
}

export default function NowPlaying() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    toggleNowPlaying,
    audioRef,
    downloadedSongs,
    downloadSong,
    downloadingSongs,
    audioQuality,
    isOfflineMode,
  } = usePlayer();

  const canvasRef = useRef(null);
  const particleCanvasRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const animFrameRef = useRef(null);
  const particleFrameRef = useRef(null);
  const [colors, setColors] = useState([
    { r: 29, g: 185, b: 84 },
    { r: 30, g: 50, b: 100 },
    { r: 80, g: 20, b: 120 },
    { r: 20, g: 20, b: 60 },
  ]);
  const [isLiked, setIsLiked] = useState(false);
  const particlesRef = useRef([]);

  // Extract colors whenever the current song changes
  useEffect(() => {
    if (currentSong?.thumbnail) {
      extractColors(currentSong.thumbnail).then(setColors);
    }
  }, [currentSong?.thumbnail]);

  // Initialize particles
  useEffect(() => {
    const particles = [];
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 4 + 2,
        speedY: -(Math.random() * 0.0004 + 0.0001),
        speedX: (Math.random() - 0.5) * 0.0003,
        opacity: Math.random() * 0.4 + 0.1,
        colorIdx: Math.floor(Math.random() * 4),
      });
    }
    particlesRef.current = particles;
  }, []);

  // Particle animation loop
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const animate = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      particlesRef.current.forEach(p => {
        if (isPlaying) {
          p.y += p.speedY;
          p.x += p.speedX;
        }

        // Wrap around
        if (p.y < -0.05) p.y = 1.05;
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;

        const c = colors[p.colorIdx] || colors[0];
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${p.opacity})`;
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${p.opacity * 0.15})`;
        ctx.fill();
      });

      particleFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (particleFrameRef.current) cancelAnimationFrame(particleFrameRef.current);
    };
  }, [colors, isPlaying]);

  // Audio Visualizer — connect to HTML5 audio if available, else use procedural
  const connectAnalyser = useCallback(() => {
    if (!audioRef?.current) return false;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;

      if (!sourceRef.current) {
        sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        sourceRef.current.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyserRef.current = analyser;
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return true;
    } catch (e) {
      console.warn('Could not connect audio analyser:', e);
      return false;
    }
  }, [audioRef]);

  // Visualizer canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const hasRealAudio = connectAnalyser();
    const barCount = 48;
    let phase = 0;

    const draw = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      let dataArray;

      if (hasRealAudio && analyserRef.current) {
        // Real frequency data from Web Audio API
        const bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
      } else {
        // Procedural fallback — generate animated bars
        dataArray = new Uint8Array(barCount);
        if (isPlaying) {
          phase += 0.04;
          for (let i = 0; i < barCount; i++) {
            const wave1 = Math.sin(phase + i * 0.3) * 0.4 + 0.5;
            const wave2 = Math.sin(phase * 1.7 + i * 0.15) * 0.3;
            const wave3 = Math.cos(phase * 0.5 + i * 0.5) * 0.2;
            const combined = Math.max(0, Math.min(1, wave1 + wave2 + wave3));
            // Center bars are taller (bass simulation)
            const centerBias = 1 - Math.abs(i - barCount / 2) / (barCount / 2) * 0.4;
            dataArray[i] = Math.floor(combined * centerBias * 200);
          }
        }
      }

      const totalBars = Math.min(barCount, dataArray.length);
      const gap = 3;
      const barWidth = (w - gap * totalBars) / totalBars;

      for (let i = 0; i < totalBars; i++) {
        const value = dataArray[i] / 255;
        const barHeight = value * h * 0.85;

        const c = colors[i % colors.length];
        const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
        gradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.9)`);
        gradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`);

        const x = i * (barWidth + gap);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 3);
        ctx.roundRect(x, h - barHeight, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, colors, connectAnalyser]);

  if (!currentSong) return null;

  const c1 = colors[0] || { r: 29, g: 185, b: 84 };
  const c2 = colors[1] || { r: 30, g: 50, b: 100 };
  const c3 = colors[2] || { r: 80, g: 20, b: 120 };
  const c4 = colors[3] || { r: 20, g: 20, b: 60 };

  const isDownloaded = !!downloadedSongs[currentSong.videoId];
  const isDownloading = downloadingSongs[currentSong.videoId] === 'downloading';

  const isCurrentSongLossless = currentSong && (
    (!isOfflineMode && audioQuality === 'lossless') ||
    (isOfflineMode && isDownloaded && downloadedSongs[currentSong.videoId]?.quality === 'lossless')
  );

  return (
    <div
      className="now-playing-view"
      style={{
        '--c1': `${c1.r}, ${c1.g}, ${c1.b}`,
        '--c2': `${c2.r}, ${c2.g}, ${c2.b}`,
        '--c3': `${c3.r}, ${c3.g}, ${c3.b}`,
        '--c4': `${c4.r}, ${c4.g}, ${c4.b}`,
      }}
    >
      {/* Ambient Background Blobs */}
      <div className="ambient-layer">
        <div className="ambient-blob blob-1"></div>
        <div className="ambient-blob blob-2"></div>
        <div className="ambient-blob blob-3"></div>
        <div className="ambient-blob blob-4"></div>
      </div>

      {/* Floating Particles Canvas */}
      <canvas ref={particleCanvasRef} className="particle-canvas"></canvas>

      {/* Top Bar with Back Button */}
      <div className="np-top-bar">
        <button className="np-back-btn" onClick={toggleNowPlaying} title="Close Now Playing">
          <ChevronDown size={28} />
        </button>
        <span className="np-top-label">NOW PLAYING</span>
        <div style={{ width: 28 }}></div>
      </div>

      {/* Center Content */}
      <div className="np-center-content">
        {/* Vinyl Album Art */}
        <div className="vinyl-container">
          <div className="vinyl-glow" style={{ boxShadow: `0 0 80px 20px rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.3), 0 0 160px 60px rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.15)` }}></div>
          <div className={`vinyl-art-wrapper ${isPlaying ? 'spinning' : ''}`}>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="vinyl-art-img"
            />
          </div>
        </div>

        {/* Song Info */}
        <div className="np-song-info">
          <div className="np-title-row">
            <h1 className="np-song-title">{currentSong.title}</h1>
            {isCurrentSongLossless && (
              <span className="np-hifi-badge">HiFi</span>
            )}
          </div>
          <p className="np-song-artist">{currentSong.artist}</p>

          {/* Action Buttons */}
          <div className="np-actions">
            <button
              className={`np-action-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
              title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
            >
              <Heart fill={isLiked ? 'currentColor' : 'none'} size={22} />
            </button>

            {isDownloaded ? (
              <span className="np-downloaded-badge" title="Downloaded">
                <CheckCircle size={20} fill="currentColor" color="black" />
              </span>
            ) : isDownloading ? (
              <span className="np-downloading-badge" title="Downloading...">
                <div className="np-spinner"></div>
              </span>
            ) : (
              <button
                className="np-action-btn"
                onClick={() => downloadSong(currentSong)}
                title="Download for Offline"
              >
                <Download size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Visualizer */}
      <div className="np-visualizer-container">
        <canvas ref={canvasRef} className="np-visualizer-canvas"></canvas>
      </div>
    </div>
  );
}
