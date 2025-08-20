// Modern Supporters Admin JavaScript with Advanced Features
class ModernSupportersAdmin {
  constructor() {
    this.form = document.getElementById('supporterForm');
    this.tableBody = document.getElementById('supportersTableBody');
    this.periodSelect = document.getElementById('period');
    this.startDateInput = document.getElementById('startDate');
    this.endDateInput = document.getElementById('endDate');
    this.editingId = null;
    this.supporters = [];
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSupporters();
    this.updateStats();
  }

  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Period selector
    this.periodSelect.addEventListener('change', () => this.handlePeriodChange());
    this.startDateInput.addEventListener('change', () => this.loadSupporters());
    this.endDateInput.addEventListener('change', () => this.loadSupporters());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        this.loadSupporters();
      }
    });
  }

  async loadSupporters() {
    try {
      this.showLoading();
      const range = this.getPeriodRange();
      let url = '/api/supporters';
      if (range.start && range.end) {
        url += `?start=${range.start}&end=${range.end}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.supporters = data.supporters || [];

      this.renderTable();
      this.updateStats();
    } catch (error) {
      console.error('Error loading supporters:', error);
      this.showError();
    }
  }

  showLoading() {
    this.tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="loading">
          <span>جاري التحميل...</span>
          <div class="loading-spinner"></div>
        </td>
      </tr>
    `;
  }

  showError() {
    this.tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-text">حدث خطأ في تحميل البيانات</div>
        </td>
      </tr>
    `;
  }

  showEmptyState() {
    this.tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <div class="empty-icon">💝</div>
          <div class="empty-text">لا يوجد داعمين في هذه الفترة</div>
        </td>
      </tr>
    `;
  }

  getPeriodRange() {
    const now = new Date();
    if (this.periodSelect.value === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (this.periodSelect.value === '7days') {
      const end = now;
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString(), end: end.toISOString() };
    } else if (this.periodSelect.value === 'custom') {
      return { start: this.startDateInput.value, end: this.endDateInput.value };
    }
    return {};
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

  renderTable() {
    if (this.supporters.length === 0) {
      this.showEmptyState();
      return;
    }

    this.tableBody.innerHTML = '';

    this.supporters.forEach((supporter, index) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = `${index * 50}ms`;
      tr.className = 'fade-in';

      const displayName = supporter.alias || supporter.name;
      const displayAmount = supporter.showAmount === false ? '—' : this.formatAmount(supporter.amount);
      const displayAlias = supporter.alias || '';
      const displayMessage = supporter.thankMessage || '';

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: linear-gradient(135deg, #667eea, #764ba2);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
              font-size: 0.9rem;
            ">
              ${this.getInitials(displayName)}
            </div>
            <div>
              <div style="font-weight: 600; color: #333;">${displayName}</div>
              ${supporter.alias && supporter.alias !== supporter.name ?
                `<div style="font-size: 0.85rem; color: #666;">@${supporter.alias}</div>` : ''}
            </div>
          </div>
        </td>
        <td>
          <span style="
            font-weight: 600;
            color: #4CAF50;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <span>💰</span>
            ${displayAmount}
          </span>
        </td>
        <td>${displayAlias}</td>
        <td>
          ${displayMessage ?
            `<span style="
              font-style: italic;
              color: #666;
              background: rgba(102, 126, 234, 0.1);
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 0.9rem;
            ">"${displayMessage}"</span>` :
            '<span style="color: #999;">-</span>'
          }
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-warning" onclick="supportersAdmin.startEdit('${supporter.id}')">
              <i class="fas fa-edit"></i>
              تعديل
            </button>
            <button class="btn btn-danger" onclick="supportersAdmin.deleteSupporter('${supporter.id}')">
              <i class="fas fa-trash"></i>
              حذف
            </button>
          </div>
        </td>
      `;

      this.tableBody.appendChild(tr);
    });
  }

  getInitials(name) {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  updateStats() {
    const totalSupporters = this.supporters.length;
    const totalAmount = this.supporters.reduce((sum, s) => sum + (s.amount || 0), 0);
    const topSupporter = this.supporters.length > 0 ?
      (this.supporters[0].alias || this.supporters[0].name) : '-';

    // Calculate this month's amount
    const now = new Date();
    const thisMonth = this.supporters
      .filter(s => {
        const supporterDate = new Date(s.date || Date.now());
        return supporterDate.getMonth() === now.getMonth() &&
               supporterDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    document.getElementById('totalSupporters').textContent = totalSupporters;
    document.getElementById('totalAmount').textContent = this.formatAmount(totalAmount);
    document.getElementById('topSupporter').textContent = topSupporter;
    document.getElementById('thisMonth').textContent = this.formatAmount(thisMonth);
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    try {
      const supporter = {
        name: this.form.name.value,
        amount: parseFloat(this.form.amount.value),
        alias: this.form.alias.value,
        thankMessage: this.form.thankMessage.value,
        showName: this.form.showName.checked,
        showAmount: this.form.showAmount.checked
      };

      if (this.editingId) {
        const response = await fetch(`/api/supporters/${this.editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(supporter)
        });

        if (response.ok) {
          this.showMessage('تم تحديث الداعم بنجاح!', 'success');
          this.resetForm();
        } else {
          throw new Error('Failed to update supporter');
        }
      } else {
        const response = await fetch('/api/supporters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(supporter)
        });

        if (response.ok) {
          this.showMessage('تم إضافة الداعم بنجاح!', 'success');
          this.resetForm();
        } else {
          throw new Error('Failed to add supporter');
        }
      }

      await this.loadSupporters();
    } catch (error) {
      console.error('Error saving supporter:', error);
      this.showMessage('حدث خطأ في حفظ البيانات', 'error');
    }
  }

  startEdit(supporterId) {
    const supporter = this.supporters.find(s => s.id === supporterId);
    if (!supporter) return;

    this.editingId = supporterId;
    this.form.name.value = supporter.name;
    this.form.amount.value = supporter.amount;
    this.form.alias.value = supporter.alias || '';
    this.form.thankMessage.value = supporter.thankMessage || '';
    this.form.showName.checked = supporter.showName !== false;
    this.form.showAmount.checked = supporter.showAmount !== false;

    // تغيير نص الزر
    const submitBtn = this.form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';

    // تمرير إلى أعلى الصفحة
    this.form.scrollIntoView({ behavior: 'smooth' });
  }

  async deleteSupporter(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الداعم؟')) {
      return;
    }

    try {
      const response = await fetch(`/api/supporters/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.showMessage('تم حذف الداعم بنجاح!', 'success');
        await this.loadSupporters();
      } else {
        throw new Error('Failed to delete supporter');
      }
    } catch (error) {
      console.error('Error deleting supporter:', error);
      this.showMessage('حدث خطأ في حذف الداعم', 'error');
    }
  }

  handlePeriodChange() {
    if (this.periodSelect.value === 'custom') {
      this.startDateInput.style.display = 'inline-block';
      this.endDateInput.style.display = 'inline-block';
    } else {
      this.startDateInput.style.display = 'none';
      this.endDateInput.style.display = 'none';
    }

    this.loadSupporters();
  }

  showMessage(text, type) {
    // إزالة الرسائل السابقة
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      ${text}
    `;

    // إضافة الرسالة في بداية الصفحة
    const container = document.querySelector('.admin-container');
    container.insertBefore(message, container.firstChild);

    // إزالة الرسالة بعد 5 ثوان
    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  resetForm() {
    this.editingId = null;
    this.form.reset();

    // إعادة تعيين نص الزر
    const submitBtn = this.form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة داعم';
  }
}

// إنشاء كائن إدارة الداعمين
const supportersAdmin = new ModernSupportersAdmin();

// إضافة الكائن للاستخدام العام
window.supportersAdmin = supportersAdmin;

// دالة تحديث البيانات (للاستخدام الخارجي)
function refreshData() {
  if (window.supportersAdmin) {
    window.supportersAdmin.loadSupporters();
  }
}

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
  .fade-in {
    animation: fadeIn 0.5s ease-in-out forwards;
    opacity: 0;
    transform: translateY(20px);
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);
