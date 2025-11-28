/* script.js
  Versi lengkap fitur: LocalStorage, Chart, Dark mode, validation, search, sort, export, file upload
*/

/* ---------- Data model & storage ---------- */
const STORAGE_KEY = 'crud_students_v1';
const THEME_KEY = 'crud_theme_v1';

let students = [];
let idCounter = 1;

/* Example sample data (only if localStorage kosong) */
const sample = [
  { id: 1, name: "Andi Wijaya", nim: "2411501001", prodi: "Teknik Informatika", photo: "" },
  { id: 2, name: "Siti Nur", nim: "2411501002", prodi: "Sistem Informasi", photo: "" },
  { id: 3, name: "Wahyu Hidayat", nim: "2411501010", prodi: "TI", photo: "" }
];

/* ---------- DOM refs ---------- */
const tableBody = document.getElementById('tableBody');
const totalCountEl = document.getElementById('totalCount');
const totalCountDash = document.getElementById('totalCountDash');
const notifCount = document.getElementById('notifCount');

const formAdd = document.getElementById('formAdd');
const inputName = document.getElementById('inputName');
const inputNim = document.getElementById('inputNim');
const inputProdi = document.getElementById('inputProdi');
const inputPhoto = document.getElementById('inputPhoto');

const formEdit = document.getElementById('formEdit');
const editId = document.getElementById('editId');
const editName = document.getElementById('editName');
const editNim = document.getElementById('editNim');
const editProdi = document.getElementById('editProdi');
const editPhoto = document.getElementById('editPhoto');
const editPreview = document.getElementById('editPreview');

const searchInput = document.getElementById('searchInput');
const sortableHeaders = document.querySelectorAll('th.sortable');

let currentDeleteId = null;
let sortState = { key: null, asc: true };

/* Bootstrap modals */
const editModalEl = document.getElementById('editModal');
const editModal = new bootstrap.Modal(editModalEl, { keyboard: true });
const deleteModalEl = document.getElementById('deleteModal');
const deleteModal = new bootstrap.Modal(deleteModalEl, { keyboard: true });

/* Chart */
let chartProdi = null;

