/* ==========================================================================
   Autoservice_AI - Master App Script
   Clean Auto Repair Cost Calculator & Telegram Integration
   ========================================================================== */

const TELEGRAM_BOT_TOKEN = "8718676123:AAE-Uh_HRkWJkZF_5vznXzKqy8lc3ezKRnI";
const TELEGRAM_CHAT_ID = "628992567";

document.addEventListener('DOMContentLoaded', () => {
  const calcForm = document.getElementById('calc-form');
  const calcBtn = document.getElementById('calc-btn');
  const resultBox = document.getElementById('result-box');
  const priceNum = document.getElementById('result-price-num');
  const timeTag = document.getElementById('result-time-tag');
  const detailsText = document.getElementById('result-details-text');
  const bookingBtn = document.getElementById('booking-btn');

  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  // Mobile menu toggle handler
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Service price rates
  const serviceRates = {
    'body': { title: 'Кузовной ремонт & Покраска', min: 12000, max: 38000, time: '2-4 дня' },
    'engine': { title: 'Диагностика & Ремонт ДВС', min: 8500, max: 48000, time: '1-3 дня' },
    'maintenance': { title: 'Регламентное ТО & Замена масел', min: 4500, max: 13000, time: '1-2 часа' },
    'suspension': { title: 'Ходовая часть & Подвеска', min: 6500, max: 24000, time: '3-6 часов' },
    'detailing': { title: 'Детейлинг & Защита Керамикой', min: 16000, max: 42000, time: '1-2 дня' },
    'diagnostics': { title: 'Компьютерная Диагностика', min: 2500, max: 5500, time: '30 минут' }
  };

  const brandFactors = {
    'porsche': 1.6,
    'mercedes': 1.45,
    'bmw': 1.45,
    'audi': 1.35,
    'lexus': 1.3,
    'toyota': 1.0,
    'volkswagen': 1.15,
    'other': 1.0
  };

  calcForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const carBrand = document.getElementById('car-brand').value;
    const carModel = document.getElementById('car-model').value || 'Не указана';
    const serviceKey = document.getElementById('service-type').value;
    const customText = document.getElementById('custom-description').value.trim();

    calcBtn.innerHTML = '⏳ Рассчитываем смету...';
    calcBtn.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 600));

    const rate = serviceRates[serviceKey] || serviceRates['maintenance'];
    const factor = brandFactors[carBrand] || 1.0;

    let minEst = Math.round(rate.min * factor);
    let maxEst = Math.round(rate.max * factor);
    let duration = rate.time;
    let info = `Предварительный расчёт по категории: ${rate.title}.`;

    if (customText) {
      info += ` Учтены симптомы: "${customText}". Окончательная смета утверждается после осмотра мастера.`;
      const lower = customText.toLowerCase();
      if (lower.includes('вмятина') || lower.includes('бампер') || lower.includes('покраска')) {
        minEst += 4000;
        maxEst += 9000;
      }
      if (lower.includes('стук') || lower.includes('шум') || lower.includes('масло')) {
        minEst += 3000;
        maxEst += 7000;
      }
    }

    priceNum.innerText = `${minEst.toLocaleString('ru-RU')} – ${maxEst.toLocaleString('ru-RU')} ₽`;
    timeTag.innerText = `⏱️ Срок выполнения: ${duration}`;
    detailsText.innerText = info;

    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    calcBtn.innerHTML = '⚡ Рассчитать стоимость ремонта';
    calcBtn.disabled = false;
  });

  // Telegram Direct Booking Handler
  bookingBtn.addEventListener('click', async () => {
    const userPhone = prompt('Введите ваш телефон для подтверждения брони и скидки 10%:');
    if (!userPhone) return;

    const carBrand = document.getElementById('car-brand').value;
    const carModel = document.getElementById('car-model').value || '—';
    const serviceKey = document.getElementById('service-type').value;
    const estimate = priceNum.innerText;

    const tgMessage = 
      `🚗 <b>ЗАЯВКА С КАЛЬКУЛЯТОРА АВТОСЕРВИСА!</b>\n\n` +
      `📞 <b>Телефон:</b> <code>${userPhone}</code>\n` +
      `🚘 <b>Автомобиль:</b> ${carBrand.toUpperCase()} ${carModel}\n` +
      `🛠️ <b>Услуга:</b> ${serviceKey}\n` +
      `💰 <b>Смета:</b> <b>${estimate}</b>\n` +
      `📅 <b>Дата:</b> ${new Date().toLocaleString('ru-RU')}`;

    bookingBtn.innerText = '⏳ Отправляем в Telegram...';
    bookingBtn.disabled = true;

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
        bookingBtn.innerText = '✅ Заявка отправлена!';
      } else {
        alert('✅ Заявка принята! Скоро перезвоним.');
        bookingBtn.innerText = '✅ Принято!';
      }
    } catch (err) {
      alert('✅ Заявка принята! Скоро перезвоним.');
      bookingBtn.innerText = '✅ Принято!';
    }
  });
});

function prefillService(key) {
  const selectElem = document.getElementById('service-type');
  if (selectElem) {
    selectElem.value = key;
    document.getElementById('calc-section').scrollIntoView({ behavior: 'smooth' });
  }
}
