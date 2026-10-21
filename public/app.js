// ════════════════════════════════════════════════════════════════════════════
// Auto Video Gen — Web Studio Application Logic
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  // ── Elements ─────────────────────────────────────────────────────────────
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Tab 1: URL
  const inputArticleUrl = document.getElementById("inputArticleUrl");
  const btnExtractUrl = document.getElementById("btnExtractUrl");
  const extractedCard = document.getElementById("extractedCard");
  const extractedThumb = document.getElementById("extractedThumb");
  const extractedThumbWrapper = document.getElementById("extractedThumbWrapper");
  const extractedDomain = document.getElementById("extractedDomain");
  const extractedTitle = document.getElementById("extractedTitle");
  const extractedSnippet = document.getElementById("extractedSnippet");
  const selectVoiceUrl = document.getElementById("selectVoiceUrl");
  const inputChannelUrl = document.getElementById("inputChannelUrl");
  const btnSubmitUrl = document.getElementById("btnSubmitUrl");

  // Tab 2: Text
  const inputTextTitle = document.getElementById("inputTextTitle");
  const inputTextBody = document.getElementById("inputTextBody");
  const selectVoiceText = document.getElementById("selectVoiceText");
  const inputChannelText = document.getElementById("inputChannelText");
  const btnSubmitText = document.getElementById("btnSubmitText");

  // Tab 3: Script
  const inputScriptJson = document.getElementById("inputScriptJson");
  const btnLoadSampleScript = document.getElementById("btnLoadSampleScript");
  const btnSubmitCustomScript = document.getElementById("btnSubmitCustomScript");

  // Library & Preview
  const btnRefreshVideos = document.getElementById("btnRefreshVideos");
  const videoGrid = document.getElementById("videoGrid");
  const videoCountBadge = document.getElementById("videoCountBadge");
  const btnOpenStudioPreview = document.getElementById("btnOpenStudioPreview");

  // Progress Modal
  const progressModal = document.getElementById("progressModal");
  const progressModalTitle = document.getElementById("progressModalTitle");
  const progressJobId = document.getElementById("progressJobId");
  const progressStepText = document.getElementById("progressStepText");
  const progressPercent = document.getElementById("progressPercent");
  const progressBarFill = document.getElementById("progressBarFill");
  const stepsChecklist = document.getElementById("stepsChecklist");
  const logsConsole = document.getElementById("logsConsole");
  const logsToggle = document.getElementById("logsToggle");
  const modalFooter = document.getElementById("modalFooter");
  const btnCloseProgressModal = document.getElementById("btnCloseProgressModal");
  const btnViewResultVideo = document.getElementById("btnViewResultVideo");

  // Player Modal
  const playerModal = document.getElementById("playerModal");
  const activeVideoPlayer = document.getElementById("activeVideoPlayer");
  const playerModalTitle = document.getElementById("playerModalTitle");
  const playerVideoTitle = document.getElementById("playerVideoTitle");
  const playerVideoMeta = document.getElementById("playerVideoMeta");
  const playerCaptionBox = document.getElementById("playerCaptionBox");
  const btnCopyCaption = document.getElementById("btnCopyCaption");
  const btnDownloadMp4 = document.getElementById("btnDownloadMp4");
  const btnDownloadMp3 = document.getElementById("btnDownloadMp3");
  const btnOpenInStudio = document.getElementById("btnOpenInStudio");
  const btnClosePlayerModal = document.getElementById("btnClosePlayerModal");

  // Toast
  const toastNotification = document.getElementById("toastNotification");
  const toastMessage = document.getElementById("toastMessage");

  let currentActiveJob = null;
  let activeEventSource = null;
  let currentExtractedData = null;

  // ── Toast Notification Helper ────────────────────────────────────────────
  function showToast(msg) {
    toastMessage.textContent = msg;
    toastNotification.classList.add("show");
    setTimeout(() => {
      toastNotification.classList.remove("show");
    }, 3500);
  }

  // ── Tab Switching ────────────────────────────────────────────────────────
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const button = e.currentTarget || btn;
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      button.classList.add("active");
      const tabKey = button.dataset.tab;
      const targetPane = document.getElementById(`pane${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Global ESC key to close any open modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePlayerModal();
      closeProgressModal();
    }
  });

  // ── Extract URL Information ──────────────────────────────────────────────
  btnExtractUrl.addEventListener("click", async () => {
    const url = inputArticleUrl.value.trim();
    if (!url || !url.startsWith("http")) {
      showToast("Vui lòng nhập đường dẫn hợp lệ bắt đầu bằng http:// hoặc https://");
      inputArticleUrl.focus();
      return;
    }

    btnExtractUrl.disabled = true;
    btnExtractUrl.innerHTML = `<span class="modal-spinner" style="width:14px;height:14px;border-width:2px;"></span> Đang đọc...`;

    try {
      const res = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể quét dữ liệu từ URL");

      currentExtractedData = data;
      extractedDomain.textContent = data.domain || "website";
      extractedTitle.textContent = data.title || url;
      extractedSnippet.textContent = data.content ? data.content.slice(0, 160) + "..." : "Đã đọc nội dung thành công.";

      if (data.ogImage) {
        extractedThumb.src = data.ogImage;
        extractedThumbWrapper.style.display = "block";
      } else {
        extractedThumbWrapper.style.display = "none";
      }

      extractedCard.style.display = "flex";
      showToast("Đã trích xuất thông tin bài báo thành công!");
    } catch (err) {
      showToast(`Lỗi: ${err.message}`);
    } finally {
      btnExtractUrl.disabled = false;
      btnExtractUrl.innerHTML = `<span>Quét Dữ Liệu</span>`;
    }
  });

  // ── Start Pipeline From URL ──────────────────────────────────────────────
  btnSubmitUrl.addEventListener("click", async () => {
    const url = inputArticleUrl.value.trim();
    if (!url || !url.startsWith("http")) {
      showToast("Vui lòng nhập URL bài viết hợp lệ");
      return;
    }

    btnSubmitUrl.disabled = true;
    const oldBtnText = btnSubmitUrl.innerHTML;
    btnSubmitUrl.innerHTML = `<span class="modal-spinner" style="width:18px;height:18px;border-width:2px;"></span> Đang chuẩn bị kịch bản...`;

    try {
      if (!currentExtractedData || currentExtractedData.url !== url) {
        const res = await fetch("/api/extract-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          const data = await res.json();
          currentExtractedData = { ...data, url };
        }
      }

      const payload = {
        url,
        title: currentExtractedData?.title || url,
        content: currentExtractedData?.content || "",
        image: currentExtractedData?.ogImage || null,
        domain: currentExtractedData?.domain || "web",
        channel: inputChannelUrl.value.trim() || "Công Nghệ 24h",
        voiceId: selectVoiceUrl.value,
        voiceProvider: "edge-tts",
      };

      await launchPipeline(payload);
    } catch (err) {
      showToast(`Lỗi: ${err.message}`);
    } finally {
      btnSubmitUrl.disabled = false;
      btnSubmitUrl.innerHTML = oldBtnText;
    }
  });

  // ── Start Pipeline From Custom Text ──────────────────────────────────────
  btnSubmitText.addEventListener("click", async () => {
    const title = inputTextTitle.value.trim();
    const content = inputTextBody.value.trim();

    if (!title) {
      showToast("Vui lòng nhập tiêu đề bản tin");
      inputTextTitle.focus();
      return;
    }
    if (!content) {
      showToast("Vui lòng nhập nội dung chi tiết");
      inputTextBody.focus();
      return;
    }

    const payload = {
      title,
      content,
      channel: inputChannelText.value.trim() || "Tin Tức AI 24h",
      voiceId: selectVoiceText.value,
      voiceProvider: "edge-tts",
    };

    await launchPipeline(payload);
  });

  // ── Load Sample Script ───────────────────────────────────────────────────
  btnLoadSampleScript.addEventListener("click", () => {
    const sample = {
      version: "1.0",
      metadata: {
        title: "Apple ra mắt chip AI thế hệ mới",
        source: { url: "local", domain: "apple.com", image: null },
        channel: "Công Nghệ 24h",
      },
      voice: { provider: "edge-tts", voiceId: "vi-VN-NamMinhNeural", speed: 1.0 },
      scenes: [
        {
          id: "hook",
          type: "hook",
          voiceText: "Apple vừa chính thức công bố dòng chip ây ai thế hệ mới với hiệu năng cực khủng!",
          templateData: { template: "hook", headline: "Apple Chip M5 AI", subhead: "Hiệu năng cực khủng!", kenBurns: "zoom-in" },
        },
        {
          id: "body-1",
          type: "body",
          voiceText: "Sức mạnh xử lý tác vụ trí tuệ nhân tạo tăng gấp đôi so với thế hệ tiền nhiệm.",
          templateData: { template: "stat-hero", value: "2X", label: "Tốc Độ AI", context: "Gấp đôi thế hệ tiền nhiệm" },
        },
        {
          id: "body-2",
          type: "body",
          voiceText: "Tiết kiệm ba mươi phần trăm điện năng, hỗ trợ chạy mô hình ngôn ngữ lớn ngay trên thiết bị.",
          templateData: {
            template: "feature-list",
            title: "Ưu Điểm Nổi Bật",
            bullets: ["Tiết kiệm 30% pin", "Chạy LLM offline", "Bảo mật tuyệt đối"],
            icon: "spark",
          },
        },
        {
          id: "body-3",
          type: "body",
          voiceText: "Sản phẩm dự kiến sẽ được tích hợp trên các dòng máy cao cấp vào cuối năm nay.",
          templateData: { template: "callout", statement: "Tích hợp trên các dòng máy cao cấp cuối năm nay.", tag: "Thời Điểm" },
        },
        {
          id: "outro",
          type: "outro",
          voiceText: "Theo dõi Công Nghệ 24h để xem bản tin mới mỗi ngày.",
          templateData: { template: "outro", ctaTop: "Xem bản tin mới mỗi ngày", channelName: "Công Nghệ 24h", source: "Nguồn: apple.com" },
        },
      ],
    };
    inputScriptJson.value = JSON.stringify(sample, null, 2);
    showToast("Đã nạp kịch bản mẫu vào trình soạn thảo!");
  });

  // ── Start Pipeline From Custom Script ────────────────────────────────────
  btnSubmitCustomScript.addEventListener("click", async () => {
    const raw = inputScriptJson.value.trim();
    if (!raw) {
      showToast("Vui lòng nhập nội dung JSON hoặc bấm 'Nạp Kịch Bản Mẫu'");
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      await launchPipeline({ script: parsed });
    } catch (err) {
      showToast(`Lỗi cú pháp JSON: ${err.message}`);
    }
  });

  // ── Launch Pipeline Core Function ────────────────────────────────────────
  async function launchPipeline(payload) {
    openProgressModal();

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể khởi động render video");

      currentActiveJob = data;
      progressJobId.textContent = data.slug;
      listenToJobProgress(data.jobId);
    } catch (err) {
      updateProgressStep(0, 8, `Lỗi: ${err.message}`, true);
      addLogLine(`[LỖI] ${err.message}`);
      showToast(`Không thể tạo video: ${err.message}`);
    }
  }

  // ── SSE Progress Listener ────────────────────────────────────────────────
  function listenToJobProgress(jobId) {
    if (activeEventSource) {
      activeEventSource.close();
    }

    activeEventSource = new EventSource(`/api/progress/${jobId}`);

    activeEventSource.addEventListener("initial", (e) => {
      const d = JSON.parse(e.data);
      if (d.logs && d.logs.length) {
        logsConsole.innerHTML = "";
        d.logs.forEach(addLogLine);
      }
      if (d.step) updateProgressStep(d.step, d.totalSteps || 8, d.stepMessage || "");
      if (d.status === "completed") handleJobSuccess(d);
    });

    activeEventSource.addEventListener("progress", (e) => {
      const d = JSON.parse(e.data);
      updateProgressStep(d.step, d.totalSteps, d.stepMessage);
      if (d.log) addLogLine(d.log);
    });

    activeEventSource.addEventListener("completed", (e) => {
      const d = JSON.parse(e.data);
      handleJobSuccess(d);
      activeEventSource.close();
    });

    activeEventSource.addEventListener("failed", (e) => {
      const d = JSON.parse(e.data);
      updateProgressStep(0, 8, `Render thất bại: ${d.error}`, true);
      addLogLine(`[LỖI THẤT BẠI] ${d.error}`);
      activeEventSource.close();
    });

    activeEventSource.onerror = () => {
      // Stream closed or error
    };
  }

  function handleJobSuccess(data) {
    updateProgressStep(8, 8, "Hoàn tất! Video đã sẵn sàng xem.");
    progressModalTitle.textContent = "🎉 Video Đã Render Thành Công!";
    modalFooter.style.display = "flex";
    showToast("🎉 Video ngắn của bạn đã tạo thành công!");
    fetchVideoList();

    btnViewResultVideo.onclick = () => {
      closeProgressModal();
      openPlayerModal({
        slug: currentActiveJob?.slug,
        title: currentActiveJob?.title || currentActiveJob?.slug,
        videoUrl: data.videoUrl,
        caption: data.caption,
      });
    };
  }

  // ── Progress UI Helpers ──────────────────────────────────────────────────
  function openProgressModal() {
    progressModal.style.display = "flex";
    modalFooter.style.display = "none";
    progressModalTitle.textContent = "Đang Tạo Video...";
    progressPercent.textContent = "10%";
    progressBarFill.style.width = "10%";
    logsConsole.innerHTML = '<div class="log-line text-muted">Đang khởi tạo các tiến trình...</div>';

    // Reset checklist
    document.querySelectorAll(".step-row").forEach((row) => {
      row.classList.remove("active", "completed");
    });
  }

  function closeProgressModal() {
    progressModal.style.display = "none";
  }

  btnCloseProgressModal.addEventListener("click", closeProgressModal);

  function updateProgressStep(step, total, msg, isError = false) {
    if (isError) {
      progressStepText.textContent = msg;
      progressStepText.style.color = "#f87171";
      return;
    }

    const pct = Math.min(100, Math.round((step / total) * 100));
    progressPercent.textContent = `${pct}%`;
    progressBarFill.style.width = `${pct}%`;
    progressStepText.textContent = `Bước ${step}/${total}: ${msg}`;
    progressStepText.style.color = "#c7d2fe";

    // Update checklist UI
    document.querySelectorAll(".step-row").forEach((row) => {
      const rowStep = parseInt(row.dataset.step, 10);
      if (rowStep < step) {
        row.classList.remove("active");
        row.classList.add("completed");
      } else if (rowStep === step) {
        row.classList.remove("completed");
        row.classList.add("active");
      } else {
        row.classList.remove("active", "completed");
      }
    });
  }

  function addLogLine(text) {
    const div = document.createElement("div");
    div.className = "log-line";
    div.textContent = text;
    logsConsole.appendChild(div);
    logsConsole.scrollTop = logsConsole.scrollHeight;
  }

  logsToggle.addEventListener("click", () => {
    logsConsole.style.display = logsConsole.style.display === "none" ? "block" : "none";
  });

  // ── Video Library ────────────────────────────────────────────────────────
  async function fetchVideoList() {
    try {
      const res = await fetch("/api/videos");
      const list = await res.json();
      renderVideoGrid(list);
    } catch (err) {
      console.error("Failed to fetch videos", err);
    }
  }

  function renderVideoGrid(videos) {
    videoCountBadge.textContent = `${videos.length} Video`;

    if (!videos || videos.length === 0) {
      videoGrid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🎬</span>
          <p>Chưa có video nào trong thư mục output. Hãy tạo video đầu tiên của bạn ở trên!</p>
        </div>
      `;
      return;
    }

    videoGrid.innerHTML = "";
    videos.forEach((vid) => {
      const card = document.createElement("div");
      card.className = "video-card glass-card";

      const hasMp4 = vid.hasVideo && vid.videoUrl;

      card.innerHTML = `
        <div class="video-thumb-container" data-slug="${vid.slug}">
          ${hasMp4 ? `
            <video class="video-preview-player" src="${vid.videoUrl}#t=0.5" preload="metadata" muted playsinline></video>
            <div class="video-play-overlay">
              <div class="play-icon-circle">▶</div>
            </div>
            <div class="video-badge-duration">${vid.videoSizeMb}MB</div>
          ` : `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:0.85rem;">
              Chưa có video MP4
            </div>
          `}
        </div>
        <div class="video-card-body">
          <h4 class="video-card-title">${escapeHtml(vid.title)}</h4>
          <div class="video-card-meta">
            ${new Date(vid.mtime).toLocaleDateString("vi-VN")} · ${vid.sceneCount} cảnh
          </div>
          <div class="video-card-actions">
            ${hasMp4 ? `
              <button class="btn btn-sm btn-primary btn-play-card" style="flex:1;">
                <span>Phát Video</span>
              </button>
            ` : ""}
            <button class="btn btn-sm btn-outline btn-delete-card" title="Xóa video này">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      `;

      // Event listeners for card
      const thumb = card.querySelector(".video-thumb-container");
      const playBtn = card.querySelector(".btn-play-card");
      const deleteBtn = card.querySelector(".btn-delete-card");

      const handleOpen = () => openPlayerModal(vid);

      if (thumb && hasMp4) thumb.addEventListener("click", handleOpen);
      if (playBtn) playBtn.addEventListener("click", handleOpen);

      if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm(`Bạn có chắc muốn xoá video "${vid.title}" không?`)) {
            try {
              await fetch(`/api/videos/${vid.slug}`, { method: "DELETE" });
              showToast("Đã xoá video thành công");
              fetchVideoList();
            } catch (err) {
              showToast("Không thể xoá video");
            }
          }
        });
      }

      videoGrid.appendChild(card);
    });
  }

  btnRefreshVideos.addEventListener("click", () => {
    fetchVideoList();
    showToast("Đã cập nhật danh sách video");
  });

  // ── Video Player Modal ───────────────────────────────────────────────────
  function openPlayerModal(vid) {
    playerModalTitle.textContent = vid.title || "Xem Video";
    playerVideoTitle.textContent = vid.title || "Video thành phẩm";
    playerVideoMeta.textContent = `${vid.videoSizeMb ? `${vid.videoSizeMb} MB · ` : ""}Độ phân giải dọc 1080x1920 (9:16)`;

    const mp4Url = vid.videoUrl || `/api/videos/${vid.slug}/file/video.mp4`;
    const mp3Url = vid.audioUrl || `/api/videos/${vid.slug}/file/voice.mp3`;

    activeVideoPlayer.src = mp4Url;
    activeVideoPlayer.play().catch(() => {});

    btnDownloadMp4.href = mp4Url;
    btnDownloadMp4.download = `${vid.slug}.mp4`;

    btnDownloadMp3.href = mp3Url;
    btnDownloadMp3.download = `${vid.slug}-voice.mp3`;

    playerCaptionBox.textContent = vid.caption || `${vid.title}\n\n#congnghe #thuthuat #cuongit #xuhuong`;

    btnCopyCaption.onclick = () => {
      navigator.clipboard.writeText(playerCaptionBox.textContent).then(() => {
        showToast("Đã sao chép caption TikTok vào clipboard!");
      });
    };

    btnOpenInStudio.onclick = () => {
      window.open("http://localhost:3002", "_blank");
    };

    playerModal.style.display = "flex";
  }

  function closePlayerModal() {
    activeVideoPlayer.pause();
    activeVideoPlayer.src = "";
    playerModal.style.display = "none";
  }

  btnClosePlayerModal.addEventListener("click", closePlayerModal);
  playerModal.addEventListener("click", (e) => {
    if (e.target === playerModal) closePlayerModal();
  });

  btnOpenStudioPreview.addEventListener("click", () => {
    window.open("http://localhost:3002", "_blank");
  });

  // Escape HTML helper
  function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // Initial Fetch
  fetchVideoList();
});