/* ---------- Utility ---------- */
function saveToStorage(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ students, idCounter }));
}
function loadFromStorage(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{
      const obj = JSON.parse(raw);
      students = obj.students || [];
      idCounter = obj.idCounter || (students.length + 1);
      return;
    }catch(e){ console.warn('parse storage fail', e); }
  }
  // initialize with sample
  students = sample.slice();
  idCounter = students.length + 1;
  saveToStorage();
}
function setTheme(theme){
  if(theme === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  localStorage.setItem(THEME_KEY, theme);
}
function loadTheme(){
  const t = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(t);
}

/* Simple escape for text fields */
function escapeHtml(unsafe) {
  return String(unsafe||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
}

/* ---------- Render (READ) ---------- */
function renderTable(filterText = ''){
  tableBody.innerHTML = '';
  let list = students.slice();

  // filter
  if(filterText){
    const q = filterText.toLowerCase();
    list = list.filter(s => (s.name||'').toLowerCase().includes(q) || (s.nim||'').toLowerCase().includes(q));
  }

  // sort
  if(sortState.key){
    list.sort((a,b)=>{
      let A = (a[sortState.key]||'').toString().toLowerCase();
      let B = (b[sortState.key]||'').toString().toLowerCase();
      if(A < B) return sortState.asc ? -1:1;
      if(A > B) return sortState.asc ? 1:-1;
      return 0;
    });
  }

  list.forEach((s, idx)=>{
    const tr = document.createElement('tr');
    const fotoHtml = s.photo ? `<img class="thumb" src="${s.photo}" alt="foto"/>` : '';
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.nim)}</td>
      <td>${escapeHtml(s.prodi)}</td>
      <td class="text-center">${fotoHtml}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" data-id="${s.id}" data-action="edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-id="${s.id}" data-action="delete"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  const total = students.length;
  document.getElementById('totalCount').textContent = total;
  totalCountDash.textContent = total;
  notifCount.textContent = total;
  saveToStorage();
  updateChart();
}

/* ---------- CREATE (Add) ---------- */
formAdd.addEventListener('submit', function(e){
  e.preventDefault();
  // validation
  const name = inputName.value.trim();
  const nim = inputNim.value.trim();
  const prodi = inputProdi.value.trim();

  if(name.length < 3){ alert('Nama minimal 3 karakter'); return; }
  if(!/^\d+$/.test(nim)){ alert('NIM harus angka'); return; }
  if(prodi.length === 0){ alert('Prodi harus diisi'); return; }

  // photo to base64 if any
  const file = inputPhoto.files[0];
  if(file){
    const reader = new FileReader();
    reader.onload = function(evt){
      const photo = evt.target.result;
      pushNew(name, nim, prodi, photo);
      formAdd.reset();
    }
    reader.readAsDataURL(file);
  } else {
    pushNew(name, nim, prodi, '');
    formAdd.reset();
  }
});
function pushNew(name,nim,prodi,photo){
  const newStudent = { id: idCounter++, name, nim, prodi, photo };
  students.push(newStudent);
  renderTable(searchInput.value.trim());
}

/* ---------- Delegated Edit/Delete buttons ---------- */
tableBody.addEventListener('click', function(e){
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.getAttribute('data-action');
  const id = Number(btn.getAttribute('data-id'));
  if(action === 'edit') openEditModal(id);
  else if(action === 'delete') openDeleteModal(id);
});

/* ---------- EDIT ---------- */
function openEditModal(id){
  const s = students.find(x => x.id === id);
  if(!s) return;
  editId.value = s.id;
  editName.value = s.name;
  editNim.value = s.nim;
  editProdi.value = s.prodi;
  editPreview.src = s.photo || '';
  editPreview.style.display = s.photo ? 'block' : 'none';
  editModal.show();
}
editPhoto.addEventListener('change', function(){
  const file = this.files[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = e => {
    editPreview.src = e.target.result;
    editPreview.style.display = 'block';
  }
  r.readAsDataURL(file);
});
formEdit.addEventListener('submit', function(e){
  e.preventDefault();
  const id = Number(editId.value);
  const idx = students.findIndex(x => x.id === id);
  if(idx === -1) return;
  // validation
  if(editName.value.trim().length < 3){ alert('Nama minimal 3 karakter'); return; }
  if(!/^\d+$/.test(editNim.value.trim())){ alert('NIM harus angka'); return; }
  if(editProdi.value.trim().length === 0){ alert('Prodi harus diisi'); return; }

  const file = editPhoto.files[0];
  if(file){
    const r = new FileReader();
    r.onload = e => {
      students[idx].photo = e.target.result;
      students[idx].name = editName.value.trim();
      students[idx].nim = editNim.value.trim();
      students[idx].prodi = editProdi.value.trim();
      renderTable(searchInput.value.trim());
      editModal.hide();
    }
    r.readAsDataURL(file);
  } else {
    students[idx].name = editName.value.trim();
    students[idx].nim = editNim.value.trim();
    students[idx].prodi = editProdi.value.trim();
    renderTable(searchInput.value.trim());
    editModal.hide();
  }
});

/* ---------- DELETE ---------- */
function openDeleteModal(id){
  currentDeleteId = id;
  deleteModal.show();
}
document.getElementById('confirmDelete').addEventListener('click', function(){
  if(currentDeleteId === null) return;
  students = students.filter(x => x.id !== currentDeleteId);
  currentDeleteId = null;
  renderTable(searchInput.value.trim());
  deleteModal.hide();
});

/* ---------- Search ---------- */
searchInput.addEventListener('input', function(){
  const q = this.value.trim();
  renderTable(q);
});

/* ---------- Sorting ---------- */
document.getElementById('sortName').addEventListener('click', ()=> toggleSort('name'));
document.getElementById('sortNim').addEventListener('click', ()=> toggleSort('nim'));
sortableHeaders.forEach(h => {
  h.addEventListener('click', ()=> {
    const key = h.getAttribute('data-sort');
    if(key) toggleSort(key);
  });
});
function toggleSort(key){
  if(sortState.key === key) sortState.asc = !sortState.asc;
  else { sortState.key = key; sortState.asc = true; }
  renderTable(searchInput.value.trim());
}

/* ---------- Sidebar navigation & UI ---------- */
const menuItems = document.querySelectorAll(".menu-item");
const pages = {
  dashboard: document.getElementById("pageDashboard"),
  mahasiswa: document.getElementById("pageMahasiswa"),
  pengaturan: document.getElementById("pagePengaturan"),
};
function showPage(pageName){
  Object.keys(pages).forEach(pg => pages[pg].classList.add("d-none"));
  pages[pageName].classList.remove("d-none");
  menuItems.forEach(i => i.classList.remove("active"));
  document.querySelector(`.menu-item[data-page="${pageName}"]`).classList.add("active");
  document.querySelector('.page-title').textContent = pageName === 'dashboard' ? 'Dashboard Admin' : (pageName === 'mahasiswa' ? 'Data Mahasiswa' : 'Pengaturan');
}
menuItems.forEach(item => item.addEventListener('click', ()=> showPage(item.getAttribute('data-page'))));
showPage('mahasiswa');

/* Sidebar toggle/minimize */
$('#toggleSidebar').on('click', function(){
  $('#sidebar').toggleClass('hidden');
  $('main').toggleClass('full');
  $(this).text($('#sidebar').hasClass('hidden') ? 'Tampilkan Sidebar' : 'Sembunyikan Sidebar');
});
$('#btnToggle').on('click', function(){
  if(window.matchMedia('(max-width: 767.98px)').matches) $('#sidebar').toggleClass('show-mobile');
  else { $('#sidebar').toggleClass('hidden'); $('main').toggleClass('full'); }
});
$('#minimizeBtn').on('click', function(){
  $('#sidebar').toggleClass('min');
});

/* ---------- Chart ---------- */
function updateChart(){
  const ctx = document.getElementById('chartProdi');
  const map = {};
  students.forEach(s => {
    const p = s.prodi || 'Unknown';
    map[p] = (map[p] || 0) + 1;
  });
  const labels = Object.keys(map);
  const data = labels.map(l => map[l]);

  if(chartProdi){
    chartProdi.data.labels = labels;
    chartProdi.data.datasets[0].data = data;
    chartProdi.update();
  } else {
    chartProdi = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Jumlah Mahasiswa per Prodi', data, backgroundColor: 'rgba(54,162,235,0.7)' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
}

/* ---------- Export CSV & PDF ---------- */
function exportCSV(){
  const header = ['id','name','nim','prodi'];
  const rows = students.map(s => [s.id, s.name, s.nim, s.prodi]);
  const csv = [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mahasiswa.csv';
  a.click();
  URL.revokeObjectURL(url);
}
document.getElementById('exportCsv').addEventListener('click', exportCSV);

async function exportPDF(){
  // simple pdf of table using jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('Daftar Mahasiswa', 14, 16);
  let y = 26;
  students.forEach((s, idx)=>{
    const line = `${idx+1}. ${s.name} | ${s.nim} | ${s.prodi}`;
    doc.text(line, 14, y);
    y += 8;
    if(y > 280){ doc.addPage(); y = 20; }
  });
  doc.save('mahasiswa.pdf');
}
document.getElementById('exportPdf').addEventListener('click', exportPDF);

/* ---------- Settings ---------- */
document.getElementById('themeToggle').addEventListener('click', function(){
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
});
document.getElementById('themeLight').addEventListener('click', ()=> setTheme('light'));
document.getElementById('themeDark').addEventListener('click', ()=> setTheme('dark'));

document.getElementById('resetData').addEventListener('click', ()=>{
  if(confirm('Hapus semua data?')){ students = []; idCounter = 1; saveToStorage(); renderTable(); }
});

/* ---------- Initialization ---------- */
function init(){
  loadTheme();
  loadFromStorage();
  renderTable();
  // chart will be created in renderTable -> updateChart
}
document.addEventListener('DOMContentLoaded', init);
