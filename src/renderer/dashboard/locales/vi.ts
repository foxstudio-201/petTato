/**
 * Vietnamese strings. Keys mirror en.ts exactly. Any key missing here falls
 * back to the English text via the i18n loader.
 */
const vi: Record<string, string> = {
  // --- nav ---
  Dashboard: 'Bảng điều khiển',
  Pet: 'Thú cưng',
  Appearance: 'Giao diện',
  Interactions: 'Tương tác',
  Play: 'Chơi',
  Saves: 'Lưu trữ',
  Mods: 'Mods',
  Settings: 'Cài đặt',
  Developer: 'Nhà phát triển',
  About: 'Giới thiệu',

  // --- common ---
  'virtual companion': 'người bạn ảo',
  'Connecting to petTaTo…': 'Đang kết nối petTaTo…',
  'Starting up your companion': 'Đang khởi động người bạn của bạn',
  'Retrying…': 'Đang thử lại…',
  Save: 'Lưu',
  Create: 'Tạo',
  Activate: 'Kích hoạt',
  Restore: 'Phục hồi',
  Export: 'Xuất',
  Import: 'Nhập',
  Close: 'Đóng',

  // --- actions ---
  feed: 'cho ăn',
  pet: 'vuốt ve',
  play: 'chơi',
  talk: 'trò chuyện',
  clean: 'tắm rửa',
  gift: 'tặng quà',
  train: 'huấn luyện',
  sleep: 'ngủ',
  wake: 'đánh thức',
  Feed: 'Cho ăn',
  Clean: 'Tắm rửa',
  Gift: 'Tặng quà',
  Train: 'Huấn luyện',
  Wake: 'Đánh thức',
  Sleep: 'Cho ngủ',

  // --- dashboard ---
  Needs: 'Nhu cầu',
  'Recent activity': 'Hoạt động gần đây',
  'No activity yet — say hi to your pet!': 'Chưa có hoạt động — hãy chào thú cưng của bạn!',
  'days old': 'ngày tuổi',

  // --- pet config ---
  Identity: 'Danh tính',
  Name: 'Tên',
  Personality: 'Tính cách',
  Activity: 'Hoạt động',
  Social: 'Giao tiếp',
  Explore: 'Khám phá',
  'Set Home Here': 'Đặt nhà ở đây',
  'Behaviour tuning': 'Tinh chỉnh hành vi',
  'Speech frequency': 'Tần suất nói',
  'Activity frequency': 'Tần suất hoạt động',
  Pets: 'Thú cưng',
  'New pet name': 'Tên thú cưng mới',

  // --- appearance ---
  Look: 'Hình thức',
  Scale: 'Tỉ lệ',
  Opacity: 'Độ trong',
  'Animation speed': 'Tốc độ hoạt ảnh',
  'House appearance': 'Kiểu nhà',
  Cottage: 'Nhà gỗ',
  Modern: 'Hiện đại',
  'Window & display': 'Cửa sổ & màn hình',
  'Always on top': 'Luôn trên cùng',
  'Click-through mode': 'Cho phép click xuyên qua',
  'Follow cursor': 'Đi theo con trỏ',
  Movement: 'Di chuyển',
  'Ground (default)': 'Mặt đất (mặc định)',
  'Whole screen': 'Toàn màn hình',
  Monitor: 'Màn hình',
  primary: 'chính',
  'Pet type': 'Loại thú cưng',
  'How to make a pack': 'Cách tạo bộ sprite',
  'Import sprite pack': 'Nhập bộ sprite',
  custom: 'tuỳ chỉnh',

  // --- interactions ---
  'Interaction settings': 'Cài đặt tương tác',
  'Quiz difficulty': 'Độ khó câu đố',
  Easy: 'Dễ',
  Medium: 'Trung bình',
  Hard: 'Khó',
  'Reward scale': 'Hệ số phần thưởng',
  'Notifications & speech': 'Thông báo & lời nói',
  'Quick actions': 'Hành động nhanh',

  // --- play ---
  'Mini-game': 'Trò chơi nhỏ',
  'Win games to boost happiness, curiosity and social stats.':
    'Thắng để tăng vui vẻ, tò mò và giao tiếp.',
  'New game': 'Trò mới',

  // --- saves ---
  'Save manager': 'Quản lý lưu trữ',
  'Backup Now': 'Sao lưu ngay',
  Backups: 'Bản sao lưu',
  'No backups yet.': 'Chưa có bản sao lưu.',

  // --- mods ---
  'Installed mods': 'Mods đã cài',
  'Drop mods into the mods/ folder in your data directory, then restart.':
    'Đặt mod vào thư mục mods/ trong thư mục dữ liệu, rồi khởi động lại.',
  'No mods installed. See the Modding Guide.': 'Chưa cài mod nào. Xem hướng dẫn tạo mod.',

  // --- settings ---
  Language: 'Ngôn ngữ',
  'Voice & commands': 'Giọng nói & lệnh',
  'Enable voice (microphone)': 'Bật giọng nói (micro)',
  'Recognition language': 'Ngôn ngữ nhận diện',
  'Allow opening other apps': 'Cho phép mở ứng dụng khác',
  "Speech recognition isn't available in this build — typed commands still work (e.g. \"open browser\", \"come here\").":
    'Nhận diện giọng nói không khả dụng trong bản này — lệnh gõ tay vẫn dùng được (vd: "mở trình duyệt", "lại đây").',
  Runtime: 'Hoạt động',
  'Simulation tick': 'Nhịp mô phỏng',
  'Auto-save every': 'Tự lưu mỗi',
  'Control-panel port (restart to apply)': 'Cổng bảng điều khiển (khởi động lại để áp dụng)',
  'Launch on login (autostart)': 'Chạy khi đăng nhập',
  Accessibility: 'Trợ năng',
  'Reduced motion': 'Giảm chuyển động',
  'High contrast UI': 'Giao diện tương phản cao',
  'UI scale': 'Tỉ lệ giao diện',

  // --- developer ---
  Performance: 'Hiệu năng',
  Uptime: 'Thời gian chạy',
  Ticks: 'Số nhịp',
  Tick: 'Nhịp',
  'Current state': 'Trạng thái hiện tại',
  Logs: 'Nhật ký',
  'Logs refresh every 3s on this tab…': 'Nhật ký làm mới mỗi 3 giây ở tab này…',

  // --- about ---
  'About petTaTo': 'Giới thiệu petTaTo',
  'A fully offline desktop virtual pet. No cloud, no accounts, no telemetry — everything stays on your machine.':
    'Thú cưng ảo hoàn toàn ngoại tuyến. Không đám mây, không tài khoản, không theo dõi — mọi thứ ở trên máy bạn.',
  Version: 'Phiên bản',

  // --- guide modal ---
  'How to make a sprite pack': 'Cách tạo bộ sprite',
  'A sprite pack is a folder with a manifest.json and one horizontal PNG strip per animation. Click Import sprite pack and choose that folder.':
    'Bộ sprite là một thư mục có manifest.json và mỗi hoạt ảnh là một dải PNG ngang. Bấm "Nhập bộ sprite" và chọn thư mục đó.',
  'Each animation PNG is a horizontal strip of frames, all the same size (e.g. 80×80 or 128×128 — any size works).':
    'Mỗi PNG hoạt ảnh là dải khung ngang, cùng kích thước (vd 80×80 hoặc 128×128 — kích thước nào cũng được).',
  'manifest.json declares the frame size and animations:': 'manifest.json khai báo kích thước khung và các hoạt ảnh:',
  'Required animations: idle, walk, run, jump, sleeping, happy, excited, sad, hungry, talking, playing, eating, sick, exploring, sitting, bored, returningHome. Missing ones fall back to idle. Run npm run gen:assets to produce a reference pack you can edit.':
    'Các hoạt ảnh cần có: idle, walk, run, jump, sleeping, happy, excited, sad, hungry, talking, playing, eating, sick, exploring, sitting, bored, returningHome. Thiếu cái nào sẽ dùng idle. Chạy "npm run gen:assets" để tạo bộ mẫu chỉnh sửa.',

  // --- toast / flash ---
  Renamed: 'Đã đổi tên',
  'Settings saved': 'Đã lưu cài đặt',
  'Personality set': 'Đã đặt tính cách',
  'Home set': 'Đã đặt nhà',
  Switched: 'Đã chuyển',
  'Pet created': 'Đã tạo thú cưng',
  'Save imported': 'Đã nhập bản lưu',
  Restored: 'Đã phục hồi',
  'Autostart updated': 'Đã cập nhật tự khởi động',
  'Welcome!': 'Chào mừng! 🎉',
  Imported: 'Đã nhập',
  'Import failed': 'Nhập thất bại',
  Backup: 'Sao lưu'
}

export default vi
