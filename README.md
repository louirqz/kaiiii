# 🥟 nnichna POS System (Point of Sale)

ระบบจัดการจุดขาย (POS) แบบ Full-Stack สำหรับร้านเกี๊ยวซ่า **“nnichna”** พัฒนาด้วย Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma ORM (SQLite / PostgreSQL ready) ออกแบบตามสไตล์ร้านอาหารญี่ปุ่นร่วมสมัย (Japanese Dark Aesthetics) รองรับการใช้งานผ่านหน้าจอสัมผัส คอมพิวเตอร์ แท็บเล็ต และสมาร์ทโฟน

---

## 🌟 ฟีเจอร์หลักของระบบ (Key Features)

### 1. 🛒 หน้าขายหน้าร้าน (POS Terminal - `/pos`)
- **การเลือกสินค้าและหมวดหมู่:** คัดกรองตามหมวดหมู่ เกี๊ยวซ่าต้นตำรับ, เกี๊ยวซ่าชีส, ของทานเล่น, เครื่องดื่ม
- **ตัวเลือกสินค้า (Variants Modal):** รองรับขนาดชุด (6 ชิ้น, 10 ชิ้น, 15 ชิ้น) หรือเลือกระดับความเผ็ดและซอส
- **ระบบตะกร้าสินค้า (Cart):** เพิ่ม-ลดจำนวนสินค้า คำนวณยอดเงินอัตโนมัติแบบ Real-time
- **ระบบส่วนลด (Discount System):**
  - เลือกส่วนลดแบบเปอร์เซ็นต์ (%) หรือระบุจำนวนเงินสด (บาท)
  - มีระบบจำกัดเพดานส่วนลดสูงสุดตามบทบาทพนักงาน (Cashier Discount Limit Protection)
- **ระบบชำระเงิน (Multi-Payment System):**
  - **เงินสด (Cash):** ระบบป้อนเงินที่รับมา คำนวณเงินทอน (Change Calculation) และปุ่มลัดธนบัตร 100, 500, 1,000 บาท
  - **พร้อมเพย์ (QR PromptPay):** ถอดรหัสและสร้าง EMVCo QR Code มาตรฐานประเทศไทย พร้อมตัวจับเวลานับถอยหลัง และป้ายกำกับ Development Mode
- **ใบเสร็จรับเงิน (Receipt Slip):** พิมพ์ใบเสร็จขนาดมาตรฐาน 80mm/58mm ผ่านหน้าต่าง Print Preview พร้อมข้อมูลร้านและคำนำหน้าเลขออเดอร์

### 2. 📊 แดชบอร์ด & รายงานการขาย (Dashboard & Reports)
- **สรุปยอดขาย:** ยอดขายรวมวันนี้, จำนวนออเดอร์, สินค้าที่ขายได้, ยอดขายเฉลี่ยต่อบิล
- **รายงานแนวโน้มยอดขาย (Sales Trend):** กราฟแท่งแสดงยอดขายรายวัน คัดกรองตามช่วงเวลา (วันนี้, 7 วัน, 30 วัน, เดือนนี้, กำหนดเอง)
- **รายงานกำไรขั้นต้น (Gross Profit & Margin):** คำนวณจากราคาขายหักลบต้นทุนจริง (Cost Price)
- **สัดส่วนการชำระเงิน (Payment Breakdown):** กราฟเปรียบเทียบสัดส่วน เงินสด vs PromptPay
- **10 อันดับสินค้าขายดี (Top 10 Best Sellers):** จัดอันดับตามจำนวนชิ้นและยอดขาย
- **ส่งออกไฟล์ Excel/CSV:** ดาวน์โหลดรายงานสรุปยอดขายเพื่อนำไปทำบัญชีได้ทันที

