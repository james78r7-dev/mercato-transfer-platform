// Modern Support Bar JavaScript with Advanced Features
class ModernSupportBar {
  constructor() {
    this.supporters = [];
    this.isLoading = true;
    this.animationDelay = 0;
    this.init();
  }

  async init() {
    await this.loadSupporters();
    this.startAutoRefresh();
    this.setupEventListeners();
  }

  async loadSupporters() {
    try {
      this.showLoading();

      // محاولة تحميل البيانات من الخادم أولاً
      try {
        const response = await fetch('/api/supporters');
        if (response.ok) {
          const data = await response.json();
          this.supporters = data.supporters || [];
          this.renderSupporters();
          return;
        }
      } catch (serverError) {
        console.warn('Server not available, using test data:', serverError);
      }

      // بيانات تجريبية للاختبار عند عدم توفر الخادم
      const testData = {
        supporters: [
          {
            id: "1",
            name: "Saiftrips",
            alias: "Saiftrips",
            amount: 136,
            thankMessage: "شكراً لك على الدعم المستمر",
            showName: true,
            showAmount: true
          },
          {
            id: "2",
            name: "Naser",
            alias: "Naser",
            amount: 50,
            thankMessage: "أتمنى لك التوفيق",
            showName: true,
            showAmount: true
          },
          {
            id: "3",
            name: "Ahmed Washington",
            alias: "Ahmed Washington",
            amount: 25,
            thankMessage: "",
            showName: true,
            showAmount: true
          },
          {
            id: "4",
            name: "Ghost",
            alias: "Ghost",
            amount: 15,
            thankMessage: "استمر في العمل الرائع",
            showName: true,
            showAmount: true
          },
          {
            id: "5",
            name: "Om3ralwan",
            alias: "Om3ralwan",
            amount: 10,
            thankMessage: "",
            showName: true,
            showAmount: true
          },
          {
            id: "6",
            name: "Syrian",
            alias: "Syrian",
            amount: 8,
            thankMessage: "بالتوفيق",
            showName: true,
            showAmount: true
          },
          {
            id: "7",
            name: "Messi Cruyff",
            alias: "Messi Cruyff",
            amount: 6,
            thankMessage: "",
            showName: true,
            showAmount: true
          },
          {
            id: "8",
            name: "layth lion",
            alias: "layth lion",
            amount: 5,
            thankMessage: "شكراً لك",
            showName: true,
            showAmount: true
          },
          {
            id: "9",
            name: "Florentino Perez",
            alias: "Florentino Perez",
            amount: 3,
            thankMessage: "",
            showName: true,
            showAmount: true
          },
          {
            id: "10",
            name: "Mustafa Ahmed",
            alias: "Mustafa Ahmed",
            amount: 2,
            thankMessage: "",
            showName: true,
            showAmount: true
          }
        ]
      };

      this.supporters = testData.supporters || [];
      this.renderSupporters();
    } catch (error) {
      console.error('Error loading supporters:', error);
      this.showError();
    }
  }

  showLoading() {
    const list = document.getElementById('supportersList');
    list.innerHTML = `
      <div class="loading">
        <span>جاري التحميل...</span>
        <div class="loading-spinner"></div>
      </div>
    `;
  }

  showError() {
    const list = document.getElementById('supportersList');
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-text">حدث خطأ في تحميل البيانات</div>
      </div>
    `;
  }

  showEmptyState() {
    const list = document.getElementById('supportersList');
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💝</div>
        <div class="empty-text">لا يوجد داعمين حالياً</div>
        <div style="font-size: 0.9rem; margin-top: 8px; opacity: 0.7;">
          كن أول داعم!
        </div>
      </div>
    `;
  }

  formatAmount(amount) {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  }

