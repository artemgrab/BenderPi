async function init() {
    try {
      // 1. Get an ephemeral key from your server (ensure your backend provides the /session endpoint)
      const tokenResponse = await fetch("/session");
      const tokenData = await tokenResponse.json();
      const EPHEMERAL_KEY = tokenData.client_secret.value;
      console.log("Ephemeral key received:", EPHEMERAL_KEY);

      // 2. Create a new RTCPeerConnection.
      const pc = new RTCPeerConnection();

      // 3. Set up remote audio playback.
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
      pc.ontrack = e => {
        if (e.streams && e.streams[0]) {
          audioEl.srcObject = e.streams[0];
          // Instead of a placeholder, start the remote visualizer with the received stream.
          startBackendVisualizer(e.streams[0]);
        }
      };

      // 4. Get the microphone stream.
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Add the microphone track to the RTCPeerConnection.
      pc.addTrack(micStream.getTracks()[0]);
      // Start local visualization using the same micStream.
      startLocalVisualizer(micStream);

      // 5. Set up a data channel for events.
      const dc = pc.createDataChannel("oai-events");
      dc.addEventListener("message", (e) => {
        console.log("Data Channel message:", e.data);
      });

      // 6. Create an SDP offer.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("SDP offer created and set as local description.");

      // 7. Send the SDP offer to the OpenAI realtime API.
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      // 8. Get the SDP answer and set it as the remote description.
      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);
      console.log("SDP answer received and set as remote description. WebRTC connection established.");
    } catch (error) {
      console.error("Error initializing WebRTC connection:", error);
    }
  }

  /**
   * Start local visualization of the microphone audio (blue waveform).
   * Uses the Web Audio API to draw a continuous waveform on the local visualizer canvas.
   * @param {MediaStream} stream - The microphone audio stream.
   */
  function startLocalVisualizer(stream) {
    const localCanvas = document.getElementById('localVisualizer');
    const localCtx = localCanvas.getContext('2d');
    localCanvas.width = localCanvas.offsetWidth;
    localCanvas.height = localCanvas.offsetHeight;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      localCtx.fillStyle = '#f5f5f5';
      localCtx.fillRect(0, 0, localCanvas.width, localCanvas.height);
      localCtx.lineWidth = 2;
      localCtx.strokeStyle = '#007bff';
      localCtx.beginPath();
      const sliceWidth = localCanvas.width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * localCanvas.height / 2;
        if (i === 0) {
          localCtx.moveTo(x, y);
        } else {
          localCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      localCtx.lineTo(localCanvas.width, localCanvas.height / 2);
      localCtx.stroke();
    }
    draw();
  }

  /**
   * Visualizes the remote (backend) audio stream on the backend visualizer canvas (red waveform).
   * Uses the Web Audio API to continuously draw the waveform from the remote audio stream.
   * @param {MediaStream} remoteStream - The remote audio stream from the RTCPeerConnection.
   */
  function startBackendVisualizer(remoteStream) {
    const backendCanvas = document.getElementById('backendVisualizer');
    const backendCtx = backendCanvas.getContext('2d');
    backendCanvas.width = backendCanvas.offsetWidth;
    backendCanvas.height = backendCanvas.offsetHeight;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const source = audioContext.createMediaStreamSource(remoteStream);
    source.connect(analyser);

    function draw() {
      requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      backendCtx.fillStyle = '#f5f5f5';
      backendCtx.fillRect(0, 0, backendCanvas.width, backendCanvas.height);
      backendCtx.lineWidth = 2;
      backendCtx.strokeStyle = '#ff0000';
      backendCtx.beginPath();
      const sliceWidth = backendCanvas.width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * backendCanvas.height / 2;
        if (i === 0) {
          backendCtx.moveTo(x, y);
        } else {
          backendCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      backendCtx.lineTo(backendCanvas.width, backendCanvas.height / 2);
      backendCtx.stroke();
    }
    draw();
  }

  // Call init() on page load.
  init().catch(err => console.error("Error initializing connection:", err));