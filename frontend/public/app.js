const dateInput = document.querySelector('#schedule-date');
const scheduleElement = document.querySelector('#schedule');
const notice = document.querySelector('#notice');
const dialog = document.querySelector('#booking-dialog');
const form = document.querySelector('#booking-form');
const customerInput = document.querySelector('#customer-name');
const bookingError = document.querySelector('#booking-error');
const confirmButton = document.querySelector('#confirm-booking');
let selectedSlot = null;
let loadingSequence = 0;
let submitting = false;

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function time(hour) {
  return `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function api(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body.message || 'Unable to complete the request.');
    error.status = response.status;
    throw error;
  }
  return body;
}

function openBooking(advisor, hour, date) {
  selectedSlot = { advisorId: advisor.id, date, hour };
  form.reset();
  bookingError.textContent = '';
  const summary = document.querySelector('#booking-summary');
  summary.replaceChildren(
    element('strong', '', advisor.name),
    element('span', '', advisor.specialty),
    element('span', 'meeting-time', `${displayDate(date)} \u00b7 ${time(hour)} \u2013 ${time(hour + 1)}`),
  );
  dialog.showModal();
  customerInput.focus();
}

function renderSchedule(schedule) {
  const cards = schedule.advisors.map((advisor) => {
    const card = element('article', 'advisor-card');
    const header = element('div', 'advisor-header');
    const initials = advisor.name.split(' ').map((part) => part[0]).join('');
    const avatar = element('span', `avatar avatar-${(advisor.id - 1) % 4}`, initials);
    avatar.setAttribute('aria-hidden', 'true');
    const identity = element('div');
    identity.append(element('h3', '', advisor.name), element('p', 'specialty', advisor.specialty));
    header.append(avatar, identity);
    const count = advisor.slots.filter((slot) => !slot.appointment).length;
    const availability = element('p', 'availability', `${count} available ${count === 1 ? 'appointment' : 'appointments'}`);
    const slots = element('div', 'slots');
    for (const slot of advisor.slots) {
      const booked = Boolean(slot.appointment);
      const button = element('button', `slot${booked ? ' booked' : ''}`);
      button.type = 'button';
      button.append(element('span', 'slot-time', time(slot.hour)));
      button.append(element('span', 'slot-detail', booked ? slot.appointment.customerName : 'Book meeting +'));
      button.disabled = booked;
      button.title = booked
        ? `${time(slot.hour)} \u2013 ${time(slot.hour + 1)}: ${slot.appointment.customerName}`
        : `Book ${advisor.name}, ${time(slot.hour)} \u2013 ${time(slot.hour + 1)}`;
      if (!booked) button.addEventListener('click', () => openBooking(advisor, slot.hour, schedule.date));
      slots.append(button);
    }
    card.append(header, availability, slots);
    return card;
  });
  scheduleElement.replaceChildren(...cards);
}

async function loadSchedule(successMessage = '') {
  const sequence = ++loadingSequence;
  const date = dateInput.value;
  if (!date) {
    notice.textContent = 'Choose a date to view advisor availability.';
    scheduleElement.replaceChildren();
    scheduleElement.setAttribute('aria-busy', 'false');
    return;
  }
  scheduleElement.setAttribute('aria-busy', 'true');
  scheduleElement.replaceChildren();
  notice.className = '';
  notice.textContent = 'Loading advisor availability...';
  document.querySelector('#date-heading').textContent = displayDate(date);
  try {
    const schedule = await api(`/api/schedule?date=${encodeURIComponent(date)}`);
    if (sequence !== loadingSequence) return;
    renderSchedule(schedule);
    notice.textContent = successMessage;
    notice.className = successMessage ? 'success' : '';
  } catch (error) {
    if (sequence !== loadingSequence) return;
    notice.className = 'error';
    notice.replaceChildren(element('span', '', error.message + ' '));
    const retry = element('button', 'retry-button', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', () => loadSchedule());
    notice.append(retry);
  } finally {
    if (sequence === loadingSequence) scheduleElement.setAttribute('aria-busy', 'false');
  }
}

function moveDate(offset) {
  const date = dateInput.value ? new Date(`${dateInput.value}T12:00:00`) : new Date();
  date.setDate(date.getDate() + offset);
  dateInput.value = localDate(date);
  loadSchedule();
}

dateInput.value = localDate();
dateInput.addEventListener('change', () => loadSchedule());
document.querySelector('#previous-day').addEventListener('click', () => moveDate(-1));
document.querySelector('#next-day').addEventListener('click', () => moveDate(1));
document.querySelector('#today').addEventListener('click', () => {
  dateInput.value = localDate();
  loadSchedule();
});
for (const id of ['#close-dialog', '#cancel-booking']) {
  document.querySelector(id).addEventListener('click', () => {
    if (!submitting) dialog.close();
  });
}
dialog.addEventListener('cancel', (event) => {
  if (submitting) event.preventDefault();
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting) return;
  const customerName = customerInput.value.trim();
  if (!customerName) {
    bookingError.textContent = 'Enter a customer name.';
    customerInput.focus();
    return;
  }
  submitting = true;
  confirmButton.disabled = true;
  confirmButton.textContent = 'Booking...';
  bookingError.textContent = '';
  try {
    await api('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selectedSlot, customerName }),
    });
    dialog.close();
    await loadSchedule(`Appointment confirmed for ${customerName}.`);
  } catch (error) {
    bookingError.textContent = error.message;
    if (error.status === 409) {
      dialog.close();
      await loadSchedule();
      notice.className = 'error';
      notice.textContent = error.message;
    }
  } finally {
    submitting = false;
    confirmButton.disabled = false;
    confirmButton.textContent = 'Confirm appointment';
  }
});

loadSchedule();
