"use strict";

const EXCLUSIVE_GROUPS = [
  { key: "format", datasetKey: "format", label: "Special filters", values: ["character-sheet", "chibi"] },
  { key: "event", datasetKey: "event", label: "Events & Collabs", values: [], dynamic: true },
];

const filterState = {
  exclusive: { group: null, value: null },
  criteria: { style: null, size: null, background: null },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function el(tag, classes = [], attrs = {}) {
  const node = document.createElement(tag);
  if (classes.length) node.classList.add(...classes);

  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }

  return node;
}

const tabButtons = document.querySelectorAll(".tab-btn");
const pages = document.querySelectorAll(".page");

function showPage(pageName, updateHash = true) {
  const targetPage = document.querySelector(`.page[data-page="${pageName}"]`);
  const targetButton = document.querySelector(`.tab-btn[data-page="${pageName}"]`);

  if (!targetPage || !targetButton) return;

  pages.forEach(page => page.classList.remove("active"));
  tabButtons.forEach(button => button.classList.remove("active"));

  targetPage.classList.add("active");
  targetButton.classList.add("active");

  if (updateHash) {
    history.pushState(null, "", `#${pageName}`);
  }
}

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

function loadPageFromHash() {
  const pageName = window.location.hash.slice(1);

  if (pageName) {
    showPage(pageName, false);
  } else {
    showPage("home", false);
  }
}

window.addEventListener("hashchange", loadPageFromHash);

loadPageFromHash();

function applyGalleryFilters() {
  const { exclusive, criteria } = filterState;
  const activeCriteria = Object.entries(criteria).filter(([, value]) => value != null);

  $$(".gallery-item").forEach((card) => {
    let visible;

    if (exclusive.group) {
      const group = EXCLUSIVE_GROUPS.find((g) => g.key === exclusive.group);
      visible = card.dataset[group.datasetKey] === exclusive.value;
    } else if (activeCriteria.length === 0) {
      visible = true;
    } else {
      const isRegular = EXCLUSIVE_GROUPS.every(
        (group) => !group.values.includes(card.dataset[group.datasetKey])
      );
      visible = isRegular && activeCriteria.every(([key, value]) =>
        key === "background" ? card.dataset.background === "true" : card.dataset[key] === value
      );
    }

    card.classList.toggle("is-hidden", !visible);
  });

  syncFilterButtons();
}

function syncFilterButtons() {
  const { exclusive, criteria } = filterState;
  const allActive = !exclusive.group && Object.values(criteria).every((value) => value == null);

  $$(".filter-btn").forEach((btn) => {
    const { filterGroup: group, filterValue: value, exclusiveGroup } = btn.dataset;

    if (group === "all") {
      btn.classList.toggle("active", allActive);
      return;
    }

    if (group === "exclusive") {
      btn.classList.toggle("active", exclusive.group === exclusiveGroup && exclusive.value === value);
      return;
    }

    btn.classList.toggle("active", criteria[group] === value);
  });
}

function setGalleryFilters(next = {}) {
  filterState.exclusive = next.exclusive ?? { group: null, value: null };
  filterState.criteria = {
    style: next.style ?? null,
    size: next.size ?? null,
    background: next.background ?? null,
  };
  applyGalleryFilters();
}

function updateLightboxLayout(aspectRatio) {
  const lightbox = $(".lightbox");
  if (!lightbox) return;

  const dialog = $(".lightbox-dialog", lightbox);
  const copy = $(".lightbox-copy", lightbox);
  if (!dialog || !copy) return;

  const resolvedAspectRatio = aspectRatio
    || Number(lightbox.dataset.aspectRatio)
    || 0.72;

  const viewportWidth = Math.max(320, window.innerWidth - 32);
  const viewportHeight = Math.max(320, window.innerHeight - 40);
  const copyHeight = copy.offsetHeight;
  const verticalChrome = 40 + 18 + copyHeight;
  const mediaHeight = Math.max(220, viewportHeight - verticalChrome);
  const dialogWidth = Math.min(
    viewportWidth,
    Math.max(320, mediaHeight * resolvedAspectRatio + 40),
  );

  lightbox.dataset.aspectRatio = String(resolvedAspectRatio);
  dialog.style.setProperty("--lightbox-dialog-width", `${Math.round(dialogWidth)}px`);
  dialog.style.setProperty("--lightbox-dialog-height", `${Math.round(viewportHeight)}px`);
}

