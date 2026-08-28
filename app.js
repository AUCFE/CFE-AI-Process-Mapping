/* ════════════════════════════════════════════════════════════════
   DATA / CONSTANTS
════════════════════════════════════════════════════════════════ */
const LENSES = [
  { key: "employee", name: "Me as an Employee", desc: "Admin work, committees, scheduling, operations." },
  { key: "teaching",  name: "Me as a Teacher",   desc: "Course design, grading, feedback, student communication." },
  { key: "research",  name: "Me as a Researcher", desc: "Literature, data, analysis, writing, dissemination." },
];
const LENS_LABEL = { employee: "university employee handling administrative work", teaching: "college instructor", research: "researcher" };

const TOOL_OPTIONS = [
  { name: "Copilot", note: "Included with your AU Microsoft 365 account (paid tier) — no extra sign-up needed." },
  { name: "Gemini", note: "Free and generally available — not an AU-specific tool, but a solid, no-cost option." },
  { name: "Claude", note: "Generally considered one of the strongest options for this kind of detailed, back-and-forth building. Free tier works; a paid plan unlocks more." },
  { name: "ChatGPT", note: "A strong choice if you already have a paid ChatGPT account. The free tier works too, but is more limited for longer builds." },
  { name: "Perplexity", note: "Kogod faculty have access via an enterprise account. It's built more for research and search, so it may not be the strongest fit for actually building a tool or agent — worth trying if it's what you have open." },
];
function renderToolOptions() {
  const grid = document.getElementById("toolOptionsGrid");
  if (grid) grid.innerHTML = TOOL_OPTIONS.map(t => `<div class="tool-option-card"><div class="tool-option-name">${esc(t.name)}</div><div class="tool-option-note">${esc(t.note)}</div></div>`).join("");
}

const FREQ_OPTS = [
  ["", "Select frequency"], ["daily","Daily"], ["weekly","Weekly"], ["biweekly","Every other week"],
  ["monthly","Monthly"], ["termly","A few times a term"], ["rarely","Rarely"]
];
const TIME_OPTS = [
  ["", "Select time cost"], ["short","Under 15 minutes"], ["medium","15–60 minutes"],
  ["long","1–3 hours"], ["verylong","3+ hours"]
];
const TIME_LABEL = { short:"under 15 minutes", medium:"15–60 minutes", long:"1–3 hours", verylong:"3+ hours" };
const FREQ_LABEL = { daily:"daily", weekly:"weekly", biweekly:"every other week", monthly:"monthly", termly:"a few times a term", rarely:"rarely" };

const CONTENT_OPTS = [
  ["", "Select what this step mostly involves"],
  ["reading", "Reading or reviewing text/documents"],
  ["writing", "Writing or drafting text"],
  ["organizing", "Organizing or sorting information"],
  ["data", "Analyzing numbers or data"],
  ["answering", "Answering the same questions people keep asking"],
  ["talking", "A real-time conversation — reading a person or situation"],
  ["physical", "Physical or logistical tasks"],
];
const AI_FRIENDLY_CONTENT = ["reading","writing","organizing","data","answering"];

const REPEAT_OPTS = [
  ["same", "Looks basically the same every time"],
  ["mostly", "Mostly the same, with some variation"],
  ["different", "Different every time"],
];
const JUDGMENT_OPTS = [
  ["rule", "Follows a rule or rubric I could write down"],
  ["mixed", "A mix — some rules, some case-by-case judgment"],
  ["situational", "Depends on reading the person or situation in the moment"],
];

/* ════════════════════════════════════════════════════════════════
   STATE
════════════════════════════════════════════════════════════════ */
let state = { version: 1, lenses: [], steps: [] };
let stepIdCounter = 0;
let consolidatedPromptText = "";
let individualPromptTexts = [];

/* ════════════════════════════════════════════════════════════════
   LENS PICKER
════════════════════════════════════════════════════════════════ */
function renderLensPicker() {
  const grid = document.getElementById("lensGrid");
  grid.innerHTML = LENSES.map(l => `
    <label class="lens-card ${state.lenses.includes(l.key) ? 'selected' : ''}" data-lens="${l.key}">
      <input type="checkbox" ${state.lenses.includes(l.key) ? 'checked' : ''} onchange="toggleLens('${l.key}')">
      <div class="lens-name">${l.name}</div>
      <div class="lens-desc">${l.desc}</div>
    </label>
  `).join("");
}
function toggleLens(key) {
  const i = state.lenses.indexOf(key);
  if (i === -1) state.lenses.push(key); else state.lenses.splice(i, 1);
  syncStepLenses();
  renderLensPicker();
  renderSteps();
}
function syncStepLenses() {
  if (state.lenses.length === 1) {
    state.steps.forEach(s => s.lens = state.lenses[0]);
  } else if (state.lenses.length > 1) {
    state.steps.forEach(s => { if (!state.lenses.includes(s.lens)) s.lens = ""; });
  }
}