  getInitials(name) {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRandomGradient() {
    const gradients = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #a8edea, #fed6e3)',
      'linear-gradient(135deg, #ff9a9e, #fecfef)',
      'linear-gradient(135deg, #ffecd2, #fcb69f)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  }

  createSupporterElement(supporter, index, isTop) {
    const li = document.createElement('li');
    li.className = 'supporter' + (isTop ? ' top' : '');

    // Privacy settings
    if (supporter.showName === false) li.classList.add('hide-name');
    if (supporter.showAmount === false) li.classList.add('hide-amount');

    // Animation delay
    li.style.animationDelay = `${this.animationDelay}ms`;
    this.animationDelay += 150;

    const initials = this.getInitials(supporter.alias || supporter.name);
    const avatarStyle = this.getRandomGradient();
    const displayName = supporter.alias || supporter.name;
    const formattedAmount = this.formatAmount(supporter.amount);
    const crownIcon = isTop ? '<i class="fas fa-crown crown"></i>' : '';
    const heartIcon = isTop ? '<i class="fas fa-heart" style="color: #FFD700; margin-right: 8px;"></i>' : '';

    li.innerHTML = `
      <div class="supporter-content">
        <div class="supporter-avatar" style="background: ${avatarStyle};">
          ${initials}
        </div>
        <div class="supporter-info">
          <div class="supporter-name">${displayName}</div>
          ${supporter.alias && supporter.alias !== supporter.name ?
            `<div class="supporter-alias">@${supporter.alias}</div>` : ''}
          ${supporter.thankMessage ?
            `<div class="supporter-message">"${supporter.thankMessage}"</div>` : ''}
        </div>
      </div>
      <div class="supporter-amount">
        ${heartIcon}
        <span class="amount-icon">💰</span>
        <span>${formattedAmount}</span>
        ${crownIcon}
      </div>
    `;

    // Add hover effects
    li.addEventListener('mouseenter', () => {
      li.style.transform = 'translateY(-6px) scale(1.03)';
    });

    li.addEventListener('mouseleave', () => {
      li.style.transform = 'translateY(0) scale(1)';
    });

    return li;
  }

  async renderSupporters() {
    const list = document.getElementById('supportersList');

    // Filter and sort supporters
    const activeSupporters = this.supporters
      .filter(s => s.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    if (activeSupporters.length === 0) {
      this.showEmptyState();
      return;
    }

    // Clear loading state
    list.innerHTML = '';
    this.animationDelay = 0;

    // Create supporter elements with staggered animation
    activeSupporters.forEach((supporter, index) => {
      const isTop = index === 0;
      const element = this.createSupporterElement(supporter, index, isTop);
      list.appendChild(element);
    });

    // Add entrance animation
    setTimeout(() => {
      const supporters = list.querySelectorAll('.supporter');
      supporters.forEach((supporter, index) => {
        setTimeout(() => {
          supporter.style.opacity = '1';
          supporter.style.transform = 'translateY(0) scale(1)';
        }, index * 100);
      });
    }, 100);

    // إعادة تشغيل التمرير التلقائي بعد تحديث البيانات
    setTimeout(() => {
      if (window.updateScrollSettings) {
        window.updateScrollSettings();
      }
      // تشغيل التمرير إذا كان مفعلاً
      if (window.scrollSettings && window.scrollSettings.enabled) {
        if (window.startScrolling) {
          window.startScrolling();
        }
      }
    }, 1000);
  }

  startAutoRefresh() {
    // Refresh every 30 seconds
    setInterval(() => {
      this.loadSupporters();
    }, 30000);
  }

  setupEventListeners() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.loadSupporters();
      }
    });

    // Add touch gestures for mobile
    let touchStartY = 0;
    let touchEndY = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartY = e.changedTouches[0].screenY;
    });

    document.addEventListener('touchend', (e) => {
      touchEndY = e.changedTouches[0].screenY;
      this.handleSwipe();
    });

    // Add window focus event to refresh data
    window.addEventListener('focus', () => {
      this.loadSupporters();
    });
  }

  handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = touchEndY - touchStartY;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe down - refresh
        this.loadSupporters();
      }
    }
  }

  // Public method to manually refresh
  refresh() {
    this.loadSupporters();
  }
}

// Initialize the modern support bar
const supportBar = new ModernSupportBar();

// Expose for external use
window.supportBar = supportBar;

