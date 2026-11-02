const SPREADSHEET_ID = '1JgSH_2mFlW27Tt2JOvM2oeCvsLW5YcbXQIdWuir2UAo';
const ENTRY_TAB = 'Giveaway Entries';
const HEADERS = ['Submitted at (UTC)', 'Full name', 'Email', 'Phone', 'Preference', 'Contact consent'];

function doGet() {
  return json_({ok: false, message: 'Use the website form.'});
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('GIVEAWAY_API_SECRET');
    if (!secret || request.secret !== secret) return json_({ok: false, message: 'Unauthorized request.'});
    return json_(submitEntry_(request.entry));
  } catch (error) {
    return json_({ok: false, message: 'Invalid request.'});
  }
}

// Run once in the editor to authorize access and create the entry tab.
// Keep this name visible in the Apps Script editor's Run dropdown.
function setup() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    getEntrySheet_();
  } finally {
    lock.releaseLock();
  }
}

function getEntrySheet_() {
  const book = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = book.getSheetByName(ENTRY_TAB);
  if (!sheet) sheet = book.insertSheet(ENTRY_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  const actual = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (actual.some((value, index) => value !== HEADERS[index])) {
    throw new Error('Entry tab headers differ from the expected layout.');
  }
  return sheet;
}

function textCell_(value) {
  // Prevent user input from being interpreted as a spreadsheet formula.
  return /^[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
}

function phoneKey_(value) {
  return String(value).replace(/^'/, '').replace(/\D/g, '');
}

function submitEntry_(payload) {
  if (!payload || typeof payload !== 'object') return {ok: false, message: 'Please complete all fields.'};
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const preference = payload.preference;
  if (!name || name.length > 120 || /[\r\n]/.test(name) || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^[0-9+() .-]{7,20}$/.test(phone) || phoneKey_(phone).length < 7 ||
      !['either', 'online', 'offline'].includes(preference) || payload.consent !== true) {
    return {ok: false, message: 'Please enter a valid name, email and phone number, choose a membership preference, and agree to be contacted.'};
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return {ok: false, message: 'The form is busy. Please try again in a moment.'};
  try {
    const sheet = getEntrySheet_();
    const count = sheet.getLastRow() - 1;
    const existing = count > 0 ? sheet.getRange(2, 3, count, 2).getValues() : [];
    if (existing.some(row => String(row[0]).replace(/^'/, '').toLowerCase() === email || phoneKey_(row[1]) === phoneKey_(phone))) {
      return {ok: false, message: 'An entry with this email or phone number already exists. Only one entry per person is allowed.'};
    }
    sheet.appendRow([new Date().toISOString(), textCell_(name), textCell_(email), textCell_(phone), preference, 'Yes']);
    SpreadsheetApp.flush();
    return {ok: true};
  } catch (error) {
    console.error('Giveaway save failed: ' + error.message);
    return {ok: false, message: 'We could not save your entry. Please try again shortly.'};
  } finally {
    lock.releaseLock();
  }
}
