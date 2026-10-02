// UI templates using clean responsive HTML with Tailwind CSS & Lucide Icons

function getHeader(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title} | OpenTap NFC</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .glass { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between antialiased selection:bg-indigo-500 selection:text-white">
  <div class="fixed inset-0 -z-10 overflow-hidden">
    <div class="absolute -top-[40%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-3xl pointer-events-none"></div>
    <div class="absolute top-[60%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-600/15 to-teal-600/15 blur-3xl pointer-events-none"></div>
  </div>`;
}

function getFooter() {
  return `
  <footer class="py-6 text-center text-xs text-slate-500 border-t border-slate-900 mt-12">
    <p>Powered by <span class="font-semibold text-slate-400">OpenTap NFC & Dynamic QR</span> &bull; Open-Source</p>
  </footer>
  <script>lucide.createIcons();</script>
</body>
</html>`;
}

// 1. Digital Business Card Profile View
function renderProfilePage(card, profile) {
  const p = profile || {};
  const initials = (p.name || 'Card User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return `${getHeader(p.name || 'Digital Business Card')}
  <main class="w-full max-w-md mx-auto p-4 sm:p-6 flex-1 flex flex-col items-center justify-center">
    <div class="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl text-center">
      
      <!-- Avatar Badge -->
      <div class="w-24 h-24 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/30">
        <div class="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
          <span class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">${initials}</span>
        </div>
      </div>

      <!-- Identity -->
      <h1 class="text-2xl font-bold tracking-tight text-white mb-1">${escapeHtml(p.name || 'Card Holder')}</h1>
      ${p.title ? `<p class="text-sm font-medium text-indigo-400 mb-0.5">${escapeHtml(p.title)}</p>` : ''}
      ${p.company ? `<p class="text-xs text-slate-400 mb-3">${escapeHtml(p.company)}</p>` : ''}
      ${p.bio ? `<p class="text-sm text-slate-300 mt-3 mb-6 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">${escapeHtml(p.bio)}</p>` : '<div class="h-4"></div>'}

      <!-- Save Contact CTA (.vcf) -->
      <a href="/c/${card.id}/vcard" class="w-full inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] mb-6">
        <i data-lucide="user-plus" class="w-5 h-5"></i>
        <span>Save to Contacts</span>
      </a>

      <!-- Quick Action Buttons -->
      <div class="grid grid-cols-4 gap-2 mb-6">
        ${p.phone ? `
          <a href="tel:${escapeHtml(p.phone)}" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-200 hover:text-white transition">
            <i data-lucide="phone" class="w-5 h-5 mb-1 text-emerald-400"></i>
            <span class="text-[11px] font-medium">Call</span>
          </a>
        ` : ''}
        ${p.email ? `
          <a href="mailto:${escapeHtml(p.email)}" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-200 hover:text-white transition">
            <i data-lucide="mail" class="w-5 h-5 mb-1 text-blue-400"></i>
            <span class="text-[11px] font-medium">Email</span>
          </a>
        ` : ''}
        ${p.whatsapp ? `
          <a href="https://wa.me/${encodeURIComponent(p.whatsapp.replace(/[^0-9]/g, ''))}" target="_blank" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-200 hover:text-white transition">
            <i data-lucide="message-circle" class="w-5 h-5 mb-1 text-green-400"></i>
            <span class="text-[11px] font-medium">WhatsApp</span>
          </a>
        ` : ''}
        ${p.website ? `
          <a href="${escapeHtml(p.website)}" target="_blank" rel="noopener" class="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 text-slate-200 hover:text-white transition">
            <i data-lucide="globe" class="w-5 h-5 mb-1 text-purple-400"></i>
            <span class="text-[11px] font-medium">Website</span>
          </a>
        ` : ''}
      </div>

      <!-- Social Links List -->
      <div class="space-y-2.5">
        ${renderSocialButton(p.linkedin, 'linkedin', 'LinkedIn', 'text-sky-400')}
        ${renderSocialButton(p.instagram, 'instagram', 'Instagram', 'text-pink-400')}
        ${renderSocialButton(p.twitter, 'twitter', 'Twitter / X', 'text-slate-200')}
        ${renderSocialButton(p.github, 'github', 'GitHub', 'text-slate-100')}
        ${renderSocialButton(p.custom_link, 'external-link', p.custom_label || 'Portfolio / Link', 'text-indigo-400')}
      </div>

      <!-- Manage card link -->
      <div class="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
        <span>Card ID: #${card.id}</span>
        <a href="/manage/${card.id}" class="hover:text-indigo-400 inline-flex items-center gap-1 transition">
          <i data-lucide="settings" class="w-3.5 h-3.5"></i>
          <span>Edit Card</span>
        </a>
      </div>

    </div>
  </main>
  ${getFooter()}`;
}

function renderSocialButton(url, icon, label, iconColor) {
  if (!url) return '';
  const href = url.startsWith('http') ? url : `https://${url}`;
  return `
    <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="w-full flex items-center justify-between p-3 px-4 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 transition-all group">
      <div class="flex items-center gap-3">
        <i data-lucide="${icon}" class="w-5 h-5 ${iconColor}"></i>
        <span class="text-sm font-medium text-slate-200 group-hover:text-white">${escapeHtml(label)}</span>
      </div>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5"></i>
    </a>
  `;
}

