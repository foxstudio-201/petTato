## 📥 Tải về & Cài đặt / Download & Install

Chọn đúng file cho hệ điều hành của bạn ở mục **Assets** bên dưới.
Pick the right file for your OS in the **Assets** section below.

### 🪟 Windows
- **Khuyên dùng / Recommended:** `petTaTo-Setup-{{VERSION}}.exe` — tải về, chạy, bấm qua trình cài đặt.
- Hoặc `petTaTo-{{VERSION}}.msi` (cho cài đặt theo nhóm/doanh nghiệp).
- ⚠️ Lần đầu Windows SmartScreen có thể cảnh báo "Unknown publisher" → bấm **More info → Run anyway**.

### 🍎 macOS (Apple Silicon — M1/M2/M3)
- Tải `petTaTo-{{VERSION}}-arm64.dmg`, mở ra rồi kéo **petTaTo** vào thư mục **Applications**.
- ⚠️ App **chưa ký số (unsigned)**, nên macOS sẽ báo "không mở được / damaged". Mở lần đầu bằng một trong hai cách:
  - Chuột phải vào app → **Open** → **Open**; hoặc
  - Chạy lệnh: `xattr -dr com.apple.quarantine /Applications/petTaTo.app`

### 🐧 Linux
- **Khuyên dùng / Recommended:** `petTaTo-{{VERSION}}.AppImage`
  ```bash
  chmod +x petTaTo-{{VERSION}}.AppImage
  ./petTaTo-{{VERSION}}.AppImage
  ```
- Debian/Ubuntu: `sudo dpkg -i pettato_{{VERSION}}_amd64.deb`
- Fedora/RHEL: `sudo rpm -i pettato-{{VERSION}}.x86_64.rpm`

### 🔄 Tự động cập nhật / Auto-update
Sau khi cài, app sẽ tự kiểm tra bản mới trong **Settings → Updates**.
Các file `latest*.yml` và `.blockmap` chỉ dùng cho cơ chế tự cập nhật — **bạn không cần tải**.

---
