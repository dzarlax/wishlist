const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'wishlist.db');
const MD_FILE = path.join(__dirname, 'wishlist.md');

// Gifts data from markdown
const giftsData = [
  {
    name: '⚡ Anker Power Bank 25K 165W',
    description: 'Мощный внешний аккумулятор - Емкость: 25,000 mAh, Мощность: 165W, Встроенный USB-C кабель',
    category: '🔋 Аксессуары',
    priority: '⭐ Было бы здорово',
    price: '92 €',
    link: 'https://www.ankersrbija.rs/proizvod/anker-power-bank-25k-165w-built-in-usb-c-crna',
    image_url: ''
  },
  {
    name: '🤖 Dreame X50 Ultra',
    description: 'Робот-пылесос премиум-класса с продвинутыми функциями уборки и самоочистки',
    category: '🏠 Умный дом',
    priority: '🔥 Очень хочу',
    price: '1.195 €',
    link: 'https://sr.dreametech.com/product/dreame-x50-ultra/',
    image_url: ''
  },
  {
    name: '💡 Govee Gaming Light Bars Pro',
    description: 'Игровая подсветка для мониторов 24-32 дюйма с синхронизацией с экраном в реальном времени',
    category: '🔧 Электроника и гаджеты',
    priority: '⭐ Было бы здорово',
    price: '83 €',
    link: 'https://us.govee.com/products/govee-gaming-light-bars-pro',
    image_url: ''
  },
  {
    name: '🎙️ Razer Seiren V3 Mini',
    description: 'Ультра-компактный USB микрофон для стриминга - 14 мм конденсатор, суперкардиоидная направленность',
    category: '🔧 Электроника и гаджеты',
    priority: '⭐ Было бы здорово',
    price: '46 €',
    link: 'https://www.razer.com/streaming-microphones/razer-seiren-v3-mini/RZ19-05050100-R3U1',
    image_url: ''
  },
  {
    name: '🎛️ Elgato Stream Deck (15 кнопок)',
    description: '15 настраиваемых LCD кнопок для контроля над рабочим процессом',
    category: '🔧 Электроника и гаджеты',
    priority: '⭐ Было бы здорово',
    price: '138 €',
    link: 'https://www.elgato.com/us/en/p/stream-deck',
    image_url: ''
  },
  {
    name: '🎛️ Elgato Stream Deck Plus',
    description: '8 LCD кнопок + 4 поворотных регулятора + тачстрип. Идеально для аудио-микширования',
    category: '🔧 Электроника и гаджеты',
    priority: '🔥 Очень хочу',
    price: '184 €',
    link: 'https://www.elgato.com/us/en/p/stream-deck-plus',
    image_url: ''
  },
  {
    name: '📱 ESP32-S3 Touch Screen 7"',
    description: 'Дисплей 7 дюймов 1024×600, 32-bit LX7 Dual-core 240MHz, WiFi & Bluetooth',
    category: '🔧 Электроника и гаджеты',
    priority: '⭐ Было бы здорово',
    price: '41 €',
    link: 'https://malina314.com/proizvod/esp32-s3-touch-lcd-7b/',
    image_url: ''
  },
  {
    name: '🤖 AI Product Management Certification',
    description: 'Сертификационная программа по управлению AI-продуктами от Miqdad Jaffer на Maven',
    category: '📚 Обучение и развитие',
    priority: '🔥 Очень хочу',
    price: '1.955 €',
    link: 'https://maven.com/product-faculty/ai-product-management-certification?promoCode=LENNYSLIST',
    image_url: ''
  }
];

async function importGifts() {
  console.log('🚀 Starting import...\n');

  const SQL = await initSqlJs();

  // Delete old DB if exists
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('🗑️  Old database deleted\n');
  }

  // Create new database
  const db = new SQL.Database();

  // Create table
  db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT '⭐ Было бы здорово',
      link TEXT,
      image_url TEXT,
      price TEXT,
      reserved INTEGER DEFAULT 0,
      secret_code TEXT,
      reserved_by TEXT,
      reserved_at TEXT,
      status TEXT DEFAULT 'available',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert gifts
  console.log('📦 Importing gifts:\n');

  giftsData.forEach((gift, index) => {
    const stmt = db.prepare(`
      INSERT INTO gifts (name, description, category, priority, link, image_url, price)
      VALUES (:name, :desc, :cat, :prio, :link, :img, :price)
    `);

    stmt.bind({
      ':name': gift.name,
      ':desc': gift.description,
      ':cat': gift.category,
      ':prio': gift.priority,
      ':link': gift.link,
      ':img': gift.image_url,
      ':price': gift.price
    });

    stmt.step();
    stmt.free();

    console.log(`   ${index + 1}. ${gift.name}`);
    console.log(`      Category: ${gift.category}`);
    console.log(`      Priority: ${gift.priority}`);
    console.log(`      Price: ${gift.price}\n`);
  });

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);

  console.log('✅ Import completed!');
  console.log(`📊 Total gifts imported: ${giftsData.length}`);
  console.log(`💾 Database saved to: ${DB_FILE}\n`);
  console.log('🎁 You can now start the server with: npm start');
}

importGifts().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