/* ════════════════════════════════════════════════════════════════
   STEP CARDS
════════════════════════════════════════════════════════════════ */
function newStepData() {
  return {
    id: ++stepIdCounter, name: "", lens: state.lenses.length === 1 ? state.lenses[0] : "", description: "", who: "", tools: "",
    frequency: "", timeCost: "", painPoint: "", ideaHelp: "",
    repeatability: "", contentType: "", judgment: "", keepIt: false, multiAction: false,
  };
}
function stepDisplayName(step) {
  if (step.name && step.name.trim()) return step.name.trim();
  const src = (step.description || step.painPoint || step.ideaHelp || "").trim();
  if (!src) return "Untitled step";
  const words = src.split(/\s+/);
  const truncated = words.slice(0, 8).join(" ");
  return words.length > 8 ? truncated + "…" : truncated;
}
function addStep(data) {
  const step = data || newStepData();
  if (!data) state.steps.push(step);
  renderSteps();
  return step;
}
function removeStep(id) {
  state.steps = state.steps.filter(s => s.id !== id);
  renderSteps();
}
function selOpts(opts, current) {
  return opts.map(([v, label]) => `<option value="${v}" ${v === current ? 'selected' : ''}>${label}</option>`).join("");
}
function stepIndexLabel(i) { return i + 1; }
function lensShortName(key) {
  const l = LENSES.find(l => l.key === key);
  return l ? l.name.replace('Me as a ', '').replace('Me as an ', '') : "";
}
function renderLensField(s) {
  if (state.lenses.length === 1) {
    return `<div class="lens-statement">The part of your work this is for is <strong>${esc(lensShortName(state.lenses[0]))}</strong>.</div>`;
  }
  const options = state.lenses.length > 1 ? LENSES.filter(l => state.lenses.includes(l.key)) : LENSES;
  return `<select onchange="updateStep(${s.id}, 'lens', this.value)">
    <option value="" ${s.lens===""?'selected':''}>Select one</option>
    ${options.map(l => `<option value="${l.key}" ${s.lens===l.key?'selected':''}>${l.name.replace('Me as a ','').replace('Me as an ','')}</option>`).join("")}
  </select>`;
}