function openLightbox(card) {
  const lightbox = $(".lightbox");
  if (!lightbox) return;

  const thumb = $(".lightbox-thumb", lightbox);
  const imageSrc = card.dataset.image;

  thumb.className = "lightbox-thumb";
  thumb.replaceChildren();
  thumb.style.backgroundImage = "";

  if (imageSrc) {
    const img = document.createElement("img");
    img.src = imageSrc;
    img.alt = card.dataset.title || "";
    img.className = "lightbox-img";

    const applyImageLayout = () => {
      const hasNaturalSize = img.naturalWidth > 0 && img.naturalHeight > 0;
      const ratio = hasNaturalSize ? img.naturalWidth / img.naturalHeight : 0.72;
      updateLightboxLayout(ratio);
    };

    img.addEventListener("error", () => {
      thumb.replaceChildren();
      thumb.classList.add("thumb-a");
      thumb.textContent = "✦";
      updateLightboxLayout(0.72);
    });
    img.addEventListener("load", applyImageLayout);

    thumb.appendChild(img);

    if (img.complete) {
      applyImageLayout();
    }
  } else {
    const art = card.querySelector(".gallery-art");

    if (art) {
      [...art.classList]
        .filter((className) => className !== "gallery-art")
        .forEach((className) => thumb.classList.add(className));
    }

    thumb.textContent = "✦";
  }

  $(".lightbox-title", lightbox).textContent = card.dataset.title || "";
  $(".lightbox-meta", lightbox).textContent = card.dataset.meta || "";

  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => updateLightboxLayout());
}

