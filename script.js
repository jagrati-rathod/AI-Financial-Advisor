/* ============================================================
   FinWise AI — script.js
   Powered by Google Gemini API (FREE tier)
   Get your free API key at: https://aistudio.google.com/apikey
   Then paste it below where it says: YOUR_GEMINI_API_KEY_HERE
   ============================================================ */

// ───────────────────────────────────────────────
//  🔑 PASTE YOUR GEMINI API KEY HERE (replace the text between the quotes)
// ───────────────────────────────────────────────
var GEMINI_API_KEY = "AIzaSyBNLBF01E0UJ07xZdGPrmGOaFAdI3QuD4s";

// URL is built at runtime inside the function to avoid initialization errors
function getGeminiURL() {
  return "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" + GEMINI_API_KEY;
}


/* ============================================================
   ENTRY POINT — "Get AI Advice" button click
   ============================================================ */
async function analyzeWithAI() {

  // ── 1. Collect all inputs ──────────────────────────────────
  const income   = parseFloat(document.getElementById('income').value)   || 0;
  const expenses = parseFloat(document.getElementById('expenses').value) || 0;
  const savings  = parseFloat(document.getElementById('savings').value)  || 0;
  const age      = parseInt(document.getElementById('age').value)        || 0;
  const risk     = document.getElementById('risk').value;
  const goal     = document.getElementById('goal').value;
  const context  = document.getElementById('context').value.trim();

  // ── 2. Validate required fields ───────────────────────────
  const msgEl = document.getElementById('validationMsg');
  if (!income || !expenses || !risk || !goal) {
    msgEl.textContent = '⚠️ Please fill in all required fields.';
    return;
  }
  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    msgEl.textContent = '⚠️ Please paste your Gemini API key in script.js (line 12).';
    return;
  }
  msgEl.textContent = '';

  // ── 3. Pre-calculate key financial metrics ─────────────────
  // These are passed to Gemini so it can reference exact numbers
  const monthlyNet      = income - expenses;
  const savingsRate     = ((monthlyNet / income) * 100).toFixed(1);
  const expenseRatio    = ((expenses / income) * 100).toFixed(1);
  const emergencyTarget = expenses * 6;
  const emergencyGap    = Math.max(0, emergencyTarget - savings);
  const monthsCovered   = savings > 0 ? (savings / expenses).toFixed(1) : 0;

  // ── 4. Show loading animation ──────────────────────────────
  setUIState('loading');
  animateLoadingSteps();

  // ── 5. Build the prompt ────────────────────────────────────
  // We ask Gemini to return strict JSON so we can render it beautifully
  const prompt = `
You are an expert personal financial advisor. Analyse the following financial data and return ONLY a valid JSON object — no markdown, no extra text, no backticks, just raw JSON.

USER FINANCIAL DATA:
- Monthly Income: $${income.toLocaleString()}
- Monthly Expenses: $${expenses.toLocaleString()}
- Monthly Net (surplus/deficit): $${monthlyNet.toLocaleString()}
- Current Savings: $${savings.toLocaleString()}
- Age: ${age || 'not provided'}
- Risk Tolerance: ${risk}
- Primary Financial Goal: ${goal}
- Savings Rate: ${savingsRate}%
- Expense-to-Income Ratio: ${expenseRatio}%
- Emergency Fund Coverage: ${monthsCovered} months (target = 6 months = $${emergencyTarget.toLocaleString()}, gap = $${emergencyGap.toLocaleString()})
${context ? `- Extra context: ${context}` : ''}

Return ONLY this JSON structure (fill in all values based on the user's real data):
{
  "healthScore": <integer 0-100>,
  "healthVerdict": "<one sentence summary of their financial health>",
  "budgetAnalysis": {
    "summary": "<2-3 sentence analysis comparing their budget to the 50-30-20 rule>",
    "needsPct": <actual percentage of income going to expenses as number>,
    "savingsPct": <actual savings rate as number>,
    "surplus": <monthly surplus as number, negative if deficit>,
    "warning": "<urgent warning string if overspending, otherwise null>"
  },
  "emergencyFund": {
    "target": <6 months of expenses as number>,
    "current": <current savings as number>,
    "monthsCovered": <number>,
    "gap": <shortfall as number>,
    "advice": "<2-3 sentences of specific actionable emergency fund advice>"
  },
  "investments": {
    "intro": "<1-2 sentences intro tailored to their risk level and surplus>",
    "options": [
      { "name": "<investment name>", "icon": "<single emoji>", "description": "<1-2 sentences>", "suitability": "<low or medium or high>" },
      { "name": "<investment name>", "icon": "<single emoji>", "description": "<1-2 sentences>", "suitability": "<low or medium or high>" },
      { "name": "<investment name>", "icon": "<single emoji>", "description": "<1-2 sentences>", "suitability": "<low or medium or high>" }
    ],
    "monthlyAmount": <suggested monthly investment amount as number>
  },
  "goalPlanning": {
    "goalName": "<cleaned up goal label>",
    "targetAmount": <realistic estimated cost in USD as number>,
    "monthsToGoal": <estimated months to reach goal at current surplus, or null if deficit>,
    "advice": "<3-4 sentences of specific personalised goal planning advice referencing their actual numbers>"
  },
  "tips": [
    "<specific actionable tip 1 referencing their numbers>",
    "<specific actionable tip 2>",
    "<specific actionable tip 3>",
    "<specific actionable tip 4>",
    "<specific actionable tip 5>"
  ]
}
`;

  // ── 6. Call Gemini API ─────────────────────────────────────
  try {
    const response = await fetch(getGeminiURL(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,       // balanced creativity
          maxOutputTokens: 2000,  // enough for full advice
        }
      })
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errData = await response.json();
      const errMsg = errData?.error?.message || `API error: ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();

    // Extract Gemini's text response
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) throw new Error('Gemini returned an empty response.');

    // Strip any accidental markdown code fences before parsing JSON
    const clean = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Parse the JSON advice object
    const advice = JSON.parse(clean);

    // ── 7. Render everything ───────────────────────────────
    renderResults(advice, income, expenses, savings);

  } catch (err) {
    console.error('Gemini API error:', err);
    showError(err.message);
  }
}


/* ============================================================
   RENDER — builds the UI from the AI-generated advice object
   ============================================================ */
function renderResults(advice, income, expenses, savings) {

  // ── Health Score ring animation ────────────────────────────
  const score = Math.min(100, Math.max(0, advice.healthScore || 0));
  animateScoreRing(score);
  animateCounter(document.getElementById('scoreNumber'), 0, score, 1200);
  document.getElementById('scoreVerdict').textContent = advice.healthVerdict || '';

  // ── Clear any previous results ─────────────────────────────
  const container = document.getElementById('aiSections');
  container.innerHTML = '';

  // ── Section 1: Budget Analysis ─────────────────────────────
  const budget = advice.budgetAnalysis || {};
  const budgetCard = makeCard('⚖️', 'Budget Analysis — 50/30/20 Rule');
  const surplusColor = budget.surplus >= 0 ? 'var(--emerald)' : 'var(--rose)';
  budgetCard.querySelector('.ai-section-body').innerHTML = `
    <div class="metric-row">
      <div class="metric-chip">
        <span class="mval">${fmt(budget.surplus ?? (income - expenses))}</span>
        <span class="mlabel">Monthly ${budget.surplus >= 0 ? 'Surplus' : 'Deficit'}</span>
      </div>
      <div class="metric-chip">
        <span class="mval">${(budget.savingsPct ?? (((income-expenses)/income)*100)).toFixed(1)}%</span>
        <span class="mlabel">Savings Rate</span>
      </div>
      <div class="metric-chip">
        <span class="mval">${(budget.needsPct ?? ((expenses/income)*100)).toFixed(1)}%</span>
        <span class="mlabel">Expense Ratio</span>
      </div>
    </div>
    <p>${budget.summary || ''}</p>
    ${budget.warning ? `<div class="ai-warning"><span>⚠️</span><span>${budget.warning}</span></div>` : ''}
  `;
  container.appendChild(budgetCard);

  // ── Section 2: Emergency Fund ──────────────────────────────
  const emg = advice.emergencyFund || {};
  const emgCard = makeCard('🛡️', 'Emergency Fund Status');
  const covered = emg.monthsCovered || (savings / (expenses || 1)).toFixed(1);
  const emgColor = covered >= 6 ? 'var(--emerald)' : covered >= 3 ? 'var(--amber)' : 'var(--rose)';
  emgCard.querySelector('.ai-section-body').innerHTML = `
    <div class="metric-row">
      <div class="metric-chip">
        <span class="mval">${fmt(emg.target || expenses * 6)}</span>
        <span class="mlabel">6-Month Target</span>
      </div>
      <div class="metric-chip">
        <span class="mval" style="color:${emgColor}">${Number(covered).toFixed(1)} mo</span>
        <span class="mlabel">Currently Covered</span>
      </div>
      <div class="metric-chip">
        <span class="mval" style="color:var(--rose)">${fmt(emg.gap ?? Math.max(0, expenses*6 - savings))}</span>
        <span class="mlabel">Gap Remaining</span>
      </div>
    </div>
    <p>${emg.advice || ''}</p>
  `;
  container.appendChild(emgCard);

  // ── Section 3: Investment Strategy ────────────────────────
  const inv = advice.investments || {};
  const invCard = makeCard('📈', 'Investment Strategy');
  const invItemsHTML = (inv.options || []).map(opt => `
    <div style="display:flex;gap:14px;align-items:flex-start;padding:14px 16px;
         background:rgba(5,13,26,0.5);border:1px solid rgba(255,255,255,0.06);
         border-radius:8px;margin-bottom:10px">
      <span style="font-size:1.5rem;flex-shrink:0;margin-top:2px">${opt.icon || '💰'}</span>
      <div style="flex:1">
        <p style="font-weight:600;font-size:0.95rem;color:var(--text-primary);margin-bottom:4px">${opt.name}</p>
        <p style="font-size:0.83rem;color:var(--text-muted);line-height:1.5">${opt.description}</p>
      </div>
      <span style="flex-shrink:0;font-size:0.7rem;font-weight:700;padding:4px 10px;
            border-radius:999px;align-self:flex-start;text-transform:uppercase;letter-spacing:.05em;
            background:rgba(212,168,67,0.15);color:var(--gold-400)">${opt.suitability}</span>
    </div>
  `).join('');
  invCard.querySelector('.ai-section-body').innerHTML =
    `<p style="margin-bottom:16px">${inv.intro || ''}</p>` +
    invItemsHTML +
    (inv.monthlyAmount > 0
      ? `<p style="margin-top:8px">💡 Suggested monthly investment amount: <strong style="color:var(--gold-300)">${fmt(inv.monthlyAmount)}</strong></p>`
      : '');
  container.appendChild(invCard);

  // ── Section 4: Goal Planning ───────────────────────────────
  const gp = advice.goalPlanning || {};
  const goalCard = makeCard('🎯', `Goal: ${gp.goalName || ''}`);
  const timeLabel = gp.monthsToGoal
    ? `${gp.monthsToGoal} mo (${(gp.monthsToGoal / 12).toFixed(1)} yrs)`
    : 'Fix deficit first';
  goalCard.querySelector('.ai-section-body').innerHTML = `
    <div class="metric-row">
      <div class="metric-chip">
        <span class="mval">${fmt(gp.targetAmount || 0)}</span>
        <span class="mlabel">Target Cost</span>
      </div>
      <div class="metric-chip">
        <span class="mval">${fmt(Math.max(0, (gp.targetAmount || 0) - savings))}</span>
        <span class="mlabel">Still Needed</span>
      </div>
      <div class="metric-chip">
        <span class="mval" style="font-size:0.95rem">${timeLabel}</span>
        <span class="mlabel">Est. Time</span>
      </div>
    </div>
    <p>${gp.advice || ''}</p>
  `;
  container.appendChild(goalCard);

  // ── Action Plan Tips ───────────────────────────────────────
  const tips = advice.tips || [];
  if (tips.length) {
    const tipsCard = document.getElementById('tipsCard');
    tipsCard.style.display = 'block';
    document.getElementById('tipsList').innerHTML = tips.map((tip, i) => `
      <li>
        <span class="tip-num">${i + 1}</span>
        <span>${tip}</span>
      </li>
    `).join('');
  }

  // ── Reveal all results ─────────────────────────────────────
  setUIState('results');
  setTimeout(() => {
    document.getElementById('resultsSection')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}


/* ============================================================
   HELPERS
   ============================================================ */

// Creates a result card DOM element with a header and empty body
function makeCard(icon, title) {
  const card = document.createElement('div');
  card.className = 'card advice-card';
  card.innerHTML = `
    <div class="ai-section-header">
      <span class="ai-section-icon">${icon}</span>
      <span class="ai-section-title">${title}</span>
    </div>
    <div class="ai-section-body"></div>
  `;
  return card;
}

// Format a number as USD currency
function fmt(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Animate the SVG score ring from 0 to target score
function animateScoreRing(score) {
  const ringEl = document.getElementById('ringFill');
  const circumference = 2 * Math.PI * 80; // ≈ 502.65
  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => {
    ringEl.style.strokeDashoffset = offset;
    ringEl.style.stroke =
      score >= 75 ? '#2dd4a0' :
      score >= 50 ? '#e8c97a' :
      score >= 25 ? '#fbbf24' : '#f87171';
  }, 80);
}

// Animate a number counter (e.g. score ticking up from 0)
function animateCounter(el, start, end, duration) {
  const startTime = performance.now();
  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Animate loading step indicators one by one
function animateLoadingSteps() {
  const steps = document.querySelectorAll('.lstep');
  let i = 0;
  // Mark each step active then done every 400ms
  const interval = setInterval(() => {
    if (i > 0) steps[i - 1].classList.replace('active', 'done');
    if (i < steps.length) {
      steps[i].classList.add('active');
      i++;
    } else {
      clearInterval(interval);
    }
  }, 400);
}

// Toggle UI state: loading | results | reset
function setUIState(state) {
  const loadingCard    = document.getElementById('loadingCard');
  const resultsSection = document.getElementById('resultsSection');
  const btn            = document.getElementById('analyzeBtn');

  if (state === 'loading') {
    loadingCard.classList.add('visible');
    resultsSection.classList.remove('visible');
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Analysing…';
    // Reset loading steps
    document.querySelectorAll('.lstep').forEach(s => s.classList.remove('active', 'done'));
  } else if (state === 'results') {
    loadingCard.classList.remove('visible');
    resultsSection.classList.add('visible');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Get AI Advice';
  } else {
    loadingCard.classList.remove('visible');
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Get AI Advice';
  }
}

// Display an error message inside the results area
function showError(message) {
  setUIState('reset');
  document.getElementById('scoreCard').style.display = 'none';
  document.getElementById('tipsCard').style.display  = 'none';

  const container = document.getElementById('aiSections');
  container.innerHTML = `
    <div class="card" style="text-align:center;padding:40px">
      <p style="font-size:2rem;margin-bottom:16px">⚠️</p>
      <p style="font-weight:700;font-size:1.1rem;color:var(--rose);margin-bottom:10px">Something went wrong</p>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px">${message}</p>
      <p style="color:var(--text-muted);font-size:0.8rem;line-height:1.7">
        Common fixes:<br>
        • Make sure your API key is correct in script.js (line 12)<br>
        • Check your internet connection<br>
        • Get a free key at <strong>aistudio.google.com/apikey</strong>
      </p>
    </div>
  `;
  document.getElementById('resultsSection').classList.add('visible');
}