function renderSteps() {
  const container = document.getElementById("stepsContainer");
  if (state.steps.length === 0) {
    container.innerHTML = `<p class="empty-note">No steps yet — click "+ Add a Step" to start mapping.</p>`;
    return;
  }
  container.innerHTML = state.steps.map((s, i) => {
    const connector = i > 0 ? `<div class="step-connector"><svg width="16" height="22" viewBox="0 0 16 22" fill="none"><path d="M8 0V16M8 16L2 10M8 16L14 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : "";
    return `${connector}
    <div class="step-card" data-id="${s.id}">
      <div class="step-card-head">
        <span class="step-badge">${stepIndexLabel(i)}</span>
        <input type="text" class="step-title-input" placeholder="Name this step (e.g., 'Grade weekly reflections')"
          value="${escAttr(s.name)}" oninput="updateStep(${s.id}, 'name', this.value)">
        <button class="remove-step-btn" onclick="removeStep(${s.id})">Remove</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Which part of your work is this?</label>
          ${renderLensField(s)}
        </div>
        <div class="form-group">
          <label>Who's involved? <span class="hint">(besides you)</span></label>
          <input type="text" placeholder="e.g., students, registrar, co-authors" value="${escAttr(s.who)}"
            oninput="updateStep(${s.id}, 'who', this.value)">
        </div>
      </div>

      <div class="form-group">
        <label>What actually happens in this step?</label>
        <textarea placeholder="Describe it neutrally, the way you'd explain it to a colleague — e.g., 'I read each submission and write comments referencing the rubric.'" oninput="updateStep(${s.id}, 'description', this.value)">${esc(s.description)}</textarea>
      </div>

      <div class="form-row three">
        <div class="form-group">
          <label>Tools you currently use</label>
          <input type="text" placeholder="e.g., email, spreadsheet, LMS" value="${escAttr(s.tools)}"
            oninput="updateStep(${s.id}, 'tools', this.value)">
        </div>
        <div class="form-group">
          <label>How often?</label>
          <select onchange="updateStep(${s.id}, 'frequency', this.value)">${selOpts(FREQ_OPTS, s.frequency)}</select>
        </div>
        <div class="form-group">
          <label>Time per occurrence</label>
          <select onchange="updateStep(${s.id}, 'timeCost', this.value)">${selOpts(TIME_OPTS, s.timeCost)}</select>
        </div>
      </div>

      <div class="form-group">
        <label>What's frustrating or draining about this step? <span class="hint">(optional)</span></label>
        <textarea placeholder="Optional — but often where the best opportunities hide" oninput="updateStep(${s.id}, 'painPoint', this.value)">${esc(s.painPoint)}</textarea>
      </div>

      <div class="form-group">
        <label>Do you already have an idea of what might help? <span class="hint">(optional)</span></label>
        <textarea placeholder="Optional — if you've already pictured a fix (e.g., 'a library of canned responses I could copy from'), describe it here so it carries through to your prompt." oninput="updateStep(${s.id}, 'ideaHelp', this.value)">${esc(s.ideaHelp)}</textarea>
      </div>

      <div class="diag-block">
        <span class="diag-eyebrow">Quick diagnostic — helps the tool, no AI knowledge needed</span>

        <div class="form-group">
          <label>What does this step mostly involve?</label>
          <select onchange="updateStep(${s.id}, 'contentType', this.value)">${selOpts(CONTENT_OPTS, s.contentType)}</select>
        </div>

        <label style="display:block;font-size:.71rem;font-weight:700;color:var(--text-secondary);margin-bottom:.3rem;">Does it look the same each time?</label>
        <div class="radio-group">
          ${REPEAT_OPTS.map(([v,label]) => `
            <label class="radio-option">
              <input type="radio" name="repeat-${s.id}" value="${v}" ${s.repeatability===v?'checked':''} onchange="updateStep(${s.id}, 'repeatability', '${v}')">
              ${label}
            </label>`).join("")}
        </div>

        <label style="display:block;font-size:.71rem;font-weight:700;color:var(--text-secondary);margin-bottom:.3rem;">What kind of judgment does it take?</label>
        <div class="radio-group">
          ${JUDGMENT_OPTS.map(([v,label]) => `
            <label class="radio-option">
              <input type="radio" name="judgment-${s.id}" value="${v}" ${s.judgment===v?'checked':''} onchange="updateStep(${s.id}, 'judgment', '${v}')">
              ${label}
            </label>`).join("")}
        </div>

        <label class="checkbox-row">
          <input type="checkbox" ${s.multiAction?'checked':''} onchange="updateStep(${s.id}, 'multiAction', this.checked)">
          This step is really several different actions chained together
        </label>
        <label class="checkbox-row" style="margin-bottom:0;">
          <input type="checkbox" ${s.keepIt?'checked':''} onchange="updateStep(${s.id}, 'keepIt', this.checked)">
          Honestly, I'd want to keep doing this myself
        </label>
      </div>
    </div>`;
  }).join("");
}
function updateStep(id, field, value) {
  const step = state.steps.find(s => s.id === id);
  if (step) step[field] = value;
}

/* ════════════════════════════════════════════════════════════════
   ANALYSIS ENGINE
════════════════════════════════════════════════════════════════ */
const WHY_OPPORTUNITY = {
  "drafting/generation": "You're writing similar text over and over, following a pattern you already know. That repetition is exactly what AI drafting is good at — it won't replace your judgment, but it can hand you a first draft to react to instead of a blank page.",
  "summarizing/synthesis": "You're regularly condensing text down to what matters, in a fairly consistent way. AI is strong at fast first-pass summaries — you'd still decide what actually matters.",
  "classification/triage": "You're sorting or routing things using criteria you could probably write down as rules. That's a learnable pattern for AI, which means less time spent sorting and more time on what actually needs you.",
  "data/analysis": "You're working with structured information in a fairly consistent way each time. AI can help you get to a first pass faster, leaving interpretation and decisions to you.",
  "conversational/FAQ": "People keep asking you versions of the same question. That repetition is a strong signal that an AI-powered first response could absorb the routine ones and free you up for the ones that actually need you.",
  "research/retrieval": "You're searching, gathering, or scanning for information in a repeatable way. AI tools can help you cast a wider net faster — you'd still evaluate and trust the sources yourself.",
};
const HMW = {
  "drafting/generation": n => `How might you get through "${n}" without losing your voice?`,
  "summarizing/synthesis": n => `How might you get the gist of "${n}" without reading every word yourself?`,
  "classification/triage": n => `How might "${n}" sort itself so you only deal with what truly needs you?`,
  "data/analysis": n => `How might you get to insight in "${n}" faster, without doing all the manual work yourself?`,
  "conversational/FAQ": n => `How might the repeat questions in "${n}" get answered before they even reach you?`,
  "research/retrieval": n => `How might you gather what you need for "${n}" without doing all the digging yourself?`,
};
const SPARKS = {
  "drafting/generation": ["What if a first draft was always waiting for you before you sat down to write?", "What if you only ever had to edit, never start from a blank page?"],
  "summarizing/synthesis": ["What if you got the three-sentence version before deciding whether to read the whole thing?", "What if a summary flagged only what changed since last time?"],
  "classification/triage": ["What if the routine ones sorted themselves and only the exceptions landed in front of you?", "What if you never had to re-read something just to know where it belongs?"],
  "data/analysis": ["What if the first pass of the analysis was already done by the time you sat down to interpret it?", "What if patterns worth noticing were flagged for you automatically?"],
  "conversational/FAQ": ["What if the questions you answer every week were already answered before anyone asked?", "What if you only heard about the questions no one else could answer?"],
  "research/retrieval": ["What if a first sweep of the literature was waiting before you started searching?", "What if gathering sources took minutes instead of hours, so you spent your time evaluating instead of hunting?"],
};
const WHY_HUMAN = {
  talking: "This step is a live conversation — reading tone, building trust, responding in the moment. That's not something to hand to AI, though AI could help you prepare notes or a first draft beforehand.",
  physical: "This is a hands-on or logistical task happening in the physical world. AI has little to offer here directly.",
  situational: "This step depends on reading a specific person or situation in the moment — the kind of judgment that shouldn't be automated, even though AI could help you think it through beforehand.",
  lowrepeat: "Every instance of this step looks different, so there isn't a consistent pattern yet for AI to learn from. Worth revisiting if that changes.",
  incomplete: "Answer the diagnostic questions above to see what this tool finds here.",
};
const MULTI_STEP_NOTE = " On top of that, this looks like several different actions chained together — which might make more sense as a small multi-step agent than a single one-off prompt.";
const KEEP_IT_WHY = "You said you'd want to keep doing this yourself — that's worth respecting, and AI shouldn't try to take over the core of it. It could still help at the edges (a first note to react to, keeping track of deadlines, organizing the routine parts) without replacing your judgment on the parts that matter to you.";

function detectType(step) {
  switch (step.contentType) {
    case "answering": return "conversational/FAQ";
    case "data": return "data/analysis";
    case "organizing": return "classification/triage";
    case "writing": return "drafting/generation";
    case "reading": {
      const d = (step.description || "").toLowerCase();
      if (/(search|find|gather|sources?|literature|citation|database|scholar|jstor|abstracts?|articles?|papers?|pdfs?)/.test(d)) return "research/retrieval";
      if (step.judgment === "rule") return "classification/triage";
      return "summarizing/synthesis";
    }
    default: return null;
  }
}

function scoreStep(step) {
  let pts = 0;
  pts += { same: 2, mostly: 1, different: 0 }[step.repeatability] ?? 0;
  pts += AI_FRIENDLY_CONTENT.includes(step.contentType) ? 2 : 0;
  pts += { rule: 2, mixed: 1, situational: 0 }[step.judgment] ?? 0;
  return pts;
}

// Repeatability + judgment, on their own, excluding content type. Content type alone
// (e.g. "this is writing") shouldn't be enough to clear a step for AI assistance — the
// step also needs to show at least some repeatable pattern or rule-based judgment. Without
// this, a task that's different every time AND depends entirely on situational judgment
// (a deeply personal letter, say) still gets flagged "AI Can Assist" on content type alone.
function humanFactorScore(step) {
  const repPts = { same: 2, mostly: 1, different: 0 }[step.repeatability] ?? 0;
  const judgPts = { rule: 2, mixed: 1, situational: 0 }[step.judgment] ?? 0;
  return repPts + judgPts;
}

function analyzeStep(step) {
  if (!step.contentType || !step.repeatability || !step.judgment) {
    return { level: "incomplete", why: WHY_HUMAN.incomplete, type: null, hmw: null, sparks: [] };
  }
  if (step.contentType === "physical") {
    return { level: "human", why: WHY_HUMAN.physical, type: "hands-on/logistical", hmw: null, sparks: [] };
  }
  if (step.contentType === "talking") {
    return { level: "human", why: WHY_HUMAN.talking, type: "live conversation", hmw: null, sparks: [] };
  }

  const pts = scoreStep(step);
  const humanFactor = humanFactorScore(step);
  const type = detectType(step);
  const multiNote = step.multiAction ? MULTI_STEP_NOTE : "";
  const hmw = HMW[type] ? HMW[type](stepDisplayName(step)) : null;
  const sparks = SPARKS[type] || [];

  // Respect an explicit "I'd rather keep doing this myself" — never let it read as a full
  // AI opportunity, and never blindly assert the opportunity-tier narrative against it.
  // Still subject to the humanFactor gate below: if repeatability + judgment are both at
  // their most human-protective values, keepIt falls through to the human-tier verdict too.
  if (step.keepIt && pts >= 2 && humanFactor > 0) {
    return { level: "assist", why: KEEP_IT_WHY + multiNote, type, hmw, sparks };
  }

  if (pts >= 4) {
    const why = (WHY_OPPORTUNITY[type] || "This step shows a strong, repeatable pattern — a good candidate for AI help.") + multiNote;
    return { level: "opportunity", why, type, hmw, sparks };
  }
  if (pts >= 2 && humanFactor > 0) {
    const reason = step.repeatability === "different" ? "this step varies a lot each time, so a rigid tool would need constant adjusting" : "the judgment call in the middle depends on context AI can't fully see";
    const why = `AI can likely help with part of this — ${reason} — so this is a place where AI assists rather than drives.` + multiNote;
    return { level: "assist", why, type, hmw, sparks };
  }
  if (step.judgment === "situational") return { level: "human", why: WHY_HUMAN.situational, type: null, hmw: null, sparks: [] };
  return { level: "human", why: WHY_HUMAN.lowrepeat, type: null, hmw: null, sparks: [] };
}

/* ════════════════════════════════════════════════════════════════
   GUARDRAILS + PROMPT GENERATION
════════════════════════════════════════════════════════════════ */
function guardrailNote(lens) {
  const notes = {
    employee: "keep in mind this involves university administrative work — avoid designing anything that would require entering confidential university data into a tool that isn't institutionally approved.",
    teaching: "keep in mind this involves my teaching and possibly student work — nothing that identifies a specific student should end up in what we design, and build in a human review step before anything reaches students.",
    research: "keep in mind this involves my research — treat any unpublished data or findings as confidential, and flag anything that might raise IRB or funder policy questions.",
  };
  return notes[lens] || "keep in mind I may be working with sensitive or identifiable information — flag anything that would need extra care.";
}

const REPEAT_STATEMENT = {
  same: "looks basically the same every time",
  mostly: "is mostly the same, with some variation",
  different: "is different every time",
};
const CONTENT_STATEMENT = {
  reading: "mostly involves reading or reviewing text",
  writing: "mostly involves writing or drafting text",
  organizing: "mostly involves organizing or sorting information",
  data: "mostly involves analyzing data",
  answering: "mostly involves answering the same questions people keep asking",
  talking: "is a real-time conversation with someone",
  physical: "is a physical or logistical task",
};
const JUDGMENT_STATEMENT = {
  rule: "follows a rule or rubric I could write down",
  mixed: "is a mix of rules and case-by-case judgment",
  situational: "depends on reading the person or situation in the moment",
};
function diagnosticFacts(step) {
  const parts = [REPEAT_STATEMENT[step.repeatability], CONTENT_STATEMENT[step.contentType], JUDGMENT_STATEMENT[step.judgment]].filter(Boolean);
  if (!parts.length) return "";
  const joined = parts.length > 1 ? parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1] : parts[0];
  return "This step " + joined + ".";
}

const SOLUTION_ASK = "Based on all this, help me figure out what's actually possible here with AI — don't assume, ask me clarifying questions first if you need more detail. Then tell me whether this is better solved with a quick reusable prompt, a configured AI assistant, a small agent, or something else entirely, and help me build a first working version.";
const KEEP_IT_PROMPT_LINE = "One thing to flag: I'd rather keep doing the core of this myself — I'm more interested in lightweight support at the edges than a tool that takes it over.";

function stepExtraLines(step, indent) {
  const lines = [];
  if (step.painPoint) lines.push(`${indent}What's frustrating about it: ${step.painPoint}`);
  if (step.ideaHelp) lines.push(`${indent}What I'm picturing might help: ${step.ideaHelp}`);
  if (step.keepIt) lines.push(`${indent}${KEEP_IT_PROMPT_LINE}`);
  return lines.length ? "\n" + lines.join("\n") : "";
}

function buildStepPrompt(step, analysis) {
  const lensLabel = LENS_LABEL[step.lens] || "faculty member";
  const extraLines = stepExtraLines(step, "");
  const facts = diagnosticFacts(step);
  return `I'm a ${lensLabel} at a university, and I've been process-mapping my own work to find good opportunities to use AI.

Here's one task I'd like help with:

Step: ${stepDisplayName(step)}
What happens: ${step.description || "—"}${extraLines}
Context: ${step.who || "just me"}, using ${step.tools || "no particular tools"}, ${FREQ_LABEL[step.frequency] || "unclear how often"}, about ${TIME_LABEL[step.timeCost] || "an unclear amount of time"} each time
${facts}

As you help me think this through, ${guardrailNote(step.lens)}

${SOLUTION_ASK}`;
}

// This is a menu, not the build conversation — keep each item to one line of "why" plus
// the reframed question, so the whole thing stays skimmable even with many flagged steps.
// Full detail (pain point, idea, diagnostic facts) lives in that step's individual prompt.
function firstSentence(text) {
  if (!text) return "";
  const idx = text.indexOf(". ");
  return idx === -1 ? text : text.slice(0, idx + 1);
}

function buildConsolidatedPrompt(entries) {
  const lensesUsed = [...new Set(entries.map(e => e.step.lens).filter(Boolean))];
  const lensLabels = lensesUsed.map(l => LENS_LABEL[l]);
  const lensLabelStr = lensLabels.length > 1
    ? lensLabels.slice(0, -1).join(", ") + ", and " + lensLabels[lensLabels.length - 1]
    : (lensLabels[0] || "faculty member");
  const list = entries.map((e, i) => {
    const reason = firstSentence(e.analysis.why);
    const hmwLine = e.analysis.hmw ? `\n   How might we: ${e.analysis.hmw}` : "";
    return `${i + 1}. ${stepDisplayName(e.step)}\n   Why: ${reason}${hmwLine}`;
  }).join("\n\n");
  const guardrails = (lensesUsed.length ? lensesUsed : ["default"]).map(l => "- As you help me think through that one, " + guardrailNote(l === "default" ? undefined : l)).join("\n");
  return `I'm a ${lensLabelStr} at a university. I process-mapped my own workflow and found several places where AI might help. I'd like your help reviewing these with me. This is a quick overview of each — ask me for more detail on any of them before we start building.

Here's what I found:

${list}

A few things to keep in mind as we go:
${guardrails}

For each one, help me figure out what's actually possible, and whether it's better solved with a quick reusable prompt, a configured AI assistant, a small agent, or something else — ask me clarifying questions if you need more detail. Then help me decide which to prioritize and build that one first.`;
}

/* ════════════════════════════════════════════════════════════════
   RUN ANALYSIS / RENDER OUTPUT
════════════════════════════════════════════════════════════════ */
function analyze() {
  if (state.steps.length === 0) { alert("Add at least one step to your process map first."); return; }
  const results = state.steps.map(step => ({ step, analysis: analyzeStep(step) }));
  renderOpportunities(results);
  renderPrompts(results);
  document.getElementById("opportunitySection").classList.add("visible");
  document.getElementById("promptSection").classList.add("visible");
  document.getElementById("opportunitySection").scrollIntoView({ behavior: "smooth", block: "start" });
}

const LEVEL_ORDER = { opportunity: 0, assist: 1, human: 2, incomplete: 3 };
const LEVEL_PILL = { opportunity: ["go", "Strong AI Opportunity"], assist: ["assist", "AI Can Assist"], human: ["human", "Better Left to You"], incomplete: ["human", "Needs More Detail"] };

function renderOpportunities(results) {
  const sorted = [...results].sort((a, b) => LEVEL_ORDER[a.analysis.level] - LEVEL_ORDER[b.analysis.level]);

  // Breaking this out by tier — rather than one lumped "flagged" count — keeps the tool honest:
  // "AI Can Assist" and "Strong AI Opportunity" are meaningfully different verdicts, and burying
  // "better left to you" in the total undercuts the whole point of having that tier exist.
  const counts = { opportunity: 0, assist: 0, human: 0, incomplete: 0 };
  results.forEach(r => counts[r.analysis.level]++);
  const summaryParts = [
    `${results.length} step${results.length === 1 ? "" : "s"} mapped`,
    `${counts.opportunity} strong opportunit${counts.opportunity === 1 ? "y" : "ies"}`,
    `${counts.assist} where AI can assist`,
    `${counts.human} better left to you`,
  ];
  if (counts.incomplete) summaryParts.push(`${counts.incomplete} need${counts.incomplete === 1 ? "s" : ""} more detail`);
  document.getElementById("opportunityContext").textContent = summaryParts.join(" · ");

  document.getElementById("oppList").innerHTML = sorted.map(({ step, analysis }) => {
    const [pillClass, pillLabel] = LEVEL_PILL[analysis.level];
    const chips = [
      step.lens ? LENSES.find(l => l.key === step.lens)?.name.replace("Me as a ", "").replace("Me as an ", "") : null,
      analysis.type,
      FREQ_LABEL[step.frequency] ? "Frequency: " + FREQ_LABEL[step.frequency] : null,
      TIME_LABEL[step.timeCost] ? "Time: " + TIME_LABEL[step.timeCost] : null,
    ].filter(Boolean).map(c => `<span class="chip">${esc(c)}</span>`).join("");
    return `
    <div class="opp-card">
      <div class="opp-card-top">
        <div>
          <div class="opp-card-title">${esc(stepDisplayName(step))}</div>
          <div class="opp-chips">${chips}</div>
        </div>
        <span class="pill ${pillClass}">${pillLabel}</span>
      </div>
      ${analysis.hmw ? `<div class="hmw-line">${esc(analysis.hmw)}</div>` : ""}
      <div class="opp-why">${esc(analysis.why)}</div>
      ${analysis.sparks.length ? `<ul class="spark-mini">${analysis.sparks.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
    </div>`;
  }).join("");
}

function renderPrompts(results) {
  const flagged = results.filter(r => r.analysis.level === "opportunity" || r.analysis.level === "assist");
  const consolidatedWrap = document.querySelector(".consolidated-wrap");
  if (flagged.length === 0) {
    consolidatedWrap.style.display = "none";
    document.getElementById("individualPrompts").innerHTML = `<p class="empty-note">No steps were flagged as AI opportunities yet — that's a fine outcome too. Refine your diagnostic answers above, or add more steps, then run this again.</p>`;
    return;
  }
  consolidatedWrap.style.display = "";
  consolidatedPromptText = buildConsolidatedPrompt(flagged);
  document.getElementById("consolidatedPromptBox").textContent = consolidatedPromptText;

  individualPromptTexts = flagged.map(entry => buildStepPrompt(entry.step, entry.analysis));
  document.getElementById("individualPrompts").innerHTML = flagged.map((entry, i) => `
    <div class="prompt-section">
      <div class="prompt-mini-title">${esc(stepDisplayName(entry.step))}</div>
      <div class="prompt-box" id="promptBox-${i}">${esc(individualPromptTexts[i])}</div>
      <button class="btn btn-primary" onclick="copyText(this, individualPromptTexts[${i}])">Copy This Prompt</button>
    </div>`).join("");
}

/* ════════════════════════════════════════════════════════════════
   COPY / CLIPBOARD
════════════════════════════════════════════════════════════════ */
function copyText(btn, text) {
  if (!text) return;
  const finish = ok => {
    if (ok) { const orig = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => btn.textContent = orig, 2000); }
    else alert("Copy failed — select the text above and copy manually.");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => finish(true)).catch(() => finish(execFallback(text)));
  } else finish(execFallback(text));
}
function execFallback(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy"); document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

/* ════════════════════════════════════════════════════════════════
   SAVE / LOAD JSON
════════════════════════════════════════════════════════════════ */
function downloadJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "ProcessMap_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click(); URL.revokeObjectURL(url);
}
function loadJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      state.lenses = Array.isArray(data.lenses) ? data.lenses : [];
      state.steps = Array.isArray(data.steps) ? data.steps : [];
      stepIdCounter = state.steps.reduce((max, s) => Math.max(max, s.id || 0), 0);
      renderLensPicker(); renderSteps();
      document.getElementById("opportunitySection").classList.remove("visible");
      document.getElementById("promptSection").classList.remove("visible");
    } catch (err) { alert("Could not read that file — please make sure it's a valid saved process map (.json)."); }
  };
  reader.readAsText(file);
  event.target.value = "";
}

