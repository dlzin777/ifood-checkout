/**
 * Tela /processando — vídeo com áudio obrigatório
 *
 * Regras:
 * 1) Nada avança até clicar em "Ativar audio"
 * 2) Só vai para sucesso.html quando o vídeo TERMINAR (evento ended)
 * 3) Não dá para pular para frente no vídeo
 * 4) Se voltar o vídeo para o começo, precisa assistir até o fim de novo
 */
(() => {
  "use strict";

  const textEl = document.getElementById("processing-text");
  const videoEl = document.getElementById("vsl-video");
  const progressEl = document.getElementById("processing-progress");
  const progressLabelEl = document.getElementById("processing-progress-label");
  const progressSegmentEls = Array.from(
    document.querySelectorAll(".processing-segment i")
  );
  const verifiedEl = document.getElementById("processing-verified");
  const overlayEl = document.getElementById("vsl-audio-overlay");
  const overlayBtn = document.getElementById("vsl-audio-btn");
  const toastEl = document.getElementById("toast");

  const loadingTexts = [
    "Verificando estoque da bag na sua região...",
    "Validando seus dados com segurança...",
    "Confirmando sua prioridade na fila...",
    "Liberando o acesso ao resgate...",
  ];

  const preferredVolume = 0.65;
  const SEEK_EPS = 0.35; // tolerância ao empurrar o seek

  let audioUnlocked = false;
  let finishTriggered = false;
  let maxWatchedTime = 0;
  let lastTextIndex = -1;
  let toastTimer = null;
  let finishTimer = null;
  let seekingClamp = false;

  function setProgress(ratio) {
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    const total = progressSegmentEls.length || 1;

    progressSegmentEls.forEach((segment, index) => {
      const start = index / total;
      const end = (index + 1) / total;
      let pct = 0;
      if (clamped >= end) pct = 1;
      else if (clamped > start) pct = (clamped - start) / (end - start);
      segment.style.width = `${Math.round(pct * 100)}%`;
    });

    if (progressLabelEl) {
      progressLabelEl.textContent = `${Math.round(clamped * 100)}%`;
    }
  }

  function showOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove("hidden");
    overlayEl.setAttribute("aria-hidden", "false");
  }

  function hideOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.add("hidden");
    overlayEl.setAttribute("aria-hidden", "true");
  }

  function updateText(txt) {
    if (!textEl) return;
    if (textEl.textContent === txt) return;
    textEl.style.opacity = "0";
    setTimeout(() => {
      textEl.textContent = txt;
      textEl.style.opacity = "1";
    }, 200);
  }

  function showToast(message, variant) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.remove("hidden", "toast--show", "toast--success");
    if (variant === "success") toastEl.classList.add("toast--success");
    void toastEl.offsetWidth;
    toastEl.classList.add("toast--show");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("toast--show");
      setTimeout(() => toastEl.classList.add("hidden"), 220);
    }, 2600);
  }

  function syncStatusFromVideo() {
    if (!videoEl || !Number.isFinite(videoEl.duration) || videoEl.duration <= 0) {
      return;
    }

    const ratio = videoEl.currentTime / videoEl.duration;
    setProgress(ratio);

    const idx = Math.min(
      loadingTexts.length - 1,
      Math.floor(ratio * loadingTexts.length)
    );
    if (idx !== lastTextIndex) {
      lastTextIndex = idx;
      updateText(loadingTexts[idx]);
    }
  }

  function finishVerification() {
    if (finishTriggered) return;
    finishTriggered = true;

    setProgress(1);
    updateText("Verificação concluída.");

    finishTimer = setTimeout(() => {
      if (progressEl) progressEl.classList.add("hidden");
      if (verifiedEl) {
        verifiedEl.classList.remove("hidden");
        verifiedEl.setAttribute("aria-hidden", "false");
      }
      showToast("Verificação concluída.", "success");

      setTimeout(() => {
        window.location.href = "sucesso.html";
      }, 900);
    }, 800);
  }

  async function enableAudio() {
    if (!videoEl) return;

    // Libera ANTES do play — senão o listener de "play" pausa de novo
    audioUnlocked = true;
    videoEl.muted = false;
    videoEl.defaultMuted = false;
    videoEl.volume = preferredVolume;

    try {
      if (videoEl.currentTime > 0.5) {
        videoEl.currentTime = 0;
      }
      maxWatchedTime = 0;
      finishTriggered = false;
      lastTextIndex = -1;
      setProgress(0);
      updateText(loadingTexts[0]);
      hideOverlay();

      await videoEl.play(); // executa automático assim que ativar o áudio
      showToast("Áudio ativado — assista até o final");

      // Garante que continue tocando (alguns browsers pausam ao trocar muted)
      if (videoEl.paused) {
        await videoEl.play();
      }
    } catch {
      audioUnlocked = false;
      showOverlay();
      showToast("Toque novamente para liberar o áudio");
    }
  }

  function onTimeUpdate() {
    if (!videoEl || !audioUnlocked || finishTriggered) return;

    // Bloqueia pular para frente
    if (videoEl.currentTime > maxWatchedTime + SEEK_EPS) {
      seekingClamp = true;
      videoEl.currentTime = maxWatchedTime;
      seekingClamp = false;
      showToast("Assista o vídeo até o final para continuar");
      return;
    }

    if (videoEl.currentTime > maxWatchedTime) {
      maxWatchedTime = videoEl.currentTime;
    }

    syncStatusFromVideo();
  }

  function onSeeking() {
    if (!videoEl || !audioUnlocked || seekingClamp) return;

    // Não permite ir além do que já foi assistido
    if (videoEl.currentTime > maxWatchedTime + SEEK_EPS) {
      seekingClamp = true;
      videoEl.currentTime = maxWatchedTime;
      seekingClamp = false;
    }
  }

  function onSeeked() {
    if (!videoEl || !audioUnlocked) return;

    // Se puxou para trás/começo: precisa assistir até o fim de novo
    if (videoEl.currentTime + SEEK_EPS < maxWatchedTime) {
      finishTriggered = false;
      // maxWatchedTime NÃO reduz — assim ainda não dá para pular à frente
      // mas o ended só dispara quando chegar no fim outra vez
      updateText("Continue assistindo até o final...");
    }

    syncStatusFromVideo();
  }

  function onEnded() {
    if (!audioUnlocked) {
      // Não terminou “de verdade” sem áudio liberado
      showOverlay();
      return;
    }

    // Só libera a próxima página se realmente chegou ao fim
    const duration = videoEl.duration || 0;
    if (duration > 0 && maxWatchedTime < duration - 1.25) {
      // Tentativa de burlar: força voltar e continuar
      videoEl.currentTime = Math.max(0, maxWatchedTime - 0.1);
      videoEl.play().catch(() => {});
      showToast("Assista o vídeo até o final para continuar");
      return;
    }

    setProgress(1);
    finishVerification();
  }

  function init() {
    setProgress(0);
    updateText("Ative o áudio para iniciar a verificação...");
    showOverlay();

    if (!videoEl) return;

    // Sem autoplay: espera o clique em "Ativar audio"
    videoEl.removeAttribute("autoplay");
    videoEl.autoplay = false;
    videoEl.muted = true;
    videoEl.pause();
    try {
      videoEl.currentTime = 0;
    } catch {
      /* ignore */
    }

    overlayBtn?.addEventListener("click", enableAudio);

    // Clique no overlay (fora do botão) também tenta liberar
    overlayEl?.addEventListener("click", (event) => {
      if (event.target === overlayBtn) return;
      enableAudio();
    });

    videoEl.addEventListener("timeupdate", onTimeUpdate);
    videoEl.addEventListener("seeking", onSeeking);
    videoEl.addEventListener("seeked", onSeeked);
    videoEl.addEventListener("ended", onEnded);

    // Se pausar manualmente antes de liberar áudio, mantém overlay
    videoEl.addEventListener("play", () => {
      if (!audioUnlocked) {
        videoEl.pause();
        showOverlay();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pagehide", () => {
    if (finishTimer) clearTimeout(finishTimer);
    clearTimeout(toastTimer);
  });
})();