### 3. 📦 จัดการสินค้าและหมวดหมู่ (Products & Categories)
- **สินค้า (Products):** เพิ่ม ลบ แก้ไข พร้อมตัวเลือกไซส์/ขนาด (Variants) และรหัส SKU / Barcode
- **ระบบลบแบบปลอดภัย (Soft Delete):** สินค้าที่ถูกลบจะไม่กระทบกับประวัติออเดอร์ในอดีต (`deletedAt`)
- **หมวดหมู่ (Categories):** จัดการชื่อ ลำดับการแสดงผล พร้อม Emoji Icon สไตล์ญี่ปุ่น
- **ระบบป้องกันการลบหมวดหมู่:** แจ้งเตือนและไม่อนุญาตให้ลบหากยังมีสินค้าผูกอยู่

### 4. 📈 การจัดการสต็อกสินค้า (Inventory Management)
- ติดตามจำนวนคงเหลือของสินค้าและไซส์ย่อย
- ระบบเตือนสต็อกต่ำ (Low Stock Alert) และสต็อกหมด (Out of Stock)
- การปรับสต็อก (Stock Adjustment): รับสินค้าเข้า, ตัดสต็อกชำรุด/หมดอายุ, ปรับยอดตรวจนับ พร้อมบันทึกประวัติ `InventoryTransaction`

### 5. 👥 การจัดการพนักงานและสิทธิ์การใช้งาน (Staff & RBAC)
- แบ่งสิทธิ์เป็น 3 ระดับ:
  - **ADMIN:** สิทธิ์สูงสุด เข้าถึงทุกเมนู จัดการพนักงาน ตั้งค่าระบบ ดูประวัติความปลอดภัย
  - **MANAGER:** ดูแดชบอร์ด รายงานการขาย จัดการสินค้า หมวดหมู่ และสต็อก
  - **CASHIER:** ใช้งานหน้าขายหน้าร้าน (POS) เท่านั้น และถูกจำกัดวงเงินส่วนลดตามที่กำหนด
- เปิด/ปิดการใช้งานบัญชีพนักงาน (Active/Inactive) และรีเซ็ตรหัสผ่านได้

### 6. ⚙️ การตั้งค่าระบบร้าน (Store Settings & Audit Logs)
- ปรับแต่งชื่อร้าน, ที่อยู่, เบอร์โทรศัพท์, หมายเลขพร้อมเพย์
- กำหนดอัตราภาษีมูลค่าเพิ่ม (VAT %), คำนำหน้าเลขออเดอร์ (เช่น `NN-YYYYMMDD-XXXX`)
- กำหนดข้อความท้ายใบเสร็จ (Receipt Footer Note) พร้อมหน้าจอจำลองใบเสร็จสด (Live Thermal Slip Preview)
- บันทึกประวัติกิจกรรมความปลอดภัย (Security & Audit Logs) ตรวจสอบย้อนหลังทุกการกระทำ

---

## 🔑 บัญชีผู้ใช้สำหรับการทดสอบ (Default Accounts)

ระบบได้ทำการใส่ข้อมูลตัวอย่าง (Seed Data) ไว้อย่างครบถ้วน สามารถเข้าสู่ระบบด้วยบัญชีดังต่อไปนี้:

| บทบาท (Role) | ชื่อผู้ใช้ (Username) | รหัสผ่าน (Password) | สิทธิ์การเข้าถึง |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `AdminPassword123!` | ทั้งหมด (POS + Admin + Reports + Users + Settings) |
| **Manager** | `manager` | `ManagerPassword123!` | POS + Dashboard + Products + Inventory + Orders + Reports |
| **Cashier** | `cashier` | `CashierPassword123!` | หน้าขาย POS เท่านั้น |

---

## 🚀 วิธีการติดตั้งและรันระบบ (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. กำหนดค่าไฟล์ Environment (.env)
ไฟล์ `.env` ได้ถูกสร้างไว้เรียบร้อยแล้ว:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="nnichna_pos_super_secret_jwt_key_2026_change_in_production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. รันการอัปเดตฐานข้อมูลและใส่ข้อมูลเริ่มต้น (Seed Data)
```bash
npx prisma db push
npm run seed
```