/* ════════════════════════════════════════════════════════════════
   PRINT / PDF EXPORT
════════════════════════════════════════════════════════════════ */
function buildPrintSummary() {
  const results = state.steps.map(step => ({ step, analysis: analyzeStep(step) }));
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  let html = `<div class="print-doc-title">Process Mapping &amp; AI Enablement — Center for Faculty Excellence, American University</div>
  <div class="print-doc-meta">Exported ${today}</div>
  <div class="print-section-title">Process Map</div>`;

  if (state.steps.length === 0) {
    html += `<p class="print-field">No steps added yet.</p>`;
  } else {
    html += state.steps.map((s, i) => `
      <div class="print-step">
        <h4>${stepIndexLabel(i)}. ${esc(stepDisplayName(s))}</h4>
        <div class="print-field"><b>Lens:</b> ${esc(LENSES.find(l=>l.key===s.lens)?.name || "—")}</div>
        <div class="print-field"><b>What happens:</b> ${esc(s.description || "—")}</div>
        <div class="print-field"><b>Who's involved:</b> ${esc(s.who || "—")} &nbsp; <b>Tools:</b> ${esc(s.tools || "—")}</div>
        <div class="print-field"><b>Frequency:</b> ${esc(FREQ_LABEL[s.frequency] || "—")} &nbsp; <b>Time:</b> ${esc(TIME_LABEL[s.timeCost] || "—")}</div>
        ${s.painPoint ? `<div class="print-field"><b>Pain point:</b> ${esc(s.painPoint)}</div>` : ""}
        ${s.ideaHelp ? `<div class="print-field"><b>Idea for what might help:</b> ${esc(s.ideaHelp)}</div>` : ""}
      </div>`).join("");
  }

  html += `<div class="print-section-title">Opportunity Findings</div>`;
  html += results.map(({ step, analysis }, i) => `
    <div class="print-step">
      <h4>${stepIndexLabel(i)}. ${esc(stepDisplayName(step))} — ${LEVEL_PILL[analysis.level][1]}</h4>
      ${analysis.hmw ? `<div class="print-hmw">${esc(analysis.hmw)}</div>` : ""}
      <div class="print-field">${esc(analysis.why)}</div>
    </div>`).join("");

  const flagged = results.filter(r => r.analysis.level === "opportunity" || r.analysis.level === "assist");
  if (flagged.length) {
    html += `<div class="print-section-title">Where to Take This</div>`;
    html += `<div class="print-step">${TOOL_OPTIONS.map(t => `<div class="print-field"><b>${esc(t.name)}:</b> ${esc(t.note)}</div>`).join("")}</div>`;

    html += `<div class="print-section-title">Generated Prompts</div>`;
    html += `<div class="print-step"><h4>Consolidated Prompt</h4><div class="print-field" style="white-space:pre-wrap;">${esc(buildConsolidatedPrompt(flagged))}</div></div>`;
    html += flagged.map(({ step, analysis }) => `
      <div class="print-step"><h4>${esc(stepDisplayName(step))}</h4><div class="print-field" style="white-space:pre-wrap;">${esc(buildStepPrompt(step, analysis))}</div></div>`).join("");
  }
  document.getElementById("printSummaryFilled").innerHTML = html;
}