function closeLightbox() {
  const lightbox = $(".lightbox");
  if (!lightbox) return;

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function openContactPopup() {
  const popup = $(".contact-popup");
  if (!popup) return;

  popup.classList.add("is-open");
  popup.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeContactPopup() {
  const popup = $(".contact-popup");
  if (!popup) return;

  popup.classList.remove("is-open");
  popup.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function buildFeaturesList(features) {
  const list = el("ul", ["comm-features"]);

  features.forEach((entry) => {
    if (typeof entry === "string") {
      const item = document.createElement("li");
      item.textContent = entry;
      list.appendChild(item);
      return;
    }

    const label = document.createElement("li");
    label.textContent = entry.label;
    list.appendChild(label);

    entry.items.forEach((text) => {
      const item = el("li", ["comm-features-sub"]);
      item.textContent = text;
      list.appendChild(item);
    });
  });

  return list;
}

function renderCommission(data) {
  const { cards, extra } = data.commission;
  const grid = $(".commission-grid");

  if (grid) {
    grid.replaceChildren();

    cards.forEach((card) => {
      const button = el("button", ["comm-card", "commission-trigger"], {
        type: "button",
        "data-style": card.style,
        "data-format": card.format,
      });

      const type = el("div", ["comm-type"]);
      type.textContent = card.type;

      const price = el("div", ["comm-price"]);
      price.textContent = card.price;

      const features = el("ul", ["comm-features"]);
      card.features.forEach((text) => {
        const item = document.createElement("li");
        item.textContent = text;
        features.appendChild(item);
      });

      const hint = el("p", ["comm-hint"]);
      hint.textContent = "Click for preview";

      button.append(type, price, features, hint);
      grid.appendChild(button);
    });
  }

  renderCommissionExtra(extra);
}

function renderCommissionExtra(columns) {
  const block = $(".comm-extra");
  if (!block) return;

  block.replaceChildren();

  columns.forEach((column) => {
    const section = el("div", ["comm-info-col"]);
    const type = el("div", ["comm-type"]);
    const price = el("div", ["comm-price"]);

    type.textContent = column.type;
    price.textContent = column.price;

    section.append(type, price, buildFeaturesList(column.features));
    block.appendChild(section);
  });
}

function renderTerms(data) {
  const body = $(".terms-body");
  if (!body) return;

  body.replaceChildren();
  data.terms.sections.forEach((section) => {
    const block = el("div", ["terms-block"]);
    const num = el("div", ["terms-num"]);
    const heading = el("div", ["terms-heading"]);
    const text = el("p", ["terms-text"]);

    num.textContent = section.num;
    heading.textContent = section.heading;
    text.textContent = section.text;
    block.append(num, heading, text);
    body.appendChild(block);
  });
}

function renderGallery(data) {
  const { items } = data.gallery;
  renderGalleryFilters(items);
  renderGalleryGrid(items);
}

const STYLE_ORDER = ["simple-color", "full-render"];
const SIZE_ORDER = ["bust", "half-body", "full-body"];

function sortByOrder(values, order) {
  return [...values].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function renderGalleryFilters(items) {
  const panel = $(".gallery-filter-panel");
  if (!panel) return;

  panel.replaceChildren();

  const styles = sortByOrder([...new Set(items.map((item) => item.style))], STYLE_ORDER);
  const sizes = sortByOrder([...new Set(items.map((item) => item.size))], SIZE_ORDER);

  function toLabel(value) {
    return value
      .split("-")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");
  }

  function makeBtn(group, value, label, extraClasses = [], exclusiveGroup = null) {
    const attrs = {
      type: "button",
      "data-filter-group": group,
      "data-filter-value": value,
    };
    if (exclusiveGroup) attrs["data-exclusive-group"] = exclusiveGroup;

    const button = el("button", ["filter-btn", ...extraClasses], attrs);
    button.textContent = label;
    return button;
  }

  const styleRow = el("div", ["gallery-filters"], {
    role: "group",
    "aria-label": "Style filters",
  });
  styleRow.appendChild(makeBtn("all", "all", "All", ["active"]));
  styles.forEach((style) => styleRow.appendChild(makeBtn("style", style, toLabel(style))));
  panel.appendChild(styleRow);

  const sizeRow = el("div", ["gallery-filters"], {
    role: "group",
    "aria-label": "Size filters",
  });
  sizes.forEach((size) => sizeRow.appendChild(makeBtn("size", size, toLabel(size))));
  panel.appendChild(sizeRow);

  const backgroundRow = el("div", ["gallery-filters"], {
    role: "group",
    "aria-label": "Background filter",
  });
  backgroundRow.appendChild(makeBtn("background", "background", "Background", ["filter-wide"]));
  panel.appendChild(backgroundRow);

  EXCLUSIVE_GROUPS.forEach((group) => {
    if (group.dynamic) {
      group.values = [...new Set(items.map((item) => item[group.datasetKey]).filter(Boolean))];
    }
  });

  const exclusiveWrap = el("div", ["gallery-filters--exclusive"]);
  EXCLUSIVE_GROUPS.forEach((group) => {
    if (!group.values.length) return;

    const row = el("div", ["gallery-filters"], {
      role: "group",
      "aria-label": group.label,
    });
    group.values.forEach((value) =>
      row.appendChild(makeBtn("exclusive", value, toLabel(value), ["filter-wide"], group.key))
    );
    exclusiveWrap.appendChild(row);
  });
  panel.appendChild(exclusiveWrap);
}

function renderGalleryGrid(items) {
  const grid = $(".gallery-grid");
  if (!grid) return;

  grid.replaceChildren();

  const fallbacks = ["thumb-a", "thumb-b", "thumb-c", "thumb-d", "thumb-e", "thumb-f"];

  items.forEach((item, index) => {
    const fallbackClass = fallbacks[index % fallbacks.length];
    const article = el("article", ["gallery-item", item.tile], {
      "data-style": item.style,
      "data-size": item.size,
      "data-event": item.event || "",
      "data-format": item.format,
      "data-background": item.background ? "true" : "false",
      "data-title": item.title,
      "data-meta": item.meta,
      "data-image": item.image || "",
    });

    const art = el("div", ["gallery-art"]);

    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.alt = item.title;
      img.className = "gallery-img";
      img.loading = "lazy";

      img.addEventListener("error", () => {
        if (img.parentNode === art) art.removeChild(img);
        art.classList.add(fallbackClass);
        art.textContent = "✦";
      });

      art.appendChild(img);
    } else {
      art.classList.add(fallbackClass);
      art.textContent = "✦";
    }

    const overlay = el("div", ["gallery-overlay"]);
    const label = el("div", ["gallery-label"]);
    const title = document.createElement("p");
    const meta = document.createElement("span");

    title.textContent = item.title;
    meta.textContent = item.meta;

    label.append(title, meta);
    overlay.appendChild(label);
    article.append(art, overlay);
    grid.appendChild(article);
  });
}

function bindUI() {
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  $$(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { filterGroup: group, filterValue: value } = btn.dataset;

      if (group === "all") {
        setGalleryFilters();
        return;
      }

      if (group === "exclusive") {
        const exclusiveGroup = btn.dataset.exclusiveGroup;
        const isActive = filterState.exclusive.group === exclusiveGroup
          && filterState.exclusive.value === value;
        setGalleryFilters(
          isActive ? {} : { exclusive: { group: exclusiveGroup, value } },
        );
        return;
      }

      const next = { ...filterState.criteria };
      next[group] = next[group] === value ? null : value;
      setGalleryFilters(next);
    });
  });

  $$(".commission-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      showPage("gallery");

      const format = btn.dataset.format;
      const formatGroup = EXCLUSIVE_GROUPS.find((g) => g.key === "format");
      setGalleryFilters(
        formatGroup.values.includes(format)
          ? { exclusive: { group: "format", value: format } }
          : { style: btn.dataset.style || null },
      );
    });
  });

  $$(".gallery-item").forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    card.addEventListener("click", () => openLightbox(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(card);
      }
    });
  });

  $(".lightbox-backdrop")?.addEventListener("click", closeLightbox);
  $(".lightbox-close")?.addEventListener("click", closeLightbox);

  $(".contact-trigger")?.addEventListener("click", openContactPopup);
  $(".contact-popup-backdrop")?.addEventListener("click", closeContactPopup);
  $(".contact-popup-close")?.addEventListener("click", closeContactPopup);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLightbox();
      closeContactPopup();
    }
  });

  window.addEventListener("resize", () => {
    const lightbox = $(".lightbox");
    if (lightbox?.classList.contains("is-open")) {
      updateLightboxLayout();
    }
  });
}

const scrollBtn = document.querySelector(".scroll-top-btn");

window.addEventListener("scroll", () => {

  if (window.scrollY > 300) {
    scrollBtn.classList.add("show");
  } else {
    scrollBtn.classList.remove("show");
  }

});

scrollBtn.addEventListener("click", () => {

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

});


async function init() {
  const response = await fetch("content.json");
  const data = await response.json();

  renderCommission(data);
  renderTerms(data);
  renderGallery(data);

  bindUI();
  applyGalleryFilters();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