// 2. Activation Page (First Scan of Blank Card)
function renderActivationPage(card, error = null) {
  return `${getHeader('Activate Card #' + card.id)}
  <main class="w-full max-w-lg mx-auto p-4 sm:p-6 flex-1 flex flex-col items-center justify-center">
    <div class="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Ready to Claim
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Activate Your Card</h1>
        <p class="text-sm text-slate-400 mt-1">No PIN needed &mdash; pick where your card should go and set a password</p>
        <p class="text-xs font-mono text-indigo-400 mt-2 bg-indigo-950/40 inline-block px-2.5 py-1 rounded-md border border-indigo-900/50">Card ID: #${card.id}</p>
      </div>

      ${error ? `
        <div class="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-red-400"></i>
          <span>${escapeHtml(error)}</span>
        </div>
      ` : ''}

      <form action="/activate/${card.id}" method="POST" class="space-y-5" id="activateForm">
        
        <div class="pt-4">
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Choose What Happens When Tapped / Scanned
          </label>
          
          <div class="grid grid-cols-2 gap-3 mb-4">
            <label class="cursor-pointer">
              <input type="radio" name="redirect_type" value="direct" checked class="peer sr-only" onchange="toggleMode('direct')">
              <div class="p-3 rounded-xl border border-slate-800 bg-slate-950 peer-checked:border-indigo-500 peer-checked:bg-indigo-950/20 text-center transition">
                <i data-lucide="link" class="w-5 h-5 mx-auto mb-1 text-indigo-400"></i>
                <div class="text-xs font-semibold text-white">Direct Link</div>
                <div class="text-[10px] text-slate-400 mt-0.5">Instant Redirect</div>
              </div>
            </label>

            <label class="cursor-pointer">
              <input type="radio" name="redirect_type" value="profile" class="peer sr-only" onchange="toggleMode('profile')">
              <div class="p-3 rounded-xl border border-slate-800 bg-slate-950 peer-checked:border-indigo-500 peer-checked:bg-indigo-950/20 text-center transition">
                <i data-lucide="contact" class="w-5 h-5 mx-auto mb-1 text-purple-400"></i>
                <div class="text-xs font-semibold text-white">Digital Profile</div>
                <div class="text-[10px] text-slate-400 mt-0.5">Contact Card & vCard</div>
              </div>
            </label>
          </div>

          <!-- Direct URL Section -->
          <div id="directUrlSection" class="space-y-2">
            <label class="block text-xs font-medium text-slate-300">Destination URL</label>
            <div class="relative">
              <input type="url" name="target_url" id="targetUrlInput" placeholder="https://linkedin.com/in/you or your website"
                class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm">
            </div>
            <p class="text-[11px] text-slate-500">Supports: LinkedIn, Instagram, WhatsApp, Website, Google Review, etc.</p>
          </div>

          <!-- Digital Profile Section -->
          <div id="profileSection" class="space-y-3 hidden">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
              <input type="text" name="name" placeholder="John Doe"
                class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Job Title</label>
                <input type="text" name="title" placeholder="Founder / Designer"
                  class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Company</label>
                <input type="text" name="company" placeholder="Acme Inc."
                  class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <input type="tel" name="phone" placeholder="+1234567890"
                  class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">WhatsApp</label>
                <input type="tel" name="whatsapp" placeholder="+1234567890"
                  class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Short Bio</label>
              <textarea name="bio" rows="2" placeholder="Passionate about building great tech..."
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"></textarea>
            </div>
          </div>

        </div>

        <!-- Account Credentials (To manage later) -->
        <div class="border-t border-slate-800 pt-4 space-y-3">
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Card Management Password
          </label>
          <div>
            <input type="password" name="password" required minlength="4" placeholder="Create a password to edit this card later"
              class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm">
            <p class="text-[11px] text-slate-500 mt-1">You will use this password to change your link or profile anytime.</p>
          </div>
        </div>

        <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition duration-200">
          Activate Card Now
        </button>

      </form>
    </div>
  </main>
  <script>
    function toggleMode(mode) {
      const direct = document.getElementById('directUrlSection');
      const profile = document.getElementById('profileSection');
      const targetInput = document.getElementById('targetUrlInput');
      if (mode === 'direct') {
        direct.classList.remove('hidden');
        profile.classList.add('hidden');
        targetInput.required = true;
      } else {
        direct.classList.add('hidden');
        profile.classList.remove('hidden');
        targetInput.required = false;
      }
    }
    // initialize
    toggleMode('direct');
  </script>
  ${getFooter()}`;
}

