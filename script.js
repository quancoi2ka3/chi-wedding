const weddingConfig = {
  couple: "Nguyễn Mạnh Quân & Phạm Lan Chi",
  eventDate: "2026-05-11T17:30:00+07:00",
  venue: "Nhà hàng Minh Cường, Km10, Quốc Lộ 3, Cầu Đôi, Uy Nỗ, Đông Anh, Hà Nội",
  musicUrl: "assets/music/My Love.mp3",
  rsvpWebhookUrl: ""
};

const keys = {
  wishes: "wedding_wishes_v1",
  rsvps: "wedding_rsvps_v1"
};

const byId = (id) => document.getElementById(id);
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const prefersReducedData = Boolean(navigator.connection && navigator.connection.saveData);

const toast = byId("toast");
const bgMusic = byId("bgMusic");
const musicFab = byId("musicFab");
let autoScrollTimer = null;
let autoScrollRunning = false;

// Keep toast inside an open dialog so it stays above modal overlays.
function syncToastHost() {
  if (!toast) {
    return;
  }

  const openDialog = document.querySelector("dialog[open]");
  const host = openDialog || document.body;
  if (toast.parentElement !== host) {
    host.appendChild(toast);
  }
}

function notify(message) {
  if (!toast) {
    return;
  }

  syncToastHost();
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2500);
}

function safeRun(taskName, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`[init] ${taskName} failed`, error);
  }
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function setTextById(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent = value;
  }
}

function fallbackCopyText(value) {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.top = "0";
  input.style.left = "0";
  input.style.opacity = "0";

  document.body.appendChild(input);
  input.focus();
  input.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  input.remove();
  return copied;
}

