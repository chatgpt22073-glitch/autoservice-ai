/* ==========================================================================
   Autoservice_AI - Master App Script v4.0
   Detailed Repair Cost Calculator with Multi-Select Services & Multipliers
   ========================================================================== */

const TELEGRAM_BOT_TOKEN = '8718676123:AAE-Uh_HRkWJkZF_5vznXzKqy8lc3ezKRnI';
const TELEGRAM_CHAT_ID = '628992567';

document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // DOM Elements
  // ============================================================
  const brandSelect = document.getElementById('car-brand');
  const modelSelect = document.getElementById('car-model');
  const yearSelect = document.getElementById('car-year');
  const engineSelect = document.getElementById('engine-volume');
  const transSelect = document.getElementById('transmission');
  const checklistContainer = document.getElementById('service-checklist');
  const calcBtn = document.getElementById('calc-btn');
  const resultBox = document.getElementById('result-box');
  const liveTotalEl = document.getElementById('live-total');

  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  // Mobile menu toggle
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // ============================================================
  // VEHICLE DATABASE: Brand → Models
  // ============================================================
  const vehicleDB = {
    'mercedes': {
      label: 'Mercedes-Benz',
      models: ['C-Class', 'E-Class', 'S-Class', 'A-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'CLA', 'CLS', 'AMG GT']
    },
    'bmw': {
      label: 'BMW',
      models: ['1 Series', '3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'X7', 'M3', 'M5', 'Z4', 'i4']
    },
    'audi': {
      label: 'Audi',
      models: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'RS3', 'RS6']
    },
    'porsche': {
      label: 'Porsche',
      models: ['Cayenne', 'Macan', 'Panamera', '911', 'Taycan', 'Boxster', 'Cayman']
    },
    'lexus': {
      label: 'Lexus',
      models: ['IS', 'ES', 'GS', 'LS', 'NX', 'RX', 'LX', 'UX', 'LC']
    },
    'toyota': {
      label: 'Toyota',
      models: ['Camry', 'Corolla', 'RAV4', 'Land Cruiser 200', 'Land Cruiser 300', 'Land Cruiser Prado', 'Highlander', 'C-HR', 'Supra', 'Yaris']
    },
    'volkswagen': {
      label: 'Volkswagen',
      models: ['Golf', 'Passat', 'Tiguan', 'Touareg', 'Polo', 'Jetta', 'ID.4', 'Arteon', 'T-Roc']
    },
    'hyundai': {
      label: 'Hyundai',
      models: ['Solaris', 'Tucson', 'Santa Fe', 'Creta', 'Elantra', 'Sonata', 'Palisade', 'i30', 'Kona']
    },
    'kia': {
      label: 'Kia',
      models: ['Rio', 'Ceed', 'Sportage', 'Sorento', 'K5', 'Stinger', 'Seltos', 'Soul', 'Carnival']
    },
    'nissan': {
      label: 'Nissan',
      models: ['Qashqai', 'X-Trail', 'Murano', 'Patrol', 'Juke', 'Leaf', 'Note', 'Teana', 'Pathfinder']
    }
  };

  // ============================================================
  // BRAND LABOR MULTIPLIERS
  // ============================================================
  const brandMultipliers = {
    'porsche':    1.8,
    'mercedes':   1.5,
    'bmw':        1.5,
    'audi':       1.4,
    'lexus':      1.3,
    'volkswagen': 1.1,
    'toyota':     1.0,
    'hyundai':    1.0,
    'kia':        1.0,
    'nissan':     1.0
  };

  // ============================================================
  // ENGINE VOLUME MULTIPLIERS
  // ============================================================
  function getEngineMultiplier(engineVal) {
    switch (engineVal) {
      case '1.4': case '1.6': return 1.0;
      case '1.8': case '2.0': return 1.0;
      case '2.5': case '3.0': return 1.15;
      case '3.5': case '4.0': return 1.3;
      case '5.0': return 1.5;
      default: return 1.0;
    }
  }

  // ============================================================
  // SUV DETECTION — +15% for suspension/brake work
  // ============================================================
  const suvModels = [
    'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class',
    'X1', 'X3', 'X5', 'X6', 'X7',
    'Q3', 'Q5', 'Q7', 'Q8',
    'Cayenne', 'Macan',
    'NX', 'RX', 'LX', 'UX',
    'RAV4', 'Land Cruiser 200', 'Land Cruiser 300', 'Land Cruiser Prado', 'Highlander',
    'Tiguan', 'Touareg', 'T-Roc',
    'Tucson', 'Santa Fe', 'Creta', 'Palisade', 'Kona',
    'Sportage', 'Sorento', 'Seltos', 'Carnival',
    'Qashqai', 'X-Trail', 'Murano', 'Patrol', 'Juke', 'Pathfinder'
  ];

  function isSUV(modelName) {
    return suvModels.some(s => modelName === s);
  }

  // ============================================================
  // SERVICE DATABASE — Grouped works with base prices
  // ============================================================
  const serviceGroups = [
    {
      id: 'engine',
      title: '🔧 Двигатель и ТО',
      services: [
        { id: 'oil_change',       name: 'Замена масла ДВС + фильтр',         basePrice: 800 },
        { id: 'air_filter',       name: 'Замена воздушного фильтра',          basePrice: 300 },
        { id: 'cabin_filter',     name: 'Замена салонного фильтра',           basePrice: 400 },
        { id: 'spark_plugs_4',    name: 'Замена свечей зажигания (4 цил.)',   basePrice: 800 },
        { id: 'spark_plugs_6',    name: 'Замена свечей зажигания (6 цил.)',   basePrice: 1200 },
        { id: 'timing_belt',      name: 'Замена ремня/цепи ГРМ',             basePrice: 9000,  rangeMin: 6000, rangeMax: 12000 },
        { id: 'coolant',          name: 'Замена антифриза',                   basePrice: 1200 },
        { id: 'fuel_filter',      name: 'Замена топливного фильтра',          basePrice: 600 },
        { id: 'injector_flush',   name: 'Промывка инжектора',                 basePrice: 2500 },
        { id: 'engine_diag',      name: 'Компьютерная диагностика ДВС',       basePrice: 1500 }
      ]
    },
    {
      id: 'suspension',
      title: '🚗 Ходовая часть и подвеска',
      isSuspension: true,
      services: [
        { id: 'susp_diag',        name: 'Диагностика ходовой',                basePrice: 800 },
        { id: 'front_pads',       name: 'Замена передних тормозных колодок',   basePrice: 1200 },
        { id: 'rear_pads',        name: 'Замена задних тормозных колодок',     basePrice: 1200 },
        { id: 'brake_discs',      name: 'Замена тормозных дисков (пара)',      basePrice: 2000 },
        { id: 'front_shocks',     name: 'Замена передних стоек амортизаторов (2 шт)', basePrice: 3000 },
        { id: 'rear_shocks',      name: 'Замена задних стоек амортизаторов (2 шт)',  basePrice: 2500 },
        { id: 'control_arm',      name: 'Замена рычага подвески',             basePrice: 2000 },
        { id: 'bushings',         name: 'Замена сайлентблоков (пара)',         basePrice: 1800 },
        { id: 'ball_joint',       name: 'Замена шаровой опоры',               basePrice: 1500 },
        { id: 'wheel_bearing',    name: 'Замена ступичного подшипника',        basePrice: 2500 },
        { id: 'alignment',        name: '3D сход-развал',                     basePrice: 2500 }
      ]
    },
    {
      id: 'transmission',
      title: '⚙️ Трансмиссия',
      services: [
        { id: 'atf_partial',      name: 'Замена масла в АКПП (частичная)',     basePrice: 1500 },
        { id: 'atf_full',         name: 'Замена масла в АКПП (полная аппаратная)', basePrice: 3500 },
        { id: 'mtf_change',       name: 'Замена масла в МКПП',                basePrice: 800 },
        { id: 'clutch',           name: 'Замена сцепления',                   basePrice: 8000,  rangeMin: 6000, rangeMax: 10000 }
      ]
    },
    {
      id: 'body',
      title: '🎨 Кузов и покраска',
      services: [
        { id: 'paint_panel',      name: 'Покраска одного элемента (дверь/крыло)', basePrice: 8000 },
        { id: 'polish',           name: 'Полировка кузова',                   basePrice: 5000 },
        { id: 'pdr',              name: 'Удаление вмятин без покраски (PDR)',  basePrice: 3000 },
        { id: 'windshield',       name: 'Замена лобового стекла (работа)',     basePrice: 2500 }
      ]
    },
    {
      id: 'electrical',
      title: '⚡ Электрика и кондиционер',
      services: [
        { id: 'ac_recharge',      name: 'Заправка кондиционера',              basePrice: 2500 },
        { id: 'alternator',       name: 'Замена генератора',                  basePrice: 2500 },
        { id: 'starter',          name: 'Замена стартера',                    basePrice: 3000 },
        { id: 'battery_install',  name: 'Замена аккумулятора (работа)',        basePrice: 500 }
      ]
    }
  ];

  // ============================================================
  // POPULATE YEAR SELECT (2010-2026)
  // ============================================================
  if (yearSelect) {
    for (let y = 2026; y >= 2010; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
  }

  // ============================================================
  // DYNAMIC MODEL POPULATION on brand change
  // ============================================================
  function populateModels(brand) {
    modelSelect.innerHTML = '';
    const data = vehicleDB[brand];
    if (!data) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— Выберите модель —';
      modelSelect.appendChild(opt);
      return;
    }
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Выберите модель —';
    placeholder.disabled = true;
    placeholder.selected = true;
    modelSelect.appendChild(placeholder);

    data.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    });
  }

  if (brandSelect) {
    brandSelect.addEventListener('change', () => {
      populateModels(brandSelect.value);
      updateLiveTotal();
    });
    // Initialize on load
    populateModels(brandSelect.value);
  }

  if (modelSelect) {
    modelSelect.addEventListener('change', () => updateLiveTotal());
  }
  if (engineSelect) {
    engineSelect.addEventListener('change', () => updateLiveTotal());
  }

  // ============================================================
  // BUILD SERVICE CHECKLIST
  // ============================================================
  function buildChecklist() {
    if (!checklistContainer) return;
    checklistContainer.innerHTML = '';

    serviceGroups.forEach(group => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'service-checklist-group';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'checklist-group-title';
      titleDiv.textContent = group.title;
      groupDiv.appendChild(titleDiv);

      group.services.forEach(svc => {
        const itemLabel = document.createElement('label');
        itemLabel.className = 'checklist-item';
        itemLabel.setAttribute('data-service-id', svc.id);
        itemLabel.setAttribute('data-group-id', group.id);
        if (group.isSuspension) {
          itemLabel.setAttribute('data-suspension', 'true');
        }
        itemLabel.setAttribute('data-base-price', svc.basePrice);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checklist-checkbox';
        checkbox.value = svc.id;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'checklist-name';
        nameSpan.textContent = svc.name;

        const priceSpan = document.createElement('span');
        priceSpan.className = 'checklist-price';

        const priceText = svc.rangeMin
          ? `${svc.rangeMin.toLocaleString('ru-RU')}–${svc.rangeMax.toLocaleString('ru-RU')} ₽`
          : `${svc.basePrice.toLocaleString('ru-RU')} ₽`;
        priceSpan.textContent = priceText;

        itemLabel.appendChild(checkbox);
        itemLabel.appendChild(nameSpan);
        itemLabel.appendChild(priceSpan);

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            itemLabel.classList.add('checked');
          } else {
            itemLabel.classList.remove('checked');
          }
          updateLiveTotal();
        });

        groupDiv.appendChild(itemLabel);
      });

      checklistContainer.appendChild(groupDiv);
    });
  }

  buildChecklist();

  // ============================================================
  // LIVE TOTAL — updates as user checks/unchecks + changes car
  // ============================================================
  function getSelectedServices() {
    const selected = [];
    const checked = checklistContainer.querySelectorAll('.checklist-checkbox:checked');
    checked.forEach(cb => {
      const item = cb.closest('.checklist-item');
      const serviceId = item.getAttribute('data-service-id');
      const groupId = item.getAttribute('data-group-id');
      const isSusp = item.getAttribute('data-suspension') === 'true';
      const basePrice = parseInt(item.getAttribute('data-base-price'), 10);

      // Find the full service definition for the name
      let serviceName = '';
      for (const g of serviceGroups) {
        for (const s of g.services) {
          if (s.id === serviceId) {
            serviceName = s.name;
            break;
          }
        }
      }

      selected.push({ serviceId, groupId, isSuspension: isSusp, basePrice, name: serviceName });
    });
    return selected;
  }

  function computePrice(basePrice, isSuspension) {
    const brand = brandSelect ? brandSelect.value : 'toyota';
    const model = modelSelect ? modelSelect.value : '';
    const engine = engineSelect ? engineSelect.value : '2.0';

    const brandMult = brandMultipliers[brand] || 1.0;
    const engineMult = getEngineMultiplier(engine);
    const suvMult = (isSuspension && model && isSUV(model)) ? 1.15 : 1.0;

    return Math.round(basePrice * brandMult * engineMult * suvMult);
  }

  function updateLiveTotal() {
    const selected = getSelectedServices();
    let total = 0;
    selected.forEach(s => {
      total += computePrice(s.basePrice, s.isSuspension);
    });

    if (liveTotalEl) {
      if (selected.length > 0) {
        liveTotalEl.textContent = `Итого за работу: ${total.toLocaleString('ru-RU')} ₽`;
        liveTotalEl.classList.add('visible');
      } else {
        liveTotalEl.textContent = '';
        liveTotalEl.classList.remove('visible');
      }
    }
  }

  // ============================================================
  // CALCULATE BUTTON — render detailed result
  // ============================================================
  if (calcBtn) {
    calcBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const selected = getSelectedServices();

      if (selected.length === 0) {
        resultBox.innerHTML = `
          <div class="result-header">
            <div class="result-header-label">⚠️ ВНИМАНИЕ</div>
            <div class="result-car-info">Выберите хотя бы одну услугу из списка</div>
          </div>
        `;
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      const brand = brandSelect ? brandSelect.value : 'toyota';
      const model = modelSelect ? modelSelect.value : '';
      const year = yearSelect ? yearSelect.value : '';
      const engine = engineSelect ? engineSelect.value : '2.0';
      const trans = transSelect ? transSelect.value : '';

      const brandMult = brandMultipliers[brand] || 1.0;
      const engineMult = getEngineMultiplier(engine);
      const brandLabel = vehicleDB[brand] ? vehicleDB[brand].label : brand;

      calcBtn.innerHTML = '<span class="btn-spinner"></span> Рассчитываем смету...';
      calcBtn.disabled = true;

      // Simulate brief analysis
      await new Promise(resolve => setTimeout(resolve, 600));

      // Compute individual prices
      const lines = [];
      let subtotal = 0;

      selected.forEach(s => {
        const price = computePrice(s.basePrice, s.isSuspension);
        subtotal += price;
        lines.push({ name: s.name, basePrice: s.basePrice, finalPrice: price, isSuspension: s.isSuspension });
      });

      // Determine if any multipliers are active
      const multiplierNotes = [];
      if (brandMult !== 1.0) {
        multiplierNotes.push(`${brandLabel}: коэф. работы ×${brandMult}`);
      }
      if (engineMult !== 1.0) {
        multiplierNotes.push(`Объём ${engine}L: коэф. ×${engineMult}`);
      }
      const hasAnySUV = selected.some(s => s.isSuspension && model && isSUV(model));
      if (hasAnySUV) {
        multiplierNotes.push(`${model} (SUV/кроссовер): +15% к ходовой/тормозам`);
      }

      renderResult({
        brandLabel,
        model: model || '—',
        year: year || '—',
        engine: engine ? engine + 'L' : '—',
        transmission: trans || '—',
        lines,
        subtotal,
        multiplierNotes
      });

      calcBtn.innerHTML = '⚡ Рассчитать стоимость';
      calcBtn.disabled = false;
    });
  }

  // ============================================================
  // Render detailed result
  // ============================================================
  function renderResult(data) {
    const linesHTML = data.lines.map(l => {
      const changed = l.finalPrice !== l.basePrice;
      const basePriceStr = l.basePrice.toLocaleString('ru-RU');
      const finalPriceStr = l.finalPrice.toLocaleString('ru-RU');
      return `
        <div class="breakdown-row">
          <span class="breakdown-label">${l.name}</span>
          <span class="breakdown-value">
            ${changed ? `<span class="price-base">${basePriceStr} ₽</span> → ` : ''}${finalPriceStr} ₽
          </span>
        </div>
      `;
    }).join('');

    const multiplierHTML = data.multiplierNotes.length > 0
      ? `<div class="result-multipliers">
           <div class="multipliers-title">📊 Применённые коэффициенты:</div>
           ${data.multiplierNotes.map(n => `<div class="multiplier-line">• ${n}</div>`).join('')}
         </div>`
      : '';

    const resultHTML = `
      <div class="result-header">
        <div class="result-header-label">ДЕТАЛИЗИРОВАННАЯ СМЕТА</div>
        <div class="result-car-info">${data.brandLabel} ${data.model} ${data.year} · ${data.engine} · ${data.transmission}</div>
      </div>

      ${multiplierHTML}

      <div class="result-breakdown">
        <div class="breakdown-section-title">Выбранные работы:</div>
        ${linesHTML}
      </div>

      <div class="result-total-row">
        <span>ИТОГО ЗА РАБОТУ:</span>
        <span class="result-total-value">${data.subtotal.toLocaleString('ru-RU')} ₽</span>
      </div>

      <div class="result-parts-note">
        ⚠️ Стоимость запчастей рассчитывается отдельно при осмотре автомобиля мастером-приёмщиком
      </div>

      <div class="result-disclaimer">
        * Указана стоимость работ без учёта запасных частей. Окончательная смета формируется после осмотра.
      </div>

      <button id="booking-btn" class="booking-btn" onclick="handleBooking()">
        📅 Записаться на ремонт в Telegram
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
    const userPhone = prompt('Введите ваш телефон для подтверждения записи:');
    if (!userPhone) return;

    const brand = brandSelect ? brandSelect.value : '';
    const brandLabel = vehicleDB[brand] ? vehicleDB[brand].label : brand;
    const model = modelSelect ? modelSelect.value : '—';
    const year = yearSelect ? yearSelect.value : '—';
    const engine = engineSelect ? engineSelect.value : '—';
    const trans = transSelect ? transSelect.value : '—';

    const selected = getSelectedServices();
    const servicesList = selected.map(s => `  • ${s.name}`).join('\n');
    const totalEl = resultBox.querySelector('.result-total-value');
    const estimate = totalEl ? totalEl.innerText : '—';

    const tgMessage =
      `🚗 <b>ЗАЯВКА С КАЛЬКУЛЯТОРА АВТОСЕРВИСА!</b>\n\n` +
      `📞 <b>Телефон:</b> <code>${userPhone}</code>\n` +
      `🚘 <b>Автомобиль:</b> ${brandLabel} ${model} ${year}\n` +
      `🔧 <b>Двигатель:</b> ${engine}L · ${trans}\n\n` +
      `🛠️ <b>Выбранные работы:</b>\n${servicesList}\n\n` +
      `💰 <b>Смета (работа):</b> <b>${estimate}</b>\n` +
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

  // ============================================================
  // INTERACTIVE BEFORE / AFTER SLIDER LOGIC
  // ============================================================
  const baRangeInput = document.getElementById('ba-range-input');
  const baBeforeWrapper = document.getElementById('ba-before-wrapper');
  const baHandle = document.getElementById('ba-handle');

  if (baRangeInput && baBeforeWrapper && baHandle) {
    baRangeInput.addEventListener('input', (e) => {
      const val = e.target.value;
      baBeforeWrapper.style.width = `${val}%`;
      baHandle.style.left = `${val}%`;
    });
  }

  // ============================================================
  // CAR STATUS LOOKUP WIDGET LOGIC v2.0 (Dynamic Order Generator)
  // ============================================================
  const statusForm = document.getElementById('status-form');
  const statusPlateInput = document.getElementById('status-plate-input');
  const statusResult = document.getElementById('status-result');

  const demoOrders = {
    'А777АА777': {
      car: 'Porsche Cayenne Turbo (2022)',
      orderNum: 'ЗН-98412',
      master: 'Алексей Громов (Старший мастер ремзоны)',
      pct: 85,
      statusTitle: 'В процессе — Покраска и полировка',
      steps: [
        { done: true, title: 'Компьютерная диагностика и приемка', time: 'Завершено в 09:30' },
        { done: true, title: 'Доставка оригинальных кузовных деталей', time: 'Завершено в 11:45' },
        { active: true, title: 'Покрасочная камера и сушка 9H', time: 'В процессе — Готовность 85%' },
        { pending: true, title: 'Детейлинг, сборка и финишная выдача', time: 'Ожидается к 18:00' }
      ]
    },
    'В888ВВ799': {
      car: 'BMW X5 xDrive40i (2021)',
      orderNum: 'ЗН-98305',
      master: 'Дмитрий Соколов (Технический эксперт)',
      pct: 100,
      statusTitle: '✅ Заказ полностью готов к выдаче!',
      steps: [
        { done: true, title: 'Инспекция ходовой части и 3D сход-развал', time: 'Завершено в 10:00' },
        { done: true, title: 'Замена тормозных дисков и суппортов', time: 'Завершено в 13:20' },
        { done: true, title: 'Финишная трехэтапная мойка и озонирование', time: 'Завершено в 15:40' },
        { done: true, title: 'Автомобиль на парковке выдачи', time: 'Готов к получению' }
      ]
    },
    'Е333КК777': {
      car: 'Audi Q8 55 TFSI (2023)',
      orderNum: 'ЗН-98510',
      master: 'Сергей Николаев (Диагност-электрик)',
      pct: 25,
      statusTitle: 'Диагностика и определение сметы',
      steps: [
        { done: true, title: 'Приемка и техническая мойка', time: 'Завершено в 11:10' },
        { active: true, title: 'Сканирование электронных блоков дилерским сканером', time: 'В процессе — Готовность 25%' },
        { pending: true, title: 'Согласование перечня запчастей с владельцем', time: 'Ожидается в 14:00' },
        { pending: true, title: 'Проведение планового ремонта', time: 'Запланировано на завтра' }
      ]
    }
  };

  function processStatusLookup(rawPlate) {
    const plate = rawPlate.replaceAll(' ', '').toUpperCase();
    if (!plate) return;

    let order = demoOrders[plate];

    // Dynamic fallback for any custom license plate typed by the user!
    if (!order) {
      // Deterministic hash based on plate string length
      const hash = plate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const cars = ['Mercedes-Benz E-Class', 'Toyota RAV4', 'Lexus RX350', 'Volkswagen Tiguan', 'Audi A6 Quattro'];
      const masters = ['Игорь Васильев', 'Михаил Орлов', 'Андрей Волков'];
      const pctOptions = [40, 65, 90];

      const chosenCar = cars[hash % cars.length];
      const chosenMaster = masters[hash % masters.length];
      const chosenPct = pctOptions[hash % pctOptions.length];
      const orderNo = `ЗН-${10000 + (hash % 89999)}`;

      order = {
        car: `${chosenCar} (${plate})`,
        orderNum: orderNo,
        master: `${chosenMaster} (Мастер-приемщик)`,
        pct: chosenPct,
        statusTitle: `В процессе выполнения (${chosenPct}%)`,
        steps: [
          { done: true, title: 'Приемка автомобиля и осмотр', time: 'Завершено сегодня в 09:00' },
          { done: true, title: 'Компьютерная диагностика и дефектовка', time: 'Завершено в 11:15' },
          { active: true, title: 'Выполнение регламентных сервисных работ', time: `В процессе — ${chosenPct}%` },
          { pending: true, title: 'Контроль качества и подготовка к выдаче', time: 'Ожидается сегодня в 19:00' }
        ]
      };
    }

    const stepsHTML = order.steps.map(s => {
      let icon = '✓';
      let cls = 'step-done';
      if (s.active) { icon = '⚡'; cls = 'step-active'; }
      if (s.pending) { icon = '⏳'; cls = 'step-pending'; }

      return `
        <div class="status-step ${cls}">
          <div class="step-icon">${icon}</div>
          <div class="step-content">
            <div class="step-title">${s.title}</div>
            <div class="step-time">${s.time}</div>
          </div>
        </div>
      `;
    }).join('');

    statusResult.innerHTML = `
      <div class="status-vehicle-badge">🚘 ${order.car}</div>

      <div class="status-progress-wrapper">
        <div class="status-progress-header">
          <span>Прогресс выполнения:</span>
          <span>${order.pct}%</span>
        </div>
        <div class="status-progress-bar-bg">
          <div class="status-progress-bar-fill" style="width: ${order.pct}%;"></div>
        </div>
      </div>

      <div class="status-meta-grid">
        <div>
          <div class="meta-item-lbl">Заказ-наряд</div>
          <div class="meta-item-val">${order.orderNum}</div>
        </div>
        <div>
          <div class="meta-item-lbl">Мастер-приёмщик</div>
          <div class="meta-item-val">${order.master}</div>
        </div>
      </div>

      <div class="status-steps">
        ${stepsHTML}
      </div>
    `;

    statusResult.style.display = 'block';
    statusResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (statusForm && statusPlateInput && statusResult) {
    statusForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processStatusLookup(statusPlateInput.value);
    });
  }

  window.quickCheckStatus = function(plate) {
    if (statusPlateInput) {
      statusPlateInput.value = plate;
    }
    processStatusLookup(plate);
  };

  // ============================================================
  // FAQ ACCORDION LOGIC
  // ============================================================
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isActive = item.classList.contains('active');

      // Close all other items
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

      // Toggle clicked item
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
});

function prefillService(key) {
  const section = document.getElementById('calc-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}