// ================== إعدادات التمرير العمودي ==================
(function setupSupportBarSettings() {
  // عناصر الإعدادات
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPopup = document.getElementById('supportBarSettings');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const autoScrollToggle = document.getElementById('autoScrollToggle');
  const scrollTopDuration = document.getElementById('scrollTopDuration');
  const scrollBottomDuration = document.getElementById('scrollBottomDuration');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const supportersList = document.getElementById('supportersList');
  const scrollMoveDuration = document.getElementById('scrollMoveDuration');

  // تحميل الإعدادات من localStorage
  function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('supportBarSettings') || '{}');
    autoScrollToggle.checked = !!settings.autoScroll;
    scrollTopDuration.value = settings.scrollTopDuration || 15;
    scrollBottomDuration.value = settings.scrollBottomDuration || 15;
    scrollMoveDuration.value = settings.scrollMoveDuration || 3;
  }

  // حفظ الإعدادات
  function saveSettings() {
    const settings = {
      autoScroll: autoScrollToggle.checked,
      scrollTopDuration: parseInt(scrollTopDuration.value, 10) || 15,
      scrollBottomDuration: parseInt(scrollBottomDuration.value, 10) || 15,
      scrollMoveDuration: parseInt(scrollMoveDuration.value, 10) || 3
    };
    localStorage.setItem('supportBarSettings', JSON.stringify(settings));
  }

  // إظهار/إخفاء نافذة الإعدادات
  settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsPopup.style.display = 'block';
  });
  closeSettingsBtn.addEventListener('click', () => {
    settingsPopup.style.display = 'none';
  });

  // حفظ وتطبيق الإعدادات
  saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    settingsPopup.style.display = 'none';
    applyAutoScroll();
  });

  // منطق التمرير العمودي التلقائي
  let scrollInterval = null;
  let isAtBottom = false;
  let isPaused = false;

  // دالة حركة عصرية (ease-in-out)
  let scrollAnimating = false;
  let scrollAnimationFrame = null;
  function animateScrollTo(element, to, duration, onComplete) {
    // إلغاء أي حركة سابقة
    if (scrollAnimationFrame) {
      cancelAnimationFrame(scrollAnimationFrame);
      scrollAnimationFrame = null;
    }
    scrollAnimating = true;
    // إعادة حساب layout قبل بدء الحركة للأعلى
    if (to === 0) {
      element.scrollTop = element.scrollTop; // force reflow
    }
    const start = element.scrollTop;
    const change = to - start;
    const startTime = performance.now();
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function animate(now) {
      if (isPaused) { scrollAnimating = false; scrollAnimationFrame = null; return; }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);
      let nextScroll = start + change * ease;
      // تصحيح: إذا اقتربنا جدًا من الهدف، نعتبرها انتهت
      if (Math.abs(nextScroll - to) < 1 || progress >= 1) {
        element.scrollTo({ top: to });
        scrollAnimating = false;
        scrollAnimationFrame = null;
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      element.scrollTo({ top: nextScroll });
      scrollAnimationFrame = requestAnimationFrame(animate);
    }
    scrollAnimationFrame = requestAnimationFrame(animate);
  }

  function applyAutoScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    if (scrollAnimationFrame) {
      cancelAnimationFrame(scrollAnimationFrame);
      scrollAnimationFrame = null;
    }
    supportersList.style.scrollBehavior = 'auto';
    supportersList.scrollTop = 0;
    isAtBottom = false;

    const settings = JSON.parse(localStorage.getItem('supportBarSettings') || '{}');
    if (!settings.autoScroll) return;

    setTimeout(() => {
      if (supportersList.scrollHeight <= supportersList.clientHeight + 5) return;
      let topDuration = (settings.scrollTopDuration || 15) * 1000;
      let bottomDuration = (settings.scrollBottomDuration || 15) * 1000;
      let moveDuration = (settings.scrollMoveDuration || 3) * 1000;
      function scrollLoop() {
        if (!settings.autoScroll) return;
        if (isPaused) {
          scrollInterval = setTimeout(scrollLoop, 500);
          return;
        }
        let target, animDuration, waitDuration;
        if (!isAtBottom) {
          target = supportersList.scrollHeight;
          animDuration = moveDuration;
          animateScrollTo(supportersList, target, animDuration, function() {
            isAtBottom = true;
            scrollInterval = setTimeout(scrollLoop, bottomDuration);
          });
        } else {
          target = 0;
          animDuration = moveDuration;
          animateScrollTo(supportersList, target, animDuration, function() {
            isAtBottom = false;
            scrollInterval = setTimeout(scrollLoop, topDuration);
          });
        }
      }
      scrollInterval = setTimeout(scrollLoop, topDuration);
    }, 500);
  }

  // إيقاف التمرير عند مرور الماوس
  supportersList.addEventListener('mouseenter', () => { isPaused = true; });
  supportersList.addEventListener('mouseleave', () => { isPaused = false; });

  // تطبيق التمرير عند تحميل الصفحة أو تحديث القائمة
  window.applyAutoScroll = applyAutoScroll;
  document.addEventListener('DOMContentLoaded', applyAutoScroll);
  // عند تحديث الداعمين (بعد كل renderSupporters)
  const origRender = ModernSupportBar.prototype.renderSupporters;
  ModernSupportBar.prototype.renderSupporters = async function() {
    await origRender.apply(this, arguments);
    setTimeout(applyAutoScroll, 300);
  };

  // عند تغيير الإعدادات مباشرة
  autoScrollToggle.addEventListener('change', () => {
    if (!autoScrollToggle.checked && scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
      supportersList.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // تدرجات عصرية أعلى وأسفل الشريط
  const barGradientTop = document.getElementById('barGradientTop');
  const barGradientBottom = document.getElementById('barGradientBottom');

  function updateBarGradients() {
    // إظهار التدرج العلوي إذا لم يكن في الأعلى
    if (supportersList.scrollTop > 5) {
      barGradientTop.style.display = 'block';
    } else {
      barGradientTop.style.display = 'none';
    }
    // إظهار التدرج السفلي إذا لم يكن في الأسفل
    if (supportersList.scrollTop + supportersList.clientHeight < supportersList.scrollHeight - 5) {
      barGradientBottom.style.display = 'block';
    } else {
      barGradientBottom.style.display = 'none';
    }
  }
  supportersList.addEventListener('scroll', updateBarGradients);
  // عند تحديث القائمة أو التمرير التلقائي
  setInterval(updateBarGradients, 500);
  document.addEventListener('DOMContentLoaded', updateBarGradients);
})();