function updateCountdown() {
  const eventTime = new Date(weddingConfig.eventDate).getTime();
  const now = Date.now();
  const distance = eventTime - now;

  if (distance <= 0) {
    setTextById("days", "00");
    setTextById("hours", "00");
    setTextById("minutes", "00");
    setTextById("seconds", "00");
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  setTextById("days", pad(days));
  setTextById("hours", pad(hours));
  setTextById("minutes", pad(minutes));
  setTextById("seconds", pad(seconds));
}

function setupReveal() {
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  if (!revealItems.length) {
    return;
  }

  // Activate animation mode only after JS setup starts.
  if (!prefersReducedMotion) {
    document.body.classList.add("js-ready");
  }

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("show"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((el) => observer.observe(el));

  // Safety net: if observer misses any node, reveal all after first paint window.
  window.setTimeout(() => {
    revealItems.forEach((el) => el.classList.add("show"));
  }, 1600);
}

function smoothJumpToRSVP() {
  const rsvpSection = byId("rsvp");
  const rsvpForm = byId("rsvpForm");
  const target = rsvpForm || rsvpSection;
  if (!target) {
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  if (rsvpForm) {
    const firstField = rsvpForm.querySelector("input, select, textarea");
    if (firstField) {
      firstField.focus();
    }
  }
}

function loadStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function renderWishes() {
  const wishList = byId("wishList");
  const wishes = loadStorage(keys.wishes).reverse();

  if (!wishes.length) {
    wishList.innerHTML = "<article><h4>Chưa có lời chúc nào</h4><p>Hãy là người đầu tiên gửi lời chúc đến cô dâu chú rể.</p></article>";
    return;
  }

  wishList.innerHTML = wishes
    .map(
      (wish) =>
        `<article><h4>${escapeHTML(wish.author)}</h4><p>${escapeHTML(wish.content)}</p></article>`
    )
    .join("");
}

function escapeHTML(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setupWishForm() {
  const form = byId("wishForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);

    const wish = {
      author: String(data.get("author") || "").trim(),
      content: String(data.get("content") || "").trim(),
      createdAt: new Date().toISOString()
    };

    if (!wish.author || !wish.content) {
      notify("Vui lòng nhập đầy đủ thông tin lời chúc.");
      return;
    }

    const wishes = loadStorage(keys.wishes);
    wishes.push(wish);
    saveStorage(keys.wishes, wishes);
    renderWishes();
    form.reset();
    notify("Đã gửi lời chúc thành công.");
  });
}

async function submitRSVPToWebhook(payload) {
  if (!weddingConfig.rsvpWebhookUrl) {
    return;
  }

  try {
    await fetch(weddingConfig.rsvpWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    notify("Đã lưu RSVP trên trình duyệt, webhook hiện chưa phản hồi.");
  }
}

async function submitRSVPToNetlify(form) {
  const formName = form.getAttribute("name");
  if (!formName) {
    return false;
  }

  const formData = new FormData(form);
  if (!formData.has("form-name")) {
    formData.append("form-name", formName);
  }

  try {
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString()
    });
    return true;
  } catch {
    return false;
  }
}

function setupRSVPForm() {
  const form = byId("rsvpForm");
  if (!form) {
    return;
  }

  form.addEventListener("focusin", () => {
    if (autoScrollRunning) {
      stopAutoScroll();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      attendance: String(data.get("attendance") || ""),
      guests: Number(data.get("guests") || 1),
      message: String(data.get("message") || "").trim(),
      createdAt: new Date().toISOString()
    };

    if (!payload.name || !payload.phone || !payload.attendance) {
      notify("Vui lòng nhập đủ thông tin RSVP.");
      return;
    }

    const rsvps = loadStorage(keys.rsvps);
    rsvps.push(payload);
    saveStorage(keys.rsvps, rsvps);

    const netlifyOk = await submitRSVPToNetlify(form);
    await submitRSVPToWebhook(payload);
    form.reset();
    if (netlifyOk) {
      notify("RSVP đã được ghi nhận. Cảm ơn bạn!");
    } else {
      notify("Đã lưu RSVP trên trình duyệt, nhưng email chưa gửi được.");
    }
  });
}

function setupRsvpJumpButtons() {
  ["jumpRsvpBtn", "heroRsvpBtn"].forEach((id) => {
    const element = byId(id);
    if (!element) {
      return;
    }

    element.addEventListener("click", (event) => {
      if (element.tagName === "A") {
        event.preventDefault();
      }
      smoothJumpToRSVP();
    });
  });
}

function setupMaps() {
  document.querySelectorAll(".map-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.getAttribute("data-map");
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
  });
}

function setupFavicon() {
  const svgHref = "assets/images/decor/wedding-logo.svg?v=2";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const upsertLink = (rel, type, sizes, href) => {
    const selector = `link[rel="${rel}"]${type ? `[type="${type}"]` : ""}${sizes ? `[sizes="${sizes}"]` : ""}`;
    let link = document.querySelector(selector);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      if (type) {
        link.type = type;
      }
      if (sizes) {
        link.sizes = sizes;
      }
      document.head.appendChild(link);
    }
    link.href = href;
  };

  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    const renderPng = (size) => {
      canvas.width = size;
      canvas.height = size;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      return canvas.toDataURL("image/png");
    };

    const png32 = renderPng(32);
    const png180 = renderPng(180);
    const png192 = renderPng(192);

    upsertLink("icon", "image/png", "32x32", png32);
    upsertLink("icon", "image/png", "192x192", png192);
    upsertLink("apple-touch-icon", "", "180x180", png180);
  };
  img.onerror = () => {
    // Keep the SVG favicon if conversion fails.
  };
  img.src = svgHref;
}

