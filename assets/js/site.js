/**
 * 同伟工贸官网 · 基础脚本
 *
 * FND-01:
 * - 标记 JS 可用；
 * - 把 config.js 中已确认的基础信息填入带 data-site-* 的占位节点；
 * - 更新页脚年份。
 *
 * FND-03:
 * - 全站页头电话按钮的占位/可用状态；
 * - 移动菜单打开/关闭、焦点陷阱、ESC、body 滚动锁；
 * - 桌面宽度下自动关闭移动菜单。
 *
 * FND-05:
 * - 通用弹窗基座：触发、遮罩、ESC、焦点陷阱、焦点返回；
 * - Toast/复制反馈基座：window.SiteUI.toast(message)；
 * - 组件预览页的弹窗与 Toast 触发。
 *
 * 其余交互（微信二维码内容、地图、表单校验）在后续任务实现。
 */
(function () {
  "use strict";

  var config = window.SITE_CONFIG || {};
  var toastTimer = null;

  function setText(selector, value) {
    var nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;

    var text = value || "";
    for (var i = 0; i < nodes.length; i += 1) {
      nodes[i].textContent = text;
    }
  }

  function initPhoneLinks() {
    var phone = String(config.phone || "").trim();
    var dial = phone.replace(/[^\d+]/g, "");
    var links = document.querySelectorAll("[data-phone-link]");

    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      var label = link.querySelector("[data-phone-text]");
      var readyText = label
        ? label.getAttribute("data-phone-text-ready") || (config.phoneDisplay || phone)
        : "";
      var emptyText = label
        ? label.getAttribute("data-phone-text-empty") || "号码待补充"
        : "";

      if (!dial) {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("aria-label", "电话号码待补充");
        link.classList.add("is-disabled");
        if (label) label.textContent = emptyText;
        continue;
      }

      link.setAttribute("href", "tel:" + dial);
      link.removeAttribute("aria-disabled");
      link.setAttribute("aria-label", "拨打电话 " + (config.phoneDisplay || phone));
      link.classList.remove("is-disabled");
      if (label) label.textContent = readyText;
    }
  }

  function initHeaderMenu() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var menu = document.querySelector("[data-mobile-menu]");
    if (!toggle || !menu) return;

    var closeButton = menu.querySelector("[data-menu-close]");
    var headerInner = document.querySelector(".site-header__inner");
    var main = document.getElementById("main");
    var footer = document.querySelector(".site-footer");
    var mobileBar = document.querySelector(".mobile-action-bar");
    var lastFocused = null;
    var isOpen = false;

    function getFocusable() {
      var nodes = menu.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      var items = [];
      for (var i = 0; i < nodes.length; i += 1) {
        if (nodes[i].getClientRects().length > 0) {
          items.push(nodes[i]);
        }
      }
      return items;
    }

    function setBackgroundInert(inert) {
      if (headerInner) headerInner.inert = inert;
      if (main) main.inert = inert;
      if (footer) footer.inert = inert;
      if (mobileBar) mobileBar.inert = inert;
    }

    function focusFirst() {
      if (closeButton) {
        closeButton.focus();
        return;
      }

      var items = getFocusable();
      if (items.length) items[0].focus();
    }

    function onKeydown(event) {
      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      var items = getFocusable();
      if (!items.length) {
        event.preventDefault();
        return;
      }

      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function openMenu() {
      if (isOpen) return;

      isOpen = true;
      lastFocused = document.activeElement;
      menu.hidden = false;
      document.body.classList.add("menu-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "关闭菜单");
      setBackgroundInert(true);
      document.addEventListener("keydown", onKeydown);
      focusFirst();
    }

    function closeMenu() {
      if (!isOpen) return;

      isOpen = false;
      menu.hidden = true;
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "打开菜单");
      setBackgroundInert(false);
      document.removeEventListener("keydown", onKeydown);

      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeButton) {
      closeButton.addEventListener("click", closeMenu);
    }

    var menuLinks = menu.querySelectorAll("[data-menu-link]");
    for (var i = 0; i < menuLinks.length; i += 1) {
      menuLinks[i].addEventListener("click", closeMenu);
    }

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 1024px)").matches && isOpen) {
        closeMenu();
      }
    });
  }

  function getFocusableWithin(container) {
    var nodes = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    var items = [];

    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getClientRects().length > 0) {
        items.push(nodes[i]);
      }
    }

    return items;
  }

  function initModalBase() {
    var modals = document.querySelectorAll("[data-modal]");
    var triggers = document.querySelectorAll("[data-modal-open]");
    if (!modals.length && !triggers.length) return;

    var activeModal = null;
    var lastFocused = null;

    function setBackgroundInert(inert) {
      var background = [
        document.querySelector(".site-header__inner"),
        document.getElementById("main"),
        document.querySelector(".site-footer"),
        document.querySelector(".mobile-action-bar")
      ];

      for (var i = 0; i < background.length; i += 1) {
        if (background[i]) background[i].inert = inert;
      }
    }

    function closeModal(modal) {
      if (!modal || modal.hidden) return;

      modal.hidden = true;
      if (activeModal === modal) activeModal = null;
      document.body.classList.remove("modal-open");
      setBackgroundInert(false);
      document.removeEventListener("keydown", onKeydown);

      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    function onKeydown(event) {
      if (!activeModal) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal(activeModal);
        return;
      }

      if (event.key !== "Tab") return;

      var items = getFocusableWithin(activeModal);
      if (!items.length) {
        event.preventDefault();
        return;
      }

      var first = items[0];
      var last = items[items.length - 1];
      var activeInside = activeModal.contains(document.activeElement);

      if (event.shiftKey && (document.activeElement === first || !activeInside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !activeInside)) {
        event.preventDefault();
        first.focus();
      }
    }

    function openModal(modal, returnFocus) {
      if (!modal) return;
      if (activeModal && activeModal !== modal) closeModal(activeModal);

      lastFocused = returnFocus || document.activeElement;
      activeModal = modal;
      modal.hidden = false;
      document.body.classList.add("modal-open");
      setBackgroundInert(true);
      document.addEventListener("keydown", onKeydown);

      var closeButton = modal.querySelector("[data-modal-close]");
      var panel = modal.querySelector(".modal__panel");
      var items = getFocusableWithin(modal);

      if (closeButton) {
        closeButton.focus();
      } else if (items.length) {
        items[0].focus();
      } else if (panel) {
        panel.setAttribute("tabindex", "-1");
        panel.focus();
      }
    }

    for (var i = 0; i < modals.length; i += 1) {
      (function (modal) {
        var closeButtons = modal.querySelectorAll("[data-modal-close]");
        for (var c = 0; c < closeButtons.length; c += 1) {
          closeButtons[c].addEventListener("click", function () {
            closeModal(modal);
          });
        }

        var overlay = modal.querySelector("[data-modal-overlay]");
        if (overlay) {
          overlay.addEventListener("click", function () {
            closeModal(modal);
          });
        }
      })(modals[i]);
    }

    for (var t = 0; t < triggers.length; t += 1) {
      (function (trigger) {
        trigger.addEventListener("click", function (event) {
          event.preventDefault();

          var returnFocus = trigger;
          var menu = trigger.closest("[data-mobile-menu]");
          if (menu && !menu.hidden) {
            var menuClose = menu.querySelector("[data-menu-close]");
            if (menuClose) menuClose.click();
            returnFocus = document.querySelector("[data-menu-toggle]") || returnFocus;
          }

          var id = trigger.getAttribute("data-modal-open");
          var modal = id ? document.getElementById(id) : null;
          if (modal) openModal(modal, returnFocus);
        });
      })(triggers[t]);
    }

    window.SiteUI = window.SiteUI || {};
    window.SiteUI.openModal = function (id) {
      var modal = document.getElementById(id);
      if (modal) openModal(modal);
    };
    window.SiteUI.closeModal = function () {
      if (activeModal) closeModal(activeModal);
    };
  }

  function showToast(message) {
    if (!message) return;

    var root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      root.className = "toast-root";
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }

    var existing = root.querySelector(".toast");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    var toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    root.appendChild(toast);

    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2600);
  }

  function initToastTriggers() {
    var triggers = document.querySelectorAll("[data-toast-message]");

    for (var i = 0; i < triggers.length; i += 1) {
      (function (trigger) {
        trigger.addEventListener("click", function (event) {
          event.preventDefault();
          showToast(trigger.getAttribute("data-toast-message"));
        });
      })(triggers[i]);
    }
  }


  function copyText(text, onSuccess, onFailure) {
    if (!text) {
      if (onFailure) onFailure();
      return;
    }

    function fallback() {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      var copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }

      if (textarea.parentNode) textarea.parentNode.removeChild(textarea);
      if (copied) {
        if (onSuccess) onSuccess();
      } else if (onFailure) {
        onFailure();
      }
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        if (onSuccess) onSuccess();
      }).catch(fallback);
      return;
    }

    fallback();
  }

  function initMapLinks() {
    var links = document.querySelectorAll("[data-map-link]");
    if (!links.length) return;

    var query = String(config.mapQuery || config.address || "").trim();
    if (!query) return;

    var encoded = encodeURIComponent(query);
    for (var i = 0; i < links.length; i += 1) {
      var type = links[i].getAttribute("data-map-link");
      if (type === "amap") {
        links[i].href = "https://uri.amap.com/search?keyword=" + encoded;
      } else if (type === "baidu") {
        links[i].href = "https://map.baidu.com/search?query=" + encoded;
      }
    }
  }

  function initWechatModal() {
    if (document.getElementById("wechat-modal")) return;

    var triggers = document.querySelectorAll('[data-modal-open="wechat-modal"]');
    if (!triggers.length) return;

    var modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "wechat-modal";
    modal.setAttribute("data-modal", "");
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="modal__overlay" data-modal-overlay></div>',
      '<div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="wechat-modal-title">',
      '  <div class="modal__header">',
      '    <h2 class="modal__title" id="wechat-modal-title">微信联系</h2>',
      '    <button class="modal__close" type="button" data-modal-close aria-label="关闭微信二维码">',
      '      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      '    </button>',
      '  </div>',
      '  <div class="modal__body">',
      '    <div class="qr-placeholder"><img data-wechat-modal-qr alt="微信二维码占位，待补充真实二维码" width="800" height="800"></div>',
      '    <p class="wechat-modal__id">微信号：<span data-wechat-modal-id>xxx（待补充）</span></p>',
      '    <p class="wechat-modal__note">扫码加微信，发尺寸、图纸或参考照片。二维码待补充时，请先电话联系。</p>',
      '    <button class="btn btn--primary btn--block wechat-modal__copy" type="button" data-wechat-copy>复制微信号</button>',
      '  </div>',
      '</div>'
    ].join("");
    document.body.appendChild(modal);

    var qr = modal.querySelector("[data-wechat-modal-qr]");
    var idNode = modal.querySelector("[data-wechat-modal-id]");
    var copyButton = modal.querySelector("[data-wechat-copy]");
    var wechatId = String(config.wechatId || "").trim();

    if (qr) {
      qr.src = config.wechatQr || "assets/img/wechat-qr-placeholder.svg";
      qr.alt = wechatId ? "微信二维码" : "微信二维码占位，待补充真实二维码";
    }

    if (idNode) idNode.textContent = wechatId || "xxx（待补充）";

    if (copyButton) {
      if (!wechatId) {
        copyButton.disabled = true;
        copyButton.textContent = "微信号待补充";
      } else {
        copyButton.addEventListener("click", function () {
          copyText(wechatId, function () {
            showToast("微信号已复制");
          }, function () {
            showToast("复制失败，请手动选择微信号");
          });
        });
      }
    }
  }

  function initFaqAccordion() {
    var items = document.querySelectorAll("[data-faq-item]");
    if (!items.length) return;

    var entries = [];
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var button = item.querySelector("[data-faq-question]");
      var answer = item.querySelector("[data-faq-answer]");
      if (button && answer) {
        entries.push({ item: item, button: button, answer: answer });
      }
    }

    if (!entries.length) return;

    function setOpen(entry, open) {
      entry.item.classList.toggle("is-collapsed", !open);
      entry.button.setAttribute("aria-expanded", open ? "true" : "false");
      entry.answer.hidden = !open;
    }

    for (var j = 0; j < entries.length; j += 1) {
      (function (entry) {
        setOpen(entry, false);

        entry.button.addEventListener("click", function () {
          var isOpen = entry.button.getAttribute("aria-expanded") === "true";

          if (isOpen) {
            setOpen(entry, false);
            return;
          }

          for (var k = 0; k < entries.length; k += 1) {
            setOpen(entries[k], false);
          }
          setOpen(entry, true);
        });
      })(entries[j], j);
    }
  }

  function initInquiryForm() {
    var form = document.querySelector("[data-inquiry-form]");
    if (!form) return;

    var submit = form.querySelector("[data-inquiry-submit]");
    var statusNode = document.querySelector("[data-inquiry-status]");
    var result = document.querySelector("[data-inquiry-result]");
    if (!submit || !result) return;

    var summaryNode = result.querySelector("[data-inquiry-summary]");
    var resultNote = result.querySelector(".inquiry-result__note");
    var copyButton = result.querySelector("[data-copy-inquiry]");
    var resetButton = result.querySelector("[data-inquiry-reset]");
    var defaultNote = resultNote ? resultNote.textContent : "";
    var isProduction = Boolean(String(config.formEndpoint || "").trim()) && !config.demoMode;
    var errorCounter = 0;

    if (isProduction) submit.textContent = "提交询价";

    function field(name) {
      return form.querySelector('[name="' + name + '"]');
    }

    function value(name) {
      var control = field(name);
      return control ? String(control.value || "").trim() : "";
    }

    function clearErrors() {
      var messages = form.querySelectorAll(".field__error");
      for (var i = 0; i < messages.length; i += 1) {
        if (messages[i].parentNode) messages[i].parentNode.removeChild(messages[i]);
      }

      var invalid = form.querySelectorAll('[aria-invalid="true"]');
      for (var j = 0; j < invalid.length; j += 1) {
        invalid[j].removeAttribute("aria-invalid");
        invalid[j].removeAttribute("aria-describedby");
      }

      if (statusNode) statusNode.textContent = "";

      errorCounter = 0;
    }

    function addError(control, message, container, allControls) {
      var target = container || (control ? control.closest(".field") : null) || form;
      var error = target.querySelector(".field__error");

      if (!error) {
        error = document.createElement("p");
        error.className = "field__error";
        error.id = "inquiry-error-" + (errorCounter += 1);
        target.appendChild(error);
      }

      error.textContent = message;

      var controls = allControls || (control ? [control] : []);
      for (var i = 0; i < controls.length; i += 1) {
        if (controls[i]) {
          controls[i].setAttribute("aria-invalid", "true");
          controls[i].setAttribute("aria-describedby", error.id);
        }
      }
    }

    function validate() {
      clearErrors();

      var errors = [];
      var length = field("length");
      var width = field("width");
      var height = field("height");
      var dimensions = [length, width, height];
      var dimsField = form.querySelector(".dimensions");
      var dimsContainer = dimsField ? dimsField.parentNode : null;
      var dimsOk = true;

      for (var d = 0; d < dimensions.length; d += 1) {
        var dim = dimensions[d];
        var dimValue = dim ? Number(dim.value) : NaN;
        if (!dim || String(dim.value).trim() === "" || !isFinite(dimValue) || dimValue <= 0 || dimValue > 500) {
          dimsOk = false;
        }
      }

      if (!dimsOk) {
        addError(length, "请填写长、宽、高，范围 1–500cm。", dimsContainer, dimensions);
        errors.push({ control: length });
      }

      var material = field("material");
      if (!material || !material.value) {
        addError(material, "请选择材质 / 层数。");
        errors.push({ control: material });
      }

      var quantity = field("quantity");
      var quantityValue = quantity ? String(quantity.value).trim() : "";
      if (!/^[1-9]\d*$/.test(quantityValue)) {
        addError(quantity, "请输入大于 0 的整数数量。");
        errors.push({ control: quantity });
      }

      var printingRadios = form.querySelectorAll('input[name="printing"]');
      var printing = form.querySelector('input[name="printing"]:checked');
      if (!printing) {
        var printingField = printingRadios.length ? printingRadios[0].closest(".field") : null;
        addError(printingRadios[0], "请选择是否需要印刷。", printingField, printingRadios);
        errors.push({ control: printingRadios[0] });
      }

      var usage = field("usage");
      if (!usage || String(usage.value).trim().length < 2) {
        addError(usage, "请填写具体用途，至少 2 个字。");
        errors.push({ control: usage });
      }

      var delivery = field("delivery");
      if (!delivery || String(delivery.value).trim().length < 2) {
        addError(delivery, "请填写交货地，至少 2 个字。");
        errors.push({ control: delivery });
      }

      var contactName = field("contactName");
      if (!contactName || String(contactName.value).trim().length < 2) {
        addError(contactName, "请填写联系人称呼，至少 2 个字。");
        errors.push({ control: contactName });
      }

      var phone = field("phone");
      var phoneValue = phone ? String(phone.value).trim() : "";
      var phoneDigits = phoneValue.replace(/[\s-]/g, "");
      if (/^86(1[3-9]\d{9})$/.test(phoneDigits)) phoneDigits = phoneDigits.slice(2);
      var phoneOk = /^1[3-9]\d{9}$/.test(phoneDigits) || /^0\d{9,11}$/.test(phoneDigits);
      if (!phoneOk) {
        addError(phone, "请输入有效的手机号或座机号。");
        errors.push({ control: phone });
      }

      var consent = field("consent");
      if (!consent || !consent.checked) {
        addError(consent, "请先同意信息使用说明。");
        errors.push({ control: consent });
      }

      if (errors.length) {
        if (statusNode) {
          statusNode.textContent = "还有 " + errors.length + " 项需要修改，请检查标红字段。";
        }
        if (errors[0].control) errors[0].control.focus();
        return false;
      }

      return true;
    }

    function collectData() {
      var printing = form.querySelector('input[name="printing"]:checked');
      var consent = field("consent");
      return {
        boxType: value("boxType"),
        length: value("length"),
        width: value("width"),
        height: value("height"),
        material: value("material"),
        quantity: value("quantity"),
        printing: printing ? printing.value : "",
        printingDetail: value("printingDetail"),
        usage: value("usage"),
        delivery: value("delivery"),
        contactName: value("contactName"),
        phone: value("phone"),
        wechat: value("wechat"),
        notes: value("notes"),
        consent: Boolean(consent && consent.checked)
      };
    }

    function display(valueToShow) {
      return valueToShow || "未填写";
    }

    function buildSummary() {
      var data = collectData();
      return [
        "【纸箱询价】",
        "箱型：" + display(data.boxType),
        "尺寸：" + data.length + " × " + data.width + " × " + data.height + " cm",
        "材质 / 层数：" + display(data.material),
        "数量：" + data.quantity,
        "印刷：" + display(data.printing),
        "印刷内容：" + display(data.printingDetail),
        "用途：" + data.usage,
        "交货地：" + data.delivery,
        "联系人：" + data.contactName,
        "手机号：" + data.phone,
        "微信号：" + display(data.wechat),
        "备注：" + display(data.notes),
        "隐私同意：已同意"
      ].join("\n");
    }

    function showResult(note) {
      if (summaryNode) summaryNode.textContent = buildSummary();
      if (resultNote) resultNote.textContent = note || defaultNote;
      result.hidden = false;
      result.setAttribute("tabindex", "-1");

      var top = result.getBoundingClientRect().top + window.scrollY - 90;
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      result.focus({ preventScroll: true });
    }

    function submitToEndpoint() {
      var original = submit.textContent;
      submit.disabled = true;
      submit.textContent = "正在提交…";

      fetch(config.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectData())
      }).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        showResult("已收到，我们会尽快联系您。");
      }).catch(function () {
        showResult("提交失败，请直接电话或微信联系。");
      }).then(function () {
        submit.disabled = false;
        submit.textContent = original;
      });
    }

    submit.addEventListener("click", function () {
      if (!validate()) return;
      if (isProduction) {
        submitToEndpoint();
      } else {
        showResult(defaultNote);
      }
    });

    if (copyButton) {
      copyButton.addEventListener("click", function () {
        copyText(summaryNode ? summaryNode.textContent : "", function () {
          showToast("已复制询价内容");
        }, function () {
          if (summaryNode) {
            var selection = window.getSelection();
            if (selection) {
              var range = document.createRange();
              range.selectNodeContents(summaryNode);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
          showToast("已选中询价内容，请按 Ctrl+C 复制");
        });
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        result.hidden = true;
        var firstField = form.querySelector("#boxType") || form.querySelector("input, select, textarea");
        if (firstField) {
          firstField.focus();
          firstField.scrollIntoView({ block: "center" });
        }
      });
    }
  }

  function init() {
    document.documentElement.classList.remove("no-js");
    document.documentElement.classList.add("js");

    setText("[data-site-company]", config.companyName || "");
    setText("[data-site-short-name]", config.shortName || "");
    setText("[data-site-contact]", config.contactName || "");
    setText("[data-site-phone]", config.phoneDisplay || "xxx（待补充）");
    setText("[data-site-wechat]", config.wechatId || "xxx（待补充）");
    setText("[data-site-address]", config.address || "");
    setText("[data-site-hours]", config.hours || "");
    setText("[data-site-area]", config.serviceArea || "");
    setText("[data-site-year]", String(new Date().getFullYear()));

    window.SiteUI = window.SiteUI || {};
    window.SiteUI.toast = showToast;

    initPhoneLinks();
    initMapLinks();
    initWechatModal();
    initHeaderMenu();
    initFaqAccordion();
    initInquiryForm();
    initModalBase();
    initToastTriggers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
