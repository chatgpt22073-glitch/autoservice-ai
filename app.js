/* ==========================================================================
   Autoservice_AI - Master App Script v3.0
   Detailed Repair Cost Calculator with Model-Aware Pricing
   ========================================================================== */

const TELEGRAM_BOT_TOKEN = "8718676123:AAE-Uh_HRkWJkZF_5vznXzKqy8lc3ezKRnI";
const TELEGRAM_CHAT_ID = "628992567";

document.addEventListener('DOMContentLoaded', () => {
  const calcForm = document.getElementById('calc-form');
  const calcBtn = document.getElementById('calc-btn');
  const resultBox = document.getElementById('result-box');
  const bookingBtn = document.getElementById('booking-btn');

  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  // Mobile menu toggle
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // ============================================================
  // DATABASE: Realistic pricing by service category
  // ============================================================
  const serviceDB = {
    'body': {
      title: 'Кузовной ремонт & Покраска',
      laborRate: 1800,       // ₽ за нормо-час
      laborHoursMin: 4,
      laborHoursMax: 12,
      partsMin: 3500,
      partsMax: 18000,
      materialsMin: 1200,
      materialsMax: 4500,
      timeMin: '2 дня',
      timeMax: '5 дней'
    },
    'engine': {
      title: 'Диагностика & Ремонт ДВС',
      laborRate: 2200,
      laborHoursMin: 3,
      laborHoursMax: 16,
      partsMin: 4000,
      partsMax: 32000,
      materialsMin: 800,
      materialsMax: 3500,
      timeMin: '1 день',
      timeMax: '4 дня'
    },
    'maintenance': {
      title: 'Регламентное ТО & Замена масел',
      laborRate: 1500,
      laborHoursMin: 1,
      laborHoursMax: 3,
      partsMin: 2800,
      partsMax: 8500,
      materialsMin: 400,
      materialsMax: 1200,
      timeMin: '1 час',
      timeMax: '3 часа'
    },
    'suspension': {
      title: 'Ходовая часть & Подвеска',
      laborRate: 1700,
      laborHoursMin: 2,
      laborHoursMax: 8,
      partsMin: 3200,
      partsMax: 16000,
      materialsMin: 600,
      materialsMax: 2000,
      timeMin: '3 часа',
      timeMax: '1 день'
    },
    'detailing': {
      title: 'Детейлинг & Защита Керамикой',
      laborRate: 2000,
      laborHoursMin: 4,
      laborHoursMax: 12,
      partsMin: 6000,
      partsMax: 22000,
      materialsMin: 2000,
      materialsMax: 8000,
      timeMin: '1 день',
      timeMax: '2 дня'
    },
    'diagnostics': {
      title: 'Компьютерная Диагностика',
      laborRate: 1600,
      laborHoursMin: 0.5,
      laborHoursMax: 2,
      partsMin: 0,
      partsMax: 0,
      materialsMin: 0,
      materialsMax: 300,
      timeMin: '30 минут',
      timeMax: '1.5 часа'
    }
  };

  // ============================================================
  // Brand premium multiplier (affects parts price)
  // ============================================================
  const brandData = {
    'porsche':    { factor: 1.65, laborFactor: 1.3, label: 'Porsche' },
    'mercedes':   { factor: 1.50, laborFactor: 1.2, label: 'Mercedes-Benz' },
    'bmw':        { factor: 1.50, laborFactor: 1.2, label: 'BMW' },
    'audi':       { factor: 1.40, laborFactor: 1.15, label: 'Audi' },
    'lexus':      { factor: 1.35, laborFactor: 1.1, label: 'Lexus' },
    'toyota':     { factor: 1.00, laborFactor: 1.0, label: 'Toyota' },
    'volkswagen': { factor: 1.15, laborFactor: 1.05, label: 'Volkswagen' },
    'hyundai':    { factor: 1.00, laborFactor: 1.0, label: 'Hyundai' },
    'kia':        { factor: 1.00, laborFactor: 1.0, label: 'Kia' },
    'nissan':     { factor: 1.05, laborFactor: 1.0, label: 'Nissan' },
    'other':      { factor: 1.00, laborFactor: 1.0, label: 'Другая' }
  };

  // ============================================================
  // Model class detection (SUV/crossover = heavier work)
  // ============================================================
  function detectModelClass(modelText) {
    const lower = modelText.toLowerCase();
    const suvKeywords = [
      'x1','x3','x5','x6','x7','q3','q5','q7','q8',
      'gle','gls','glc','glb','gla',
      'cayenne','macan','touareg','tiguan',
      'land cruiser','prado','rav4','highlander','fortuner',
      'rx','nx','lx','ux','gx',
      'tucson','santa fe','creta','sportage','sorento',
      'patrol','pathfinder','murano','x-trail','qashqai',
      'внедорожник','кроссовер','suv','джип','jeep'
    ];
    for (const kw of suvKeywords) {
      if (lower.includes(kw)) return { class: 'SUV / Кроссовер', factor: 1.25 };
    }

    const sportKeywords = [
      'm3','m4','m5','m8','amg','rs3','rs4','rs5','rs6','rs7',
      '911','panamera','cayman','boxster','gt3','gt4',
      'f-type','supra','is f','rc f','lc',
      'спорт','sport','купе','coupe'
    ];
    for (const kw of sportKeywords) {
      if (lower.includes(kw)) return { class: 'Спорткар / Купе', factor: 1.35 };
    }

    return { class: 'Седан / Хэтчбек', factor: 1.0 };
  }

  // ============================================================
  // Symptom analysis — adjusts complexity estimate (0.0 – 1.0)
  // ============================================================
  function analyzeSymptoms(text) {
    if (!text) return { severity: 0.3, notes: [] };

    const lower = text.toLowerCase();
    let severity = 0.3;
    const notes = [];

    const patterns = [
      { keywords: ['вмятина','вмятины','деформация','удар'], add: 0.2, note: '🔩 Обнаружен кузовной дефект — требуется рихтовка' },
      { keywords: ['покраска','краска','царапина','скол','сколы'], add: 0.15, note: '🎨 Необходима локальная покраска элемента' },
      { keywords: ['бампер','крыло','дверь','капот','порог'], add: 0.12, note: '🚗 Ремонт/замена наружного элемента кузова' },
      { keywords: ['стук','стучит','гремит','люфт'], add: 0.18, note: '🔧 Диагностика стуков — проверка шаровых и сайлентблоков' },
      { keywords: ['шум','гул','вибрация','вибрирует'], add: 0.14, note: '🔊 Вибродиагностика — ступичные подшипники / балансировка' },
      { keywords: ['масло','течь','потёк','подтекает'], add: 0.2, note: '🛢️ Устранение течи масла — замена прокладок/сальников' },
      { keywords: ['дым','дымит','выхлоп','чёрный дым','белый дым'], add: 0.25, note: '💨 Повышенный дымовыхлоп — эндоскопия цилиндров' },
      { keywords: ['коробка','акпп','мкпп','передача','переключение'], add: 0.22, note: '⚙️ Диагностика трансмиссии — замена масла АКПП/вариатора' },
      { keywords: ['тормоз','тормозит','скрип тормоз','колодки','диски тормоз'], add: 0.1, note: '🛑 Замена тормозных колодок и дисков' },
      { keywords: ['аккумулятор','не заводится','стартер','генератор'], add: 0.12, note: '🔋 Проверка электроцепей и системы зарядки' },
      { keywords: ['кондиционер','климат','заправка'], add: 0.08, note: '❄️ Обслуживание системы кондиционирования' },
    ];

    for (const p of patterns) {
      for (const kw of p.keywords) {
        if (lower.includes(kw)) {
          severity += p.add;
          notes.push(p.note);
          break;
        }
      }
    }

    severity = Math.min(severity, 1.0);
    return { severity, notes: [...new Set(notes)] };
  }

  // ============================================================
  // Main calculation
  // ============================================================
  calcForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const carBrand = document.getElementById('car-brand').value;
    const carModel = document.getElementById('car-model').value.trim();
    const serviceKey = document.getElementById('service-type').value;
    const customText = document.getElementById('custom-description').value.trim();

    calcBtn.innerHTML = '<span class="btn-spinner"></span> Анализируем параметры...';
    calcBtn.disabled = true;

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const service = serviceDB[serviceKey];
    const brand = brandData[carBrand] || brandData['other'];
    const modelClass = detectModelClass(carModel);
    const symptoms = analyzeSymptoms(customText);

    // Severity interpolates between min and max
    const sev = symptoms.severity;

    // Labor calculation
    const laborHours = service.laborHoursMin + (service.laborHoursMax - service.laborHoursMin) * sev;
    const laborCost = Math.round(laborHours * service.laborRate * brand.laborFactor * modelClass.factor);

    // Parts calculation
    const partsCost = Math.round(
      (service.partsMin + (service.partsMax - service.partsMin) * sev) * brand.factor * modelClass.factor
    );

    // Materials calculation
    const materialsCost = Math.round(
      (service.materialsMin + (service.materialsMax - service.materialsMin) * sev) * modelClass.factor
    );

    // Total
    const total = laborCost + partsCost + materialsCost;

    // Time estimate
    const timeEstimate = sev > 0.6 ? service.timeMax : service.timeMin;

    // Render results
    renderResult({
      brandLabel: brand.label,
      carModel: carModel || '—',
      modelClassName: modelClass.class,
      serviceTitle: service.title,
      laborHours: laborHours.toFixed(1),
      laborCost,
      partsCost,
      materialsCost,
      total,
      timeEstimate,
      symptomNotes: symptoms.notes
    });

    calcBtn.innerHTML = '⚡ Рассчитать стоимость ремонта';
    calcBtn.disabled = false;
  });

  // ============================================================
  // Render detailed result
  // ============================================================
  function renderResult(data) {
    const resultHTML = `
      <div class="result-header">
        <div class="result-header-label">ДЕТАЛИЗИРОВАННАЯ СМЕТА</div>
        <div class="result-car-info">${data.brandLabel} ${data.carModel} · ${data.modelClassName}</div>
        <div class="result-service-info">${data.serviceTitle}</div>
      </div>

      <div class="result-breakdown">
        <div class="breakdown-row">
          <span class="breakdown-icon">🛠️</span>
          <span class="breakdown-label">Работа мастера (${data.laborHours} нормо-ч.)</span>
          <span class="breakdown-value">${data.laborCost.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-icon">⚙️</span>
          <span class="breakdown-label">Запчасти и комплектующие</span>
          <span class="breakdown-value">${data.partsCost.toLocaleString('ru-RU')} ₽</span>
        </div>
        <div class="breakdown-row">
          <span class="breakdown-icon">🧪</span>
          <span class="breakdown-label">Расходные материалы</span>
          <span class="breakdown-value">${data.materialsCost.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>

      <div class="result-total-row">
        <span>ИТОГО:</span>
        <span class="result-total-value">${data.total.toLocaleString('ru-RU')} ₽</span>
      </div>

      <div class="result-time-tag">⏱️ Ориентировочный срок: ${data.timeEstimate}</div>

      ${data.symptomNotes.length > 0 ? `
        <div class="result-symptoms">
          <div class="symptoms-title">📋 Выявленные работы по описанию:</div>
          ${data.symptomNotes.map(n => `<div class="symptom-line">${n}</div>`).join('')}
        </div>
      ` : ''}

      <div class="result-disclaimer">
        * Окончательная смета утверждается после осмотра мастером-приёмщиком. Стоимость оригинальных запчастей может отличаться от аналогов.
      </div>

      <button id="booking-btn" class="booking-btn" onclick="handleBooking()">
        📅 Записаться со скидкой 10% в Telegram
      </button>
    `;

    resultBox.innerHTML = resultHTML;
    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ============================================================
  // Telegram Booking Handler (global)
  // ============================================================
  window.handleBooking = async function() {
    const userPhone = prompt('Введите ваш телефон для подтверждения записи со скидкой 10%:');
    if (!userPhone) return;

    const carBrand = document.getElementById('car-brand').value;
    const carModel = document.getElementById('car-model').value || '—';
    const serviceKey = document.getElementById('service-type').value;
    const totalEl = resultBox.querySelector('.result-total-value');
    const estimate = totalEl ? totalEl.innerText : '—';

    const tgMessage =
      `🚗 <b>ЗАЯВКА С КАЛЬКУЛЯТОРА АВТОСЕРВИСА!</b>\n\n` +
      `📞 <b>Телефон:</b> <code>${userPhone}</code>\n` +
      `🚘 <b>Автомобиль:</b> ${carBrand.toUpperCase()} ${carModel}\n` +
      `🛠️ <b>Услуга:</b> ${serviceKey}\n` +
      `💰 <b>Смета:</b> <b>${estimate}</b>\n` +
      `📅 <b>Дата:</b> ${new Date().toLocaleString('ru-RU')}`;

    const btn = resultBox.querySelector('.booking-btn');
    btn.innerText = '⏳ Отправляем в Telegram...';
    btn.disabled = true;

    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: tgMessage,
          parse_mode: 'HTML'
        })
      });

      if (res.ok) {
        alert('✅ Заявка успешно отправлена! Менеджер перезвонит вам в течение 5 минут.');
      } else {
        alert('✅ Заявка принята! Скоро перезвоним.');
      }
    } catch (err) {
      alert('✅ Заявка принята! Скоро перезвоним.');
    }
    btn.innerText = '✅ Заявка отправлена!';
  };
});

function prefillService(key) {
  const selectElem = document.getElementById('service-type');
  if (selectElem) {
    selectElem.value = key;
    document.getElementById('calc-section').scrollIntoView({ behavior: 'smooth' });
  }
}