function setupGalleryLightbox() {
  const gallery = byId("galleryGrid");
  const lightbox = byId("lightbox");
  const lightboxImage = byId("lightboxImage");
  const lightboxThumbs = byId("lightboxThumbs");
  const lightboxPrev = byId("lightboxPrev");
  const lightboxNext = byId("lightboxNext");
  const lightboxCount = byId("lightboxCount");
  const closeLightbox = byId("closeLightbox");

  if (!gallery || !lightbox || !lightboxImage) {
    return;
  }

  lightboxImage.decoding = "async";
  lightboxImage.loading = "eager";

  const setLightboxState = (isOpen) => {
    document.body.classList.toggle("lightbox-open", isOpen);
    if (isOpen) {
      lockScroll();
      if (autoScrollRunning) {
        stopAutoScroll();
      }
    } else {
      unlockScroll();
    }
  };

  const rawList = gallery.getAttribute("data-gallery") || "";
  const images = rawList
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const gridImages = Array.from(gallery.querySelectorAll("img"));
  const gridItems = Array.from(gallery.querySelectorAll(".gallery-item"));
  if (!images.length) {
    gridImages.forEach((img) => images.push(img.getAttribute("src") || ""));
  }

  const updateMoreBadge = () => {
    const moreBadge = byId("galleryMore");
    if (!moreBadge) {
      return;
    }
    const extra = Math.max(0, images.length - 4);
    if (extra > 0) {
      moreBadge.textContent = `+${extra}`;
      moreBadge.style.display = "flex";
    } else {
      moreBadge.textContent = "";
      moreBadge.style.display = "none";
    }
  };

  updateMoreBadge();

  const previewCount = gridItems.length;
  const firstHiddenIndex = Math.max(0, Math.min(images.length - 1, previewCount));

  let currentIndex = 0;
  let preloadToken = 0;
  let warmCacheDone = false;
  let savedScrollY = 0;
  let scrollLocked = false;
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const lowEndDevice =
    (deviceMemory && deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const preloadCache = new Map();

  function lockScroll() {
    if (scrollLocked) {
      return;
    }
    scrollLocked = true;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockScroll() {
    if (!scrollLocked) {
      return;
    }
    scrollLocked = false;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY, left: 0, behavior: "auto" });
    });
  }

  const preloadImage = (src) => {
    if (!src) {
      return null;
    }
    const cached = preloadCache.get(src);
    if (cached) {
      return cached;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    preloadCache.set(src, img);
    return img;
  };

  const schedulePreload = (index) => {
    if (prefersReducedData || !images.length) {
      return;
    }
    const run = () => {
      preloadImage(images[index + 1]);
      if (!lowEndDevice) {
        preloadImage(images[index - 1]);
      }
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 1200 });
    } else {
      window.setTimeout(run, 160);
    }
  };

  const warmCache = () => {
    if (warmCacheDone || prefersReducedData || !images.length) {
      return;
    }
    warmCacheDone = true;
    const maxWarm = Math.min(images.length, lowEndDevice ? 4 : 10);
    let index = 0;

    const step = () => {
      if (index >= maxWarm) {
        return;
      }
      preloadImage(images[index]);
      index += 1;
      window.setTimeout(step, 120);
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(step, { timeout: 1400 });
    } else {
      step();
    }
  };

  const prefetchFirstHidden = () => {
    if (prefersReducedData || !images.length) {
      return;
    }
    const target = Math.max(0, Math.min(images.length - 1, firstHiddenIndex));
    preloadImage(images[target]);
    preloadImage(images[target + 1]);
  };

  if ("IntersectionObserver" in window) {
    const galleryObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          prefetchFirstHidden();
          galleryObserver.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    galleryObserver.observe(gallery);
  } else {
    prefetchFirstHidden();
  }

  const updateLightbox = (index) => {
    if (!images.length) {
      return;
    }
    currentIndex = Math.max(0, Math.min(images.length - 1, index));
    const nextSrc = images[currentIndex];
    const token = (preloadToken += 1);

    lightboxImage.classList.add("is-loading");

    const preloader = preloadImage(nextSrc);

    const finalizeSwap = () => {
      if (token !== preloadToken) {
        return;
      }
      if (lightboxImage.src !== nextSrc) {
        lightboxImage.src = nextSrc;
      }
      lightboxImage.classList.remove("is-loading");
    };

    if (preloader && preloader.complete && preloader.naturalWidth) {
      finalizeSwap();
    } else if (preloader && typeof preloader.decode === "function") {
      preloader.decode().then(finalizeSwap).catch(finalizeSwap);
    } else if (preloader) {
      preloader.onload = finalizeSwap;
      preloader.onerror = finalizeSwap;
    } else {
      finalizeSwap();
    }
    if (lightboxCount) {
      lightboxCount.textContent = `${currentIndex + 1} / ${images.length}`;
    }
    if (lightboxPrev) {
      lightboxPrev.disabled = currentIndex === 0;
    }
    if (lightboxNext) {
      lightboxNext.disabled = currentIndex >= images.length - 1;
    }
    if (lightboxThumbs) {
      lightboxThumbs.querySelectorAll(".lightbox-thumb").forEach((thumb) => {
        thumb.classList.toggle(
          "is-active",
          Number(thumb.getAttribute("data-index")) === currentIndex
        );
      });
      // center the active thumbnail in the thumbnail strip
      const active = lightboxThumbs.querySelector(".lightbox-thumb.is-active");
      if (active) {
        // use a small timeout to ensure layout is stable (works for dialog rendering)
        window.setTimeout(() => {
          try {
            active.scrollIntoView({
              behavior: lowEndDevice || prefersReducedMotion ? "auto" : "smooth",
              inline: "center",
              block: "nearest"
            });
          } catch (e) {
            // fallback: adjust scrollLeft to center manually
            const container = lightboxThumbs;
            const cRect = container.getBoundingClientRect();
            const aRect = active.getBoundingClientRect();
            const offset = aRect.left - cRect.left - (cRect.width / 2) + (aRect.width / 2);
            container.scrollBy({
              left: offset,
              behavior: lowEndDevice || prefersReducedMotion ? "auto" : "smooth"
            });
          }
        }, 60);
      }
    }

    schedulePreload(currentIndex);
  };

  const openLightbox = (index) => {
    if (!images.length) {
      return;
    }
    setLightboxState(true);
    // show dialog first so scrollIntoView can calculate positions, then update
    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
    updateLightbox(index);
    warmCache();
  };

  const closeLightboxDialog = () => {
    if (typeof lightbox.close === "function") {
      lightbox.close();
    } else {
      lightbox.removeAttribute("open");
      setLightboxState(false);
    }
  };

  if (lightboxThumbs) {
    lightboxThumbs.innerHTML = images
      .map(
        (src, index) =>
          `<img class="lightbox-thumb" data-index="${index}" src="${src}" alt="Ảnh ${index + 1}" loading="lazy" decoding="async">`
      )
      .join("");

    lightboxThumbs.querySelectorAll(".lightbox-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const index = Number(thumb.getAttribute("data-index") || "0");
        updateLightbox(index);
      });
    });
  }

  gridItems.forEach((item) => {
    item.addEventListener("click", () => {
      const index = Number(item.getAttribute("data-index") || "0");
      const isMoreTile = item.classList.contains("gallery-item-more");
      const targetIndex =
        isMoreTile && images.length > previewCount ? firstHiddenIndex : index;
      openLightbox(targetIndex);
    });
  });

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => updateLightbox(currentIndex - 1));
  }

  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => updateLightbox(currentIndex + 1));
  }

  if (closeLightbox) {
    closeLightbox.addEventListener("click", closeLightboxDialog);
  }

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightboxDialog();
    }
  });

  lightbox.addEventListener("close", () => {
    setLightboxState(false);
  });
}

function setupCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy") || "";
      if (!value) {
        return;
      }
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
        } else if (!fallbackCopyText(value)) {
          throw new Error("clipboard_unavailable");
        }
        notify("Đã sao chép số tài khoản.");
      } catch {
        notify("Không thể sao chép tự động. Vui lòng sao chép thủ công.");
      }
    });
  });
}

function setupGiftEnvelope() {
  const envelopeBtn = byId("lixiEnvelopeBtn");
  const popup = byId("giftPopup");
  const closePopupBtn = byId("closeGiftPopup");
  const confettiLayer = byId("giftConfetti");
  const hintText = document.querySelector(".gift-envelope-hint");
  const caption = document.querySelector(".gift-envelope-caption");

  if (!envelopeBtn || !popup || !confettiLayer) {
    return;
  }

  const burstConfetti = (count) => {
    const colors = ["#f4d35e", "#ee964b", "#f95738", "#6a994e", "#ffffff", "#9c6644"];

    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement("span");
      piece.className = "gift-confetti";
      const tx = Math.random() * 320 - 160;
      const ty = -(Math.random() * 170 + 40);
      const rot = Math.random() * 780 - 390;

      piece.style.setProperty("--tx", `${tx}px`);
      piece.style.setProperty("--ty", `${ty}px`);
      piece.style.setProperty("--rot", `${rot}deg`);
      piece.style.setProperty("--confetti-color", colors[Math.floor(Math.random() * colors.length)]);
      piece.style.animationDelay = `${Math.random() * 0.08}s`;

      confettiLayer.appendChild(piece);
      window.setTimeout(() => piece.remove(), 1500);
    }
  };

  const burstSparks = (count) => {
    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement("span");
      spark.className = "gift-spark";
      const sx = Math.random() * 220 - 110;
      const sy = -(Math.random() * 120 + 10);
      spark.style.setProperty("--sx", `${sx}px`);
      spark.style.setProperty("--sy", `${sy}px`);
      spark.style.animationDelay = `${Math.random() * 0.07}s`;
      confettiLayer.appendChild(spark);
      window.setTimeout(() => spark.remove(), 900);
    }
  };

  const isPopupOpen = () => popup.open || popup.hasAttribute("open");

  const openPopup = () => {
    if (typeof popup.showModal === "function") {
      popup.showModal();
      return;
    }

    popup.setAttribute("open", "");
  };

  const wobbleTimer = window.setTimeout(() => {
    if (isPopupOpen()) {
      return;
    }

    envelopeBtn.classList.add("is-wobbling");
  }, 2000);

  const closePopup = () => {
    if (!isPopupOpen()) {
      return;
    }

    if (typeof popup.close === "function" && popup.open) {
      popup.close();
    } else {
      popup.removeAttribute("open");
    }

    envelopeBtn.setAttribute("aria-expanded", "false");
    syncToastHost();
  };

  const openGift = () => {
    window.clearTimeout(wobbleTimer);
    envelopeBtn.classList.remove("is-wobbling");

    const firstOpen = !isPopupOpen();
    if (firstOpen) {
      openPopup();

      envelopeBtn.classList.add("is-opened");
      envelopeBtn.setAttribute("aria-expanded", "true");
      if (hintText) {
        hintText.textContent = "Nhấn để mở lại";
      }
      if (caption) {
        caption.classList.add("is-reopen");
      }
      notify("Phong bao đã mở, mời bạn quét mã QR để gửi quà mừng cưới.");
    }

    burstConfetti(prefersReducedMotion ? 14 : firstOpen ? 56 : 32);
    burstSparks(prefersReducedMotion ? 6 : firstOpen ? 20 : 10);
  };

  envelopeBtn.addEventListener("click", openGift);

  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", closePopup);
  }

  popup.addEventListener("click", (event) => {
    if (event.target === popup) {
      closePopup();
    }
  });

  popup.addEventListener("close", () => {
    envelopeBtn.setAttribute("aria-expanded", "false");
    syncToastHost();
  });
}

