const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: portal card text-blue-200 -> text-emerald-200
const before1 = 'text-[11px] text-blue-200 mt-0.5 capitalize';
const after1  = 'text-[11px] text-emerald-200 mt-0.5 capitalize';
if (content.includes(before1)) {
  content = content.split(before1).join(after1);
  console.log('✅ Fix 1: portal card blue-200 -> emerald-200');
} else {
  console.log('⚠️  Fix 1: pattern not found (may already be done)');
}

// Fix 2: Enhance renderMentorDashboard with capacity display + mentee table
const mentorDashStart = '    function renderMentorDashboard() {';
const mentorDashEnd = '\n    }';

const startIdx = content.indexOf(mentorDashStart);
if (startIdx === -1) {
  console.log('❌ Could not find renderMentorDashboard function');
  process.exit(1);
}

// Find the closing of the function by scanning forward
let braceCount = 0;
let inFunc = false;
let endIdx = startIdx;
for (let i = startIdx; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    inFunc = true;
  } else if (content[i] === '}') {
    braceCount--;
    if (inFunc && braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
}

const oldFunc = content.slice(startIdx, endIdx);

// Check if it already has the enhanced version
if (oldFunc.includes('MENTOR_CAPACITY') && oldFunc.includes('slotsUsed')) {
  console.log('ℹ️  Fix 2: renderMentorDashboard already enhanced, skipping');
} else {
  const newFunc = `    function renderMentorDashboard() {
      const MENTOR_CAPACITY = 20;
      const menteeCount = state.students ? state.students.length : 0;
      const presentToday = state.metrics?.presentToday || 0;
      const totalAttLogs = state.metrics?.totalAttendance || state.attendance.length;
      const slotsUsed = menteeCount;
      const slotsFree = Math.max(0, MENTOR_CAPACITY - slotsUsed);
      const capacityPct = Math.min(100, Math.round((slotsUsed / MENTOR_CAPACITY) * 100));

      return \`
        <div class="space-y-6">
          \${renderLowAttendanceAlertWidget()}

          <div class="bg-gradient-to-r from-teal-700 to-emerald-800 text-white rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">Mentor Portal</span>
              <h2 class="text-2xl font-extrabold mt-1">Welcome, \${state.user.name}!</h2>
              <p class="text-xs text-teal-100 mt-1">Assigned Mentees Monitoring &amp; Guidance</p>
            </div>
            <div class="text-right">
              <p class="text-3xl font-black">\${slotsUsed}<span class="text-lg font-semibold text-teal-200">/\${MENTOR_CAPACITY}</span></p>
              <p class="text-xs text-teal-200 mt-0.5">Mentee slots used</p>
              <div class="mt-2 w-32 bg-white/20 h-2 rounded-full overflow-hidden">
                <div class="h-full \${slotsUsed >= MENTOR_CAPACITY ? 'bg-amber-400' : 'bg-emerald-300'} rounded-full transition-all" style="width:\${capacityPct}%"></div>
              </div>
              <p class="text-[10px] text-teal-300 mt-1">\${slotsFree > 0 ? slotsFree + ' slots available' : '⚠️ At full capacity'}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            \${renderStatCard('My Mentees (' + slotsUsed + '/' + MENTOR_CAPACITY + ')', menteeCount, 'fa-user-graduate', 'bg-teal-600')}
            \${renderStatCard('Mentees Present Today', presentToday, 'fa-user-check', 'bg-emerald-600')}
            \${renderStatCard('Total Mentee Logs', totalAttLogs, 'fa-list-check', 'bg-sky-600')}
          </div>

          <!-- Mentee Roster Table -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 class="font-bold text-sm text-slate-900 dark:text-white">
                <i class="fa-solid fa-users mr-2 text-teal-600"></i>My Assigned Mentees
              </h3>
              <span class="text-xs font-semibold px-3 py-1 rounded-full \${slotsUsed >= MENTOR_CAPACITY ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'}">
                \${slotsUsed}/\${MENTOR_CAPACITY} slots used
              </span>
            </div>
            \${state.students && state.students.length > 0 ? \`
            <div class="overflow-x-auto">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th class="px-5 py-3">#</th>
                    <th class="px-5 py-3">Roll No.</th>
                    <th class="px-5 py-3">Name</th>
                    <th class="px-5 py-3">Department</th>
                    <th class="px-5 py-3">Semester</th>
                    <th class="px-5 py-3">Attendance %</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                  \${state.students.map((s, idx) => {
                    const studentAtts = (state.attendance || []).filter(a => a.raw_student_id === s.user_id || a.roll_number === s.roll_number);
                    const present = studentAtts.filter(a => a.status === 'PRESENT').length;
                    const pct = studentAtts.length > 0 ? parseFloat(((present / studentAtts.length) * 100).toFixed(1)) : 100.0;
                    const isLow = pct < 75;
                    return \\\`
                      <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td class="px-5 py-3 text-slate-400">\\\${idx + 1}</td>
                        <td class="px-5 py-3 font-bold text-slate-900 dark:text-white">\\\${s.roll_number || '-'}</td>
                        <td class="px-5 py-3 dark:text-slate-200">\\\${s.name || '-'}</td>
                        <td class="px-5 py-3 text-slate-500">\\\${s.department || 'Computer Science'}</td>
                        <td class="px-5 py-3 text-slate-500">Sem \\\${s.semester || 6}</td>
                        <td class="px-5 py-3 font-bold \\\${isLow ? 'text-rose-500' : 'text-emerald-500'}">\\\${pct.toFixed(1)}%</td>
                      </tr>
                    \\\`;
                  }).join('')}
                </tbody>
              </table>
            </div>
            \` : \`<div class="py-8 text-center text-slate-400 text-sm"><i class="fa-solid fa-user-slash text-2xl mb-2 block"></i>No mentees assigned yet.</div>\`}
          </div>

          \${renderFacultyInteractiveAttendanceWidget()}

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-4"><i class="fa-solid fa-chart-column mr-2 text-teal-600"></i>Mentee Attendance Percentage</h3>
              <div class="h-64 relative"><canvas id="dashboardChart"></canvas></div>
            </div>

            <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 class="font-bold text-sm text-slate-900 dark:text-white mb-4"><i class="fa-solid fa-chart-pie mr-2 text-teal-600"></i>Mentee Status Distribution</h3>
              <div class="h-64 relative flex items-center justify-center"><canvas id="doughnutChart"></canvas></div>
            </div>
          </div>
        </div>
      \`;
    }`;

  content = content.slice(0, startIdx) + newFunc + content.slice(endIdx);
  console.log('✅ Fix 2: renderMentorDashboard enhanced with capacity display + mentee table');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File saved successfully.');
