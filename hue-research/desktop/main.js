// Vỏ Electron cho HCE Research: mở ứng dụng web đã triển khai trong một cửa sổ riêng.
// An toàn: không bật Node trong trang, bật sandbox, chỉ cho điều hướng trong miền ứng dụng
// và các nhà cung cấp đăng nhập; mọi liên kết khác mở bằng trình duyệt hệ thống.
const { app, BrowserWindow, Menu, shell, clipboard, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "app.config.json"), "utf8"));
const APP_URL = process.env.HCE_APP_URL || config.url;
const appOrigin = new URL(APP_URL).origin;
const authHosts = new Set(config.authHosts || []);

let win = null;

function isInternal(u) {
  try {
    const x = new URL(u);
    return x.origin === appOrigin || (x.protocol === "https:" && authHosts.has(x.hostname));
  } catch {
    return false;
  }
}

function openExternal(u) {
  try {
    const x = new URL(u);
    if (x.protocol === "https:" || x.protocol === "http:" || x.protocol === "mailto:") shell.openExternal(u);
  } catch {}
}

// Liên kết đăng nhập qua email mở ra trình duyệt hệ thống, không phải ứng dụng này.
// Cho phép dán liên kết đó vào ứng dụng: chỉ chấp nhận đúng miền và đường dẫn xác thực.
function pasteLoginLink() {
  const text = clipboard.readText().trim();
  try {
    const x = new URL(text);
    if (x.origin === appOrigin && x.pathname === "/api/auth/magic-link/verify") {
      win?.loadURL(x.toString());
      return;
    }
  } catch {}
  dialog.showMessageBox(win, {
    type: "info",
    message: "Chưa có liên kết đăng nhập hợp lệ trong bộ nhớ tạm",
    detail: "Trong email đăng nhập, bấm chuột phải vào liên kết, chọn Sao chép địa chỉ liên kết, rồi chọn lại mục này.",
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "HCE Research",
    backgroundColor: "#0e1519",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) {
      win.loadURL(url);
    } else {
      openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!isInternal(url)) {
      e.preventDefault();
      openExternal(url);
    }
  });
  win.webContents.on("did-fail-load", (_e, code, desc, _url, isMain) => {
    if (!isMain || code === -3) return;
    win.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          `<body style="font-family:sans-serif;padding:40px"><h2>Không kết nối được máy chủ</h2><p>${desc}</p><p>Địa chỉ: ${appOrigin}</p><p>Kiểm tra mạng hoặc cấu hình tại app.config.json, rồi thử lại (Ctrl+R sau khi sửa).</p></body>`,
        ),
    );
  });
  win.loadURL(APP_URL);
  win.on("closed", () => (win = null));
}

const menu = Menu.buildFromTemplate([
  {
    label: "Tệp",
    submenu: [
      { label: "Dán liên kết đăng nhập từ email", accelerator: "CmdOrCtrl+Shift+L", click: pasteLoginLink },
      { type: "separator" },
      { role: "quit", label: "Thoát" },
    ],
  },
  { label: "Xem", submenu: [{ role: "reload", label: "Tải lại" }, { role: "togglefullscreen", label: "Toàn màn hình" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "resetZoom" }] },
  { label: "Cửa sổ", submenu: [{ role: "minimize", label: "Thu nhỏ" }, { role: "close", label: "Đóng" }] },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(menu);
    createWindow();
    app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });
  app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
}