function setupShareButton() {
  const shareBtn = byId("shareBtn");
  if (!shareBtn) {
    return;
  }

  shareBtn.addEventListener("click", async () => {
    const shareData = {
      title: `Thiệp cưới ${weddingConfig.couple}`,
      text: "Mời bạn tham dự ngày cưới của chúng mình.",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        notify("Đã mở bảng chia sẻ.");
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href);
      } else if (!fallbackCopyText(window.location.href)) {
        throw new Error("share_fallback_copy_failed");
      }

      notify("Đã sao chép link thiệp cưới.");
    } catch {
      notify("Chưa thể chia sẻ lúc này.");
    }
  });
}

function setupCalendarButton() {
  const calendarBtn = byId("calendarBtn");
  if (!calendarBtn) {
    return;
  }

  calendarBtn.addEventListener("click", () => {
    const startDate = new Date(weddingConfig.eventDate);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    const format = (date) =>
      date.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", `Lễ cưới ${weddingConfig.couple}`);
    url.searchParams.set("details", "Trân trọng mời bạn đến chung vui cùng gia đình.");
    url.searchParams.set("location", weddingConfig.venue);
    url.searchParams.set("dates", `${format(startDate)}/${format(endDate)}`);

    window.open(url.toString(), "_blank", "noopener,noreferrer");
  });
}

