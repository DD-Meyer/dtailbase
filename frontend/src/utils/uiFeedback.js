const FEEDBACK_STYLE_ID = "ui-feedback-styles";
const TOAST_ROOT_ID = "ui-feedback-toast-root";

const ensureFeedbackStyles = () => {
  if (document.getElementById(FEEDBACK_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = FEEDBACK_STYLE_ID;
  style.textContent = `
    #${TOAST_ROOT_ID} {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 12000;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-width: min(92vw, 360px);
    }

    .ui-feedback-toast {
      border-radius: 10px;
      padding: 0.75rem 0.95rem;
      color: #ffffff;
      font-weight: 600;
      line-height: 1.4;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
      opacity: 0;
      transform: translateY(-8px);
      transition: opacity 180ms ease, transform 180ms ease;
    }

    .ui-feedback-toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .ui-feedback-toast.success { background: #1f8a4c; }
    .ui-feedback-toast.error { background: #c0392b; }
    .ui-feedback-toast.info { background: #2563eb; }
    .ui-feedback-toast.warning { background: #b7791f; }

    .ui-feedback-overlay {
      position: fixed;
      inset: 0;
      z-index: 12500;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .ui-feedback-dialog {
      width: min(92vw, 480px);
      border-radius: 14px;
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 26px 48px rgba(15, 23, 42, 0.35);
      overflow: hidden;
      border: 1px solid #e2e8f0;
      animation: uiFeedbackPopIn 140ms ease-out;
    }

    .ui-feedback-dialog-header {
      padding: 1rem 1.2rem 0.4rem;
      font-size: 1.05rem;
      font-weight: 700;
    }

    .ui-feedback-dialog-body {
      padding: 0.2rem 1.2rem 1rem;
      color: #334155;
      line-height: 1.45;
    }

    .ui-feedback-dialog-input {
      width: calc(100% - 2.4rem);
      margin: 0 1.2rem 0.8rem;
      padding: 0.62rem 0.72rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 160ms ease;
    }

    .ui-feedback-dialog-input:focus {
      border-color: #2563eb;
    }

    .ui-feedback-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      padding: 0.9rem 1.2rem 1.1rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .ui-feedback-btn {
      border: none;
      border-radius: 8px;
      padding: 0.55rem 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }

    .ui-feedback-btn.cancel {
      color: #1e293b;
      background: #e2e8f0;
    }

    .ui-feedback-btn.confirm {
      color: #ffffff;
      background: #2563eb;
    }

    .ui-feedback-btn.confirm.danger {
      background: #b91c1c;
    }

    @keyframes uiFeedbackPopIn {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `;

  document.head.appendChild(style);
};

const getToastRoot = () => {
  let root = document.getElementById(TOAST_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = TOAST_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
};

export const showToast = (message, type = "info", durationMs = 4000) => {
  ensureFeedbackStyles();

  const toast = document.createElement("div");
  toast.className = `ui-feedback-toast ${type}`;
  toast.textContent = message;

  const root = getToastRoot();
  root.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => {
      toast.remove();
    }, 200);
  }, durationMs);
};

const buildDialog = ({ title, message, confirmText, cancelText, danger, inputConfig }) => {
  ensureFeedbackStyles();

  const overlay = document.createElement("div");
  overlay.className = "ui-feedback-overlay";

  const dialog = document.createElement("div");
  dialog.className = "ui-feedback-dialog";

  const heading = document.createElement("div");
  heading.className = "ui-feedback-dialog-header";
  heading.textContent = title;

  const body = document.createElement("div");
  body.className = "ui-feedback-dialog-body";
  body.textContent = message;

  const footer = document.createElement("div");
  footer.className = "ui-feedback-dialog-footer";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "ui-feedback-btn cancel";
  cancelButton.textContent = cancelText;

  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = `ui-feedback-btn confirm${danger ? " danger" : ""}`;
  confirmButton.textContent = confirmText;

  footer.appendChild(cancelButton);
  footer.appendChild(confirmButton);

  let input = null;
  if (inputConfig) {
    input = document.createElement("input");
    input.className = "ui-feedback-dialog-input";
    input.type = inputConfig.type || "text";
    input.placeholder = inputConfig.placeholder || "";
    input.value = inputConfig.initialValue || "";
  }

  dialog.appendChild(heading);
  dialog.appendChild(body);
  if (input) dialog.appendChild(input);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  return { overlay, cancelButton, confirmButton, input };
};

export const showConfirm = ({
  title = "Please confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
}) => {
  return new Promise((resolve) => {
    const { overlay, cancelButton, confirmButton } = buildDialog({
      title,
      message,
      confirmText,
      cancelText,
      danger,
    });

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(result);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") cleanup(false);
      if (event.key === "Enter") cleanup(true);
    };

    document.addEventListener("keydown", onKeyDown);

    cancelButton.addEventListener("click", () => cleanup(false));
    confirmButton.addEventListener("click", () => cleanup(true));

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(false);
    });

    confirmButton.focus();
  });
};

export const showPrompt = ({
  title = "Input required",
  message,
  placeholder = "",
  confirmText = "Submit",
  cancelText = "Cancel",
  danger = false,
  inputType = "text",
}) => {
  return new Promise((resolve) => {
    const { overlay, cancelButton, confirmButton, input } = buildDialog({
      title,
      message,
      confirmText,
      cancelText,
      danger,
      inputConfig: {
        type: inputType,
        placeholder,
      },
    });

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(result);
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") cleanup(null);
      if (event.key === "Enter") cleanup(input.value.trim());
    };

    document.addEventListener("keydown", onKeyDown);

    cancelButton.addEventListener("click", () => cleanup(null));
    confirmButton.addEventListener("click", () => cleanup(input.value.trim()));

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup(null);
    });

    input.focus();
  });
};