function buildBlankTemplate() {
  const rows = 6;
  let stepBlocks = "";
  for (let i = 1; i <= rows; i++) {
    stepBlocks += `
    <div class="print-step">
      <h4>Step ${i}</h4>
      <div class="print-field"><b>Step name:</b></div><div class="print-blank-line"></div>
      <div class="print-field"><b>What happens:</b></div><div class="print-blank-line"></div><div class="print-blank-line"></div>
      <div class="print-field"><b>Who's involved / tools used:</b></div><div class="print-blank-line"></div>
      <div class="print-field"><b>How often, and how long each time:</b></div><div class="print-blank-line"></div>
      <div class="print-field"><b>What's frustrating about this step (optional):</b></div><div class="print-blank-line"></div>
      <div class="print-field"><b>Do you already have an idea of what might help (optional):</b></div><div class="print-blank-line"></div>
      <div class="print-checklist">
        <b>Does it look the same each time?</b> ☐ Same every time &nbsp; ☐ Mostly the same &nbsp; ☐ Different every time<br>
        <b>What does it mostly involve?</b> ☐ Reading/reviewing &nbsp; ☐ Writing/drafting &nbsp; ☐ Organizing/sorting &nbsp; ☐ Analyzing data &nbsp; ☐ Answering repeat questions &nbsp; ☐ Live conversation &nbsp; ☐ Physical/logistical<br>
        <b>What kind of judgment does it take?</b> ☐ Rule/rubric I could write down &nbsp; ☐ A mix &nbsp; ☐ Depends on the person/situation in the moment<br>
        ☐ This is really several actions chained together &nbsp; ☐ I'd want to keep doing this myself
      </div>
      <div class="print-field"><b>Why might (or might not) this be a good AI opportunity?</b></div><div class="print-blank-line"></div><div class="print-blank-line"></div>
      <div class="print-field"><b>How might we...?</b></div><div class="print-blank-line"></div>
    </div>`;
  }
  document.getElementById("printBlankTemplate").innerHTML = `
    <div class="print-doc-title">Process Mapping &amp; AI Enablement — Blank Worksheet</div>
    <div class="print-doc-meta">Center for Faculty Excellence · American University — fill in by hand, then enter your answers online to generate your AI prompts.</div>
    ${stepBlocks}`;
}

function downloadPDF() {
  buildPrintSummary();
  document.body.classList.add("print-filled");
  window.print();
}
function printBlank() {
  buildBlankTemplate();
  document.body.classList.add("print-blank");
  window.print();
}
window.onafterprint = () => document.body.classList.remove("print-filled", "print-blank");

/* ════════════════════════════════════════════════════════════════
   UTIL
════════════════════════════════════════════════════════════════ */
function esc(str) {
  return String(str ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function escAttr(str) {
  return esc(str).replace(/"/g,"&quot;");
}
function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
  document.getElementById("themeIcon").textContent = isDark ? "🌙" : "☀️";
  document.getElementById("themeLabel").textContent = isDark ? "Dark Mode" : "Light Mode";
}

/* ════════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════════ */
renderLensPicker();
renderToolOptions();
addStep();