// 3. Card Management Portal (Owner can update link & details)
function renderManagePage(card, stats, message = null, error = null) {
  let profile = {};
  try {
    profile = card.profile_json ? JSON.parse(card.profile_json) : {};
  } catch (e) {}

  const isDirect = card.redirect_type === 'direct';

  return `${getHeader('Manage Card #' + card.id)}
  <main class="w-full max-w-xl mx-auto p-4 sm:p-6 flex-1">
    
    <!-- Top Bar -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Card Dashboard</h1>
        <p class="text-xs text-slate-400">Card ID: <span class="font-mono text-indigo-400">#${card.id}</span></p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/c/${card.id}" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition">
          <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          <span>Test Tap</span>
        </a>
        <a href="/logout" class="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 inline-flex items-center gap-1.5 transition">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
        </a>
      </div>
    </div>

    ${message ? `
      <div class="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4 shrink-0 text-emerald-400"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    ` : ''}

    ${error ? `
      <div class="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
        <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-red-400"></i>
        <span>${escapeHtml(error)}</span>
      </div>
    ` : ''}

    <!-- Scan Stats Card -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div class="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
          <i data-lucide="activity" class="w-4 h-4 text-indigo-400"></i>
          <span>Total Taps / Scans</span>
        </div>
        <div class="text-3xl font-extrabold text-white">${stats.totalScans}</div>
      </div>
      <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div class="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
          <i data-lucide="radio" class="w-4 h-4 text-emerald-400"></i>
          <span>Card Status</span>
        </div>
        <div class="text-sm font-bold capitalize text-emerald-400 mt-2">${card.status}</div>
      </div>
    </div>

    <!-- Edit Destination Form -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl mb-6">
      <h2 class="text-lg font-bold text-white mb-4">Edit Card Destination</h2>
      
      <form action="/manage/${card.id}" method="POST" class="space-y-5">
        <input type="hidden" name="action" value="update_settings">

        <!-- Mode Selector -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Behavior Mode</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="cursor-pointer">
              <input type="radio" name="redirect_type" value="direct" ${isDirect ? 'checked' : ''} class="peer sr-only" onchange="toggleManageMode('direct')">
              <div class="p-3 rounded-xl border border-slate-800 bg-slate-950 peer-checked:border-indigo-500 peer-checked:bg-indigo-950/20 text-center transition">
                <i data-lucide="link" class="w-5 h-5 mx-auto mb-1 text-indigo-400"></i>
                <div class="text-xs font-semibold text-white">Direct URL Redirect</div>
              </div>
            </label>

            <label class="cursor-pointer">
              <input type="radio" name="redirect_type" value="profile" ${!isDirect ? 'checked' : ''} class="peer sr-only" onchange="toggleManageMode('profile')">
              <div class="p-3 rounded-xl border border-slate-800 bg-slate-950 peer-checked:border-indigo-500 peer-checked:bg-indigo-950/20 text-center transition">
                <i data-lucide="contact" class="w-5 h-5 mx-auto mb-1 text-purple-400"></i>
                <div class="text-xs font-semibold text-white">Digital Business Card</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Direct URL field -->
        <div id="manageDirectSection" class="${isDirect ? '' : 'hidden'} space-y-2">
          <label class="block text-xs font-medium text-slate-300">Target Destination URL</label>
          <input type="url" name="target_url" value="${escapeHtml(card.target_url || '')}" placeholder="https://..."
            class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm">
          <p class="text-[11px] text-slate-500">Any link: LinkedIn, Instagram, Linktree, Google Maps Review, WhatsApp, etc.</p>
        </div>

        <!-- Profile fields -->
        <div id="manageProfileSection" class="${!isDirect ? '' : 'hidden'} space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input type="text" name="name" value="${escapeHtml(profile.name || '')}" placeholder="Name"
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input type="email" name="email" value="${escapeHtml(profile.email || '')}" placeholder="Email"
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Job Title</label>
              <input type="text" name="title" value="${escapeHtml(profile.title || '')}" placeholder="Title"
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Company</label>
              <input type="text" name="company" value="${escapeHtml(profile.company || '')}" placeholder="Company"
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Phone</label>
              <input type="tel" name="phone" value="${escapeHtml(profile.phone || '')}" placeholder="+1..."
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">WhatsApp</label>
              <input type="tel" name="whatsapp" value="${escapeHtml(profile.whatsapp || '')}" placeholder="+1..."
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Website</label>
            <input type="url" name="website" value="${escapeHtml(profile.website || '')}" placeholder="https://..."
              class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">LinkedIn URL</label>
              <input type="text" name="linkedin" value="${escapeHtml(profile.linkedin || '')}" placeholder="https://linkedin.com/in/..."
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Instagram URL</label>
              <input type="text" name="instagram" value="${escapeHtml(profile.instagram || '')}" placeholder="https://instagram.com/..."
                class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Short Bio</label>
            <textarea name="bio" rows="2" class="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">${escapeHtml(profile.bio || '')}</textarea>
          </div>
        </div>

        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition">
          Save Changes Instantly
        </button>
      </form>
    </div>

    <!-- Change Password Card -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
      <h3 class="text-sm font-bold text-white mb-3">Change Card Password</h3>
      <form action="/manage/${card.id}" method="POST" class="flex gap-2">
        <input type="hidden" name="action" value="update_password">
        <input type="password" name="new_password" required minlength="4" placeholder="New Password"
          class="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
        <button type="submit" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition">
          Update
        </button>
      </form>
    </div>

  </main>
  <script>
    function toggleManageMode(mode) {
      const direct = document.getElementById('manageDirectSection');
      const profile = document.getElementById('manageProfileSection');
      if (mode === 'direct') {
        direct.classList.remove('hidden');
        profile.classList.add('hidden');
      } else {
        direct.classList.add('hidden');
        profile.classList.remove('hidden');
      }
    }
  </script>
  ${getFooter()}`;
}

