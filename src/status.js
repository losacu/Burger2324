// Calcula si el local está abierto según los horarios cargados en el panel (hora de Argentina).
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = { mon: 'lunes', tue: 'martes', wed: 'miércoles', thu: 'jueves', fri: 'viernes', sat: 'sábado', sun: 'domingo' };
const TZ = process.env.TZ_LOCAL || 'America/Argentina/Buenos_Aires';

function nowInTz() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday);
  return { day: wd, minutes: (parseInt(map.hour, 10) % 24) * 60 + parseInt(map.minute, 10) };
}
const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };

// Un turno puede cruzar medianoche (ej. 20:00 a 01:00).
function isWithin(h, minutes) {
  if (!h || !h.open) return false;
  const from = toMin(h.from), to = toMin(h.to);
  return to > from ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

function computeStatus(settings) {
  const hours = settings.hours || {};
  const override = settings.status_override || 'auto';
  const { day, minutes } = nowInTz();
  const todayKey = DAYS[day];
  const yesterdayKey = DAYS[(day + 6) % 7];
  let open = isWithin(hours[todayKey], minutes) || (hours[yesterdayKey] && toMin(hours[yesterdayKey].to) < toMin(hours[yesterdayKey].from) && minutes < toMin(hours[yesterdayKey].to) && hours[yesterdayKey].open);
  if (override === 'open') open = true;
  if (override === 'closed') open = false;

  // próxima apertura
  let next = null;
  if (!open && override !== 'closed') {
    for (let i = 0; i < 7; i++) {
      const k = DAYS[(day + i) % 7];
      const h = hours[k];
      if (!h || !h.open) continue;
      if (i === 0 && minutes >= toMin(h.from)) continue;
      next = { day: k, label: i === 0 ? `hoy a las ${h.from}` : i === 1 ? `mañana a las ${h.from}` : `el ${DAY_NAMES[k]} a las ${h.from}`, from: h.from };
      break;
    }
  }
  const todayHours = hours[todayKey];
  return {
    open,
    override,
    today: todayHours && todayHours.open ? `${todayHours.from} a ${todayHours.to}` : 'cerrado',
    next,
    accepts_orders: open || !!settings.accept_orders_when_closed
  };
}

module.exports = { computeStatus, DAYS, DAY_NAMES };