function setupMusic() {
  const musicToggle = byId("musicToggle");
  if (!musicToggle || !bgMusic) {
    return;
  }

  if (weddingConfig.musicUrl) {
    bgMusic.src = weddingConfig.musicUrl;
    bgMusic.volume = 0.5;
  } else {
    musicToggle.disabled = true;
    musicToggle.textContent = "Chưa có nhạc";
    if (musicFab) {
      musicFab.disabled = true;
    }
  }

  const syncMusicUI = () => {
    const isPlaying = !bgMusic.paused;
    musicToggle.textContent = isPlaying ? "Tắt nhạc" : "Bật nhạc";
    if (musicFab) {
      musicFab.classList.toggle("playing", isPlaying);
      const musicFabText = musicFab.querySelector(".music-fab-text");
      if (musicFabText) {
        musicFabText.textContent = isPlaying ? "Đang phát" : "Nhạc";
      }
    }
  };

  const toggleMusic = async () => {
    if (!bgMusic.src) {
      return;
    }

    try {
      if (bgMusic.paused) {
        await bgMusic.play();
      } else {
        bgMusic.pause();
      }
      syncMusicUI();
    } catch {
      notify("Trình duyệt cần thao tác người dùng để bật nhạc.");
    }
  };

  const tryAutoplay = async () => {
    if (!bgMusic.src) {
      return;
    }

    try {
      await bgMusic.play();
      syncMusicUI();
    } catch {
      syncMusicUI();
    }
  };

  window.setTimeout(() => {
    void tryAutoplay();
  }, 200);

  const resumeOnInteraction = () => {
    if (bgMusic.src && bgMusic.paused) {
      void tryAutoplay();
    }
  };

  window.addEventListener("pointerdown", resumeOnInteraction, { once: true });
  window.addEventListener("touchstart", resumeOnInteraction, { once: true });

  musicToggle.addEventListener("click", () => {
    void toggleMusic();
  });

  if (musicFab) {
    musicFab.addEventListener("click", () => {
      void toggleMusic();
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && bgMusic.paused) {
      void tryAutoplay();
    }
  });
}

function startAutoScroll() {
  if (autoScrollRunning) {
    return;
  }

  autoScrollRunning = true;
  const autoScrollBtn = byId("autoScrollBtn");
  if (autoScrollBtn) {
    autoScrollBtn.textContent = "Dừng tự động";
  }

  autoScrollTimer = window.setInterval(() => {
    const nearBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 4;
    if (nearBottom) {
      stopAutoScroll();
      notify("Đã xem đến cuối thiệp.");
      return;
    }

    window.scrollBy({ top: 0.75, left: 0, behavior: "auto" });
  }, 40);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    window.clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }
  autoScrollRunning = false;
  const autoScrollBtn = byId("autoScrollBtn");
  if (autoScrollBtn) {
    autoScrollBtn.textContent = "Tự động xem";
  }
}