// 4. Cardholder Login Page
function renderLoginPage(cardId = '', error = null) {
  return `${getHeader('Login to Card')}
  <main class="w-full max-w-sm mx-auto p-4 flex-1 flex flex-col items-center justify-center">
    <div class="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div class="text-center mb-6">
        <h1 class="text-xl font-bold text-white">Manage Your Card</h1>
        <p class="text-xs text-slate-400 mt-1">Log in to update your card destination</p>
      </div>

      ${error ? `
        <div class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          ${escapeHtml(error)}
        </div>
      ` : ''}

      <form action="/login" method="POST" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Card ID</label>
          <input type="text" name="card_id" value="${escapeHtml(cardId)}" required placeholder="e.g. A7X9K2"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm uppercase">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
          <input type="password" name="password" required placeholder="Enter card password"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
        </div>

        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition">
          Sign In
        </button>
      </form>
    </div>
  </main>
  ${getFooter()}`;
}

// 5. Admin Dashboard (Batch Generation & Card Management)
function renderAdminDashboard(cards, baseUrl, message = null, error = null) {
  const totalCards = cards.length;
  const activeCards = cards.filter(c => c.status === 'active').length;
  const unclaimedCards = cards.filter(c => c.status === 'unclaimed').length;
  const totalScans = cards.reduce((acc, c) => acc + (Number(c.scan_count) || 0), 0);

  return `${getHeader('Admin Control Panel')}
  <main class="w-full max-w-6xl mx-auto p-4 sm:p-6 flex-1">
    
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
      <div>
        <h1 class="text-2xl font-bold text-white flex items-center gap-2">
          <span>OpenTap Admin</span>
          <span class="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">v1.0</span>
        </h1>
        <p class="text-xs text-slate-400 mt-0.5">Generate print batches and manage physical cards</p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/admin/logout" class="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 inline-flex items-center gap-1.5 transition">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
          <span>Logout</span>
        </a>
      </div>
    </div>

    ${message ? `
      <div class="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
        <i data-lucide="check-circle" class="w-4 h-4 shrink-0 text-emerald-400"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    ` : ''}

    ${error ? `
      <div class="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
        <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-red-400"></i>
        <span>${escapeHtml(error)}</span>
      </div>
    ` : ''}

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div class="text-xs text-slate-400 font-medium">Total Cards</div>
        <div class="text-2xl font-bold text-white mt-1">${totalCards}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div class="text-xs text-emerald-400 font-medium">Active (Assigned)</div>
        <div class="text-2xl font-bold text-white mt-1">${activeCards}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div class="text-xs text-amber-400 font-medium">Unclaimed (Blank)</div>
        <div class="text-2xl font-bold text-white mt-1">${unclaimedCards}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div class="text-xs text-indigo-400 font-medium">Total Card Scans</div>
        <div class="text-2xl font-bold text-white mt-1">${totalScans}</div>
      </div>
    </div>

    <!-- Batch Generator Box -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl mb-8">
      <div class="flex items-center gap-2 mb-2">
        <i data-lucide="printer" class="w-5 h-5 text-indigo-400"></i>
        <h2 class="text-lg font-bold text-white">Generate Print-Ready QR Batch</h2>
      </div>
      <p class="text-xs text-slate-400 mb-5">
        Generates unique card IDs, vector SVGs, 300 DPI PNGs, and a CSV file packed in a single ZIP for your print manufacturer.
      </p>

      <form action="/admin/generate-batch" method="POST" class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Batch Quantity</label>
          <input type="number" name="quantity" value="10" min="1" max="500" required
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Code Prefix (Optional)</label>
          <input type="text" name="prefix" placeholder="e.g. CARD-"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm uppercase">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Code Length</label>
          <input type="number" name="length" value="6" min="4" max="10"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm">
        </div>
        <div>
          <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-lg shadow-indigo-600/25 transition inline-flex items-center justify-center gap-2">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>Generate & Download ZIP</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Cards Table -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <h3 class="font-bold text-white text-base">All Physical Cards</h3>
        <span class="text-xs text-slate-400">${cards.length} cards total</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
            <tr>
              <th class="p-3.5 pl-5">Card ID</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5">Destination / Mode</th>
              <th class="p-3.5">Scans</th>
              <th class="p-3.5">Created</th>
              <th class="p-3.5 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            ${cards.length === 0 ? `
              <tr>
                <td colspan="6" class="p-8 text-center text-slate-500">
                  No cards found. Use the generator above to create your first batch!
                </td>
              </tr>
            ` : cards.map(c => `
              <tr class="hover:bg-slate-800/40 transition">
                <td class="p-3.5 pl-5 font-mono font-bold text-indigo-400">#${c.id}</td>
                <td class="p-3.5">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    c.status === 'unclaimed' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-slate-700/30 text-slate-400 border border-slate-700'
                  }">
                    ${c.status}
                  </span>
                </td>
                <td class="p-3.5 max-w-[200px] truncate">
                  ${c.status === 'unclaimed' ? '<span class="text-slate-500 italic">Unclaimed</span>' :
                    c.redirect_type === 'direct' ? `<a href="${escapeHtml(c.target_url || '')}" target="_blank" class="text-indigo-400 hover:underline truncate block">${escapeHtml(c.target_url || '')}</a>` :
                    `<span class="text-purple-400 font-medium">Digital Profile (${escapeHtml(c.owner_name || 'User')})</span>`
                  }
                </td>
                <td class="p-3.5 font-semibold text-white">${c.scan_count || 0}</td>
                <td class="p-3.5 text-slate-500 text-[11px]">${String(c.created_at || '').substring(0, 10)}</td>
                <td class="p-3.5 pr-5 text-right space-x-1">
                  <a href="/c/${c.id}" target="_blank" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 inline-block" title="Test Tap">
                    <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                  </a>
                  <form action="/admin/card/${c.id}/reset" method="POST" class="inline" onsubmit="return confirm('Reset this card back to unclaimed?');">
                    <button type="submit" class="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 inline-block" title="Reset Card">
                      <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                    </button>
                  </form>
                  <form action="/admin/card/${c.id}/delete" method="POST" class="inline" onsubmit="return confirm('Delete this card completely?');">
                    <button type="submit" class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 inline-block" title="Delete Card">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </main>
  ${getFooter()}`;
}

// 6. Admin Login View
function renderAdminLoginPage(error = null) {
  return `${getHeader('Admin Login')}
  <main class="w-full max-w-sm mx-auto p-4 flex-1 flex flex-col items-center justify-center">
    <div class="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div class="text-center mb-6">
        <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <i data-lucide="shield-check" class="w-6 h-6"></i>
        </div>
        <h1 class="text-xl font-bold text-white">Admin Access</h1>
        <p class="text-xs text-slate-400 mt-1">Enter your admin key to manage cards</p>
      </div>

      ${error ? `
        <div class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          ${escapeHtml(error)}
        </div>
      ` : ''}

      <form action="/admin/login" method="POST" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Admin Key</label>
          <input type="password" name="admin_key" required placeholder="Enter admin key"
            class="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
        </div>

        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition">
          Unlock Dashboard
        </button>
      </form>
    </div>
  </main>
  ${getFooter()}`;
}

// 7. Generic Error / Status Page
function renderStatusPage(title, message, icon = 'alert-triangle', color = 'amber') {
  return `${getHeader(title)}
  <main class="w-full max-w-md mx-auto p-4 flex-1 flex flex-col items-center justify-center text-center">
    <div class="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
      <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-400">
        <i data-lucide="${icon}" class="w-7 h-7"></i>
      </div>
      <h1 class="text-xl font-bold text-white mb-2">${escapeHtml(title)}</h1>
      <p class="text-sm text-slate-400 leading-relaxed">${escapeHtml(message)}</p>
    </div>
  </main>
  ${getFooter()}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  renderProfilePage,
  renderActivationPage,
  renderManagePage,
  renderLoginPage,
  renderAdminDashboard,
  renderAdminLoginPage,
  renderStatusPage
};
