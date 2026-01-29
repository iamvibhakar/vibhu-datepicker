export default class VibhuDatepicker {
  constructor(input, options = {}) {
    this.input =
      typeof input === 'string'
        ? document.querySelector(input)
        : input;

    this.options = {
      theme: 'light',
      selectionMode: 'single',
      closeOnSelect: undefined,
      multipleDelimiter: ', ',
      onSelect: () => {},
      ...options
    };

    if (this.options.closeOnSelect === undefined) {
      this.options.closeOnSelect = this.options.selectionMode !== 'multiple';
    }

    this.current = new Date();
    this.selectedKeys = [];
    this.selectedSet = new Set();

    this.bootstrapSelection();
    this.mount();
  }

  mount() {
    this.root = document.createElement('div');
    this.root.className = `vdp ${this.options.theme}`;

    this.calendar = document.createElement('div');
    this.calendar.className = 'vdp-calendar';

    this.render();

    document.body.appendChild(this.root);
    this.root.appendChild(this.calendar);

    this.position();
    this.bindEvents();
  }

  position() {
    const r = this.input.getBoundingClientRect();
    this.root.style.top = r.bottom + window.scrollY + 'px';
    this.root.style.left = r.left + window.scrollX + 'px';
  }

  render() {
    const y = this.current.getFullYear();
    const m = this.current.getMonth();
    const monthLabel = this.monthName(m);

    this.calendar.innerHTML = `
      <div class="vdp-header">
        <button class="vdp-nav" data-prev aria-label="Previous month">&lsaquo;</button>
        <div class="vdp-title">
          <span class="vdp-month">${monthLabel}</span>
          <span class="vdp-year">${y}</span>
        </div>
        <button class="vdp-nav" data-next aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="vdp-weekdays">
        ${this.weekdays().map(day => `<div>${day}</div>`).join('')}
      </div>
      <div class="vdp-grid">
        ${this.days(y, m)}
      </div>
      <div class="vdp-footer">
        ${this.options.selectionMode === 'multiple' ? '<span class="vdp-hint">Select multiple dates</span>' : '<span class="vdp-hint">Select a date</span>'}
        <button class="vdp-clear" data-clear>Clear</button>
      </div>
    `;
  }

  days(year, month) {
    const total = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const todayKey = this.formatDateKey(new Date());
    let html = '';

    for (let i = 0; i < firstDay; i++) {
      html += '<span class="vdp-empty"></span>';
    }

    for (let d = 1; d <= total; d++) {
      const key = this.formatDateKey(new Date(year, month, d));
      const classes = ['vdp-day'];
      if (key === todayKey) classes.push('is-today');
      if (this.selectedSet.has(key)) classes.push('is-selected');

      html += `<button class="${classes.join(' ')}" data-day="${d}" data-date="${key}">${d}</button>`;
    }
    return html;
  }

  bindEvents() {
    this.calendar.onclick = e => {
      if (e.target.dataset.day) {
        const selected = new Date(
          this.current.getFullYear(),
          this.current.getMonth(),
          e.target.dataset.day
        );
        const key = e.target.dataset.date || this.formatDateKey(selected);

        this.handleSelection(key, selected);
      }

      if (e.target.dataset.prev !== undefined) {
        this.current.setMonth(this.current.getMonth() - 1);
        this.render();
      }

      if (e.target.dataset.next !== undefined) {
        this.current.setMonth(this.current.getMonth() + 1);
        this.render();
      }

      if (e.target.dataset.clear !== undefined) {
        this.clearSelection();
      }
    };
  }

  destroy() {
    this.root.remove();
  }

  weekdays() {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }

  monthName(index) {
    return [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ][index];
  }

  formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  bootstrapSelection() {
    if (!this.input || !this.input.value) return;

    if (this.options.selectionMode === 'multiple') {
      const parts = this.input.value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
      parts.forEach(key => this.addSelection(key));
    } else {
      this.addSelection(this.input.value.trim());
    }
  }

  addSelection(key) {
    if (!key) return;
    if (!this.selectedSet.has(key)) {
      this.selectedSet.add(key);
      this.selectedKeys.push(key);
    }
  }

  removeSelection(key) {
    if (!this.selectedSet.has(key)) return;
    this.selectedSet.delete(key);
    this.selectedKeys = this.selectedKeys.filter(item => item !== key);
  }

  handleSelection(key, date) {
    if (this.options.selectionMode === 'multiple') {
      if (this.selectedSet.has(key)) {
        this.removeSelection(key);
      } else {
        this.addSelection(key);
      }
    } else {
      this.selectedKeys = [key];
      this.selectedSet = new Set([key]);
    }

    this.syncInput();
    this.options.onSelect(this.getSelected());

    if (this.options.closeOnSelect) {
      this.destroy();
    } else {
      this.render();
    }
  }

  clearSelection() {
    this.selectedKeys = [];
    this.selectedSet.clear();
    this.syncInput();
    this.options.onSelect(this.getSelected());
    this.render();
  }

  syncInput() {
    if (!this.input) return;

    if (this.options.selectionMode === 'multiple') {
      this.input.value = this.selectedKeys.join(this.options.multipleDelimiter);
    } else {
      this.input.value = this.selectedKeys[0] || '';
    }
  }

  getSelected() {
    if (this.options.selectionMode === 'multiple') {
      return this.selectedKeys.map(key => new Date(`${key}T00:00:00`));
    }

    if (!this.selectedKeys[0]) return null;
    return new Date(`${this.selectedKeys[0]}T00:00:00`);
  }
}