function setupAutoScroll() {
  const button = byId("autoScrollBtn");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    if (autoScrollRunning) {
      stopAutoScroll();
      return;
    }
    startAutoScroll();
  });

  ["wheel", "touchstart", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      if (autoScrollRunning) {
        stopAutoScroll();
      }
    });
  });
}

function burstPetals(total) {
  const layer = byId("petalLayer");
  if (!layer || document.body.classList.contains("lightbox-open")) {
    return;
  }

  for (let i = 0; i < total; i += 1) {
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.setProperty("--drift", `${Math.random() * 160 - 80}px`);
    petal.style.animationDuration = `${7 + Math.random() * 7}s`;
    petal.style.animationDelay = `${Math.random() * 1.6}s`;
    petal.style.opacity = `${0.55 + Math.random() * 0.25}`;
    petal.style.width = `${9 + Math.random() * 8}px`;
    petal.style.height = petal.style.width;

    layer.appendChild(petal);
    window.setTimeout(() => petal.remove(), 12000);
  }
}

function setupFallingPetals() {
  if (prefersReducedMotion || prefersReducedData) {
    burstPetals(8);
    return;
  }

  burstPetals(16);
  window.setInterval(() => burstPetals(4), 3200);
}

function setupOpeningScreen() {
  const opening = byId("openingScreen");
  const openBtn = byId("openInviteBtn");
  if (!opening || !openBtn) {
    document.body.classList.remove("locked");
    return;
  }

  if (!prefersReducedMotion) {
    document.body.classList.add("motion-safe");
  }

  document.body.classList.add("locked");

  openBtn.addEventListener("click", async () => {
    if (opening.classList.contains("leaving")) {
      return;
    }

    opening.classList.add("leaving");
    openBtn.disabled = true;
    await new Promise((resolve) => {
      window.setTimeout(resolve, 700);
    });

    opening.classList.add("hidden");
    document.body.classList.remove("locked");
    burstPetals(38);
    notify("Chào mừng bạn đến với thiệp cưới của tụi mình! Hãy cuộn xuống để xem chi tiết và gửi lời chúc nhé.");

    if (weddingConfig.musicUrl) {
      try {
        await bgMusic.play();
        setTextById("musicToggle", "Tắt nhạc");
      } catch {
        notify("Nhấn nút Bật nhạc nếu trình duyệt chặn tự phát.");
      }
    }

    window.setTimeout(() => {
      if (!autoScrollRunning) {
        startAutoScroll();
      }
    }, 1200);
  });
}

function init() {
  safeRun("setupOpeningScreen", setupOpeningScreen);
  safeRun("setupFallingPetals", setupFallingPetals);
  safeRun("updateCountdown", updateCountdown);
  window.setInterval(() => safeRun("updateCountdown", updateCountdown), 1000);
  safeRun("setupReveal", setupReveal);
  safeRun("setupWishForm", setupWishForm);
  safeRun("setupRSVPForm", setupRSVPForm);
  safeRun("setupRsvpJumpButtons", setupRsvpJumpButtons);
  safeRun("setupMaps", setupMaps);
  safeRun("setupFavicon", setupFavicon);
  safeRun("setupGalleryLightbox", setupGalleryLightbox);
  safeRun("setupGiftEnvelope", setupGiftEnvelope);
  safeRun("setupCopyButtons", setupCopyButtons);
  safeRun("setupShareButton", setupShareButton);
  safeRun("setupCalendarButton", setupCalendarButton);
  safeRun("setupMusic", setupMusic);
  safeRun("setupAutoScroll", setupAutoScroll);
  safeRun("renderWishes", renderWishes);
}

document.addEventListener("DOMContentLoaded", init);