### 4. สตาร์ทเซิร์ฟเวอร์สำหรับพัฒนา (Development Server)
```bash
npm run dev
```
เปิดเบราว์เซอร์แล้วเข้าไปที่ [http://localhost:3000](http://localhost:3000)

### 5. การสร้าง Production Bundle
```bash
npm run build
npm start
```

---

## 🏗️ โครงสร้างสถาปัตยกรรม (Project Structure)

```
kaijao/
├── prisma/
│   ├── schema.prisma          # Data Models (User, Product, Order, Inventory, Payment, etc.)
│   └── seed.ts                # Seed Script for demo products, users, categories, orders
├── src/
│   ├── app/
│   │   ├── (auth) /login      # Login screen with credentials helper
│   │   ├── pos/               # POS Terminal (Product Grid, Cart, PromptPay QR, Slip)
│   │   ├── admin/             # Back-Office Admin Pages
│   │   │   ├── page.tsx       # Main Analytics Dashboard
│   │   │   ├── products/      # Product Management
│   │   │   ├── categories/    # Category Management
│   │   │   ├── inventory/     # Stock Adjustment & Tracking
│   │   │   ├── orders/        # Order History & Details
│   │   │   ├── reports/       # Sales Analysis & CSV Export
│   │   │   ├── users/         # Staff & Role Management
│   │   │   └── settings/      # Store Config & Audit Logs
│   │   ├── api/               # Secure Next.js API Route Handlers
│   │   │   ├── auth/          # Login, Logout, Session Verification
│   │   │   ├── products/      # CRUD Products with Variants & Soft Delete
│   │   │   ├── categories/    # Category Management
│   │   │   ├── orders/        # Order Creation & Status Updates
│   │   │   ├── payments/      # PromptPay QR Generation & Confirm Flow
│   │   │   ├── inventory/     # Stock In/Out Adjustments
│   │   │   ├── reports/       # Financial Summaries & Chart Data
│   │   │   ├── users/         # Staff Management
│   │   │   ├── settings/      # Store Config
│   │   │   └── audit-logs/    # Activity Logs
│   │   └── globals.css        # Japanese Dark Theme Design Tokens
│   ├── components/
│   │   ├── admin/             # Sidebar, Product Modal, etc.
│   │   ├── pos/               # Checkout Modal, QR Payment Panel, Receipt Modal
│   │   └── ui/                # Toast Notifications, Confirmation Dialogs
│   ├── lib/
│   │   ├── prisma.ts          # Prisma Client Singleton
│   │   ├── auth.ts            # Password Hashing, JWT Session & RBAC
│   │   ├── promptpay.ts       # EMVCo QR Code Payload & CRC16 Generator
│   │   └── order-number.ts    # Sequential Order Number Generator
│   ├── services/payment/      # Payment Provider Abstraction (PromptPay & Cash)
│   └── middleware.ts          # Role-Based Routing & Session Protection
└── package.json
```

---

## 🎨 สไตล์การออกแบบ (Design Philosophy)
ระบบได้รับการออกแบบด้วย **Japanese Dark Aesthetics**:
- **Palette:** พื้นหลัง Deep Slate (`#0b0f17`, `#0f172a`), การ์ดคอนเทนต์ Glassmorphism (`#1e293b`), ขอบตัดมน เส้นขอบบาง (`#334155`)
- **Accent Color:** โทนสี Crimson Cherry Blossom (`#ff1a6c`, `#e60052`) สื่อถึงความเป็นร้านเกี๊ยวซ่าญี่ปุ่นโมเดิร์น
- **Typography:** ตัวอักษร Noto Sans Thai และ Inter อ่านง่าย สบายตา ชัดเจนสำหรับการทำงานหน้าร้านต่อเนื่องตลอดทั้งวัน
