const reports = [];

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Element references ----------

  const codeInput = document.getElementById("codeInput");
  const codeHighlight = document.getElementById("codeHighlight"); // NOTE: Stubbed in the HTML, but referenced here.

  const analyzeBtn = document.getElementById("analyzeBtn");
  const clearBtn = document.getElementById("clearBtn");
  const fileInput = document.getElementById("fileInput");
  const languageSelect = document.getElementById("languageSelect"); // Added to HTML

  const resultsSection = document.getElementById("resultsSection");
  const issuesList = document.getElementById("issuesList");
  const noIssuesMessage = document.getElementById("noIssuesMessage");
  const totalIssuesEl = document.getElementById("totalIssues");
  const warningCountEl = document.getElementById("warningCount");
  const suggestionCountEl = document.getElementById("suggestionCount");

  const suggestionsSection = document.getElementById("suggestionsSection");
  const suggestedCodeEl = document.getElementById("suggestedCode");
  const copySuggestedBtn = document.getElementById("copySuggestedBtn");

  // Updated navigation references for the three pages
  const navDashboard = document.getElementById("navDashboard");
  const navReports = document.getElementById("navReports");
  const navAbout = document.getElementById("navAbout");

  const dashboardPage = document.getElementById("dashboardPage");
  const reportsPage = document.getElementById("reportsPage");
  const aboutPage = document.getElementById("aboutPage");

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const reportsTableBody = document.getElementById("reportsTableBody");
  
  // References for smooth scroll
  const getStartedBtn = document.getElementById("getStartedBtn");
  const editorSection = document.getElementById("editorSection");

  // Smooth scroll logic
  if (getStartedBtn && editorSection) {
    getStartedBtn.addEventListener("click", () => {
        editorSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // ---------- Helper: page navigation ----------

  function setActivePage(page) {
    // Check if pages exist
    if (!dashboardPage || !reportsPage || !aboutPage) return;

    // Hide all pages
    [dashboardPage, reportsPage, aboutPage].forEach(el => el && el.classList.add("hidden"));

    // Show the active page
    if (page === "dashboard") dashboardPage.classList.remove("hidden");
    if (page === "reports") reportsPage.classList.remove("hidden");
    if (page === "about") aboutPage.classList.remove("hidden");

    // Set active nav styles
    [navDashboard, navReports, navAbout].forEach((el) =>
      el && el.classList.remove("active")
    );
    if (page === "dashboard" && navDashboard) navDashboard.classList.add("active");
    if (page === "reports" && navReports) navReports.classList.add("active");
    if (page === "about" && navAbout) navAbout.classList.add("active");
  }

  // Attach navigation listeners
  if (navDashboard) navDashboard.addEventListener("click", () => setActivePage("dashboard"));
  if (navReports) navReports.addEventListener("click", () => setActivePage("reports"));
  if (navAbout) navAbout.addEventListener("click", () => setActivePage("about"));

  // Default page on load
  setActivePage("dashboard");

  // ---------- Helper: theme (dark / light) ----------

  function applyTheme(theme) {
    if (!document.body) return;
    
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    
    if (themeIcon) {
      themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
    }
  }

  const storedTheme = localStorage.getItem("theme") || "light";
  applyTheme(storedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const current = document.body.classList.contains("dark") ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
    });
  }

  // ---------- Helper: error line highlighting (simplified) ----------

  function getErroredLineNumbers(issues) {
    const lines = new Set();
    if (!issues || !Array.isArray(issues)) return [];

    issues.forEach((issue) => {
      if (issue && typeof issue.message === "string") {
        const match = issue.message.match(/Line\s+(\d+)\s*:/i);
        if (match) {
          lines.add(parseInt(match[1], 10));
        }
      }
    });

    return Array.from(lines);
  }

  function updateCodeHighlight(errorLines = []) {
    // This is a stub, as the full highlighting element is not present.
    // In a full implementation, this function would update the codeHighlight element.
    return;
  }

  // Keep highlight in sync with typing / scrolling
  if (codeInput) {
    codeInput.addEventListener("input", () => {
      // Clear any manual highlighting on input
      updateCodeHighlight([]);
    });
  }

  // ---------- Helper: build local suggested code (fallback) ----------

  function buildSuggestedCode(originalCode, language) {
    // This provides a fallback if the backend AI call fails.
    const cleaned = (originalCode || "")
      .split("\n")
      .map((line) => line.replace(/\s+$/g, "")) // Trim trailing whitespace
      .join("\n");

    let comment = "#";
    if (["javascript", "java", "c", "cpp"].includes(language)) {
      comment = "//";
    }

    const header =
      `${comment} Suggested version (demo)\n` +
      `${comment} This version is lightly cleaned based on the analysis.\n\n`;

    return header + cleaned;
  }

  // ---------- Helper: render results ----------

  function renderResults(result) {
    if (!resultsSection || !issuesList || !result) return;

    const issues = Array.isArray(result.issues) ? result.issues : [];

    if (totalIssuesEl) totalIssuesEl.textContent = String(result.total ?? issues.length);
    if (warningCountEl) warningCountEl.textContent = String(result.warnings ?? 0);
    if (suggestionCountEl)
      suggestionCountEl.textContent = String(result.suggestions ?? 0);

    issuesList.innerHTML = "";

    if (!issues.length) {
      if (noIssuesMessage) noIssuesMessage.classList.remove("hidden");
      resultsSection.classList.remove("hidden");
      return;
    }

    if (noIssuesMessage) noIssuesMessage.classList.add("hidden");

    issues.forEach((issue) => {
      const li = document.createElement("li");
      li.className = "issue"; 

      const typeLabel = issue.type
        ? issue.type.charAt(0).toUpperCase() + issue.type.slice(1)
        : "Info";
      
      const badgeClass = `badge-${issue.type}`; // Uses CSS classes for color

      li.innerHTML = `
        <div class="issue-header">
          <span class="issue-badge ${badgeClass}">${typeLabel}</span>
          <span class="issue-title">${issue.title || ""}</span>
        </div>
        <p class="issue-message issue-detail">${issue.message || ""}</p>
      `;

      issuesList.appendChild(li);
    });

    resultsSection.classList.remove("hidden");
  }

  // ---------- Helper: reports table ----------

  function renderReportsTable() {
    if (!reportsTableBody) return;

    reportsTableBody.innerHTML = "";

    reports.forEach((report, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${index + 1}</td> 
        <td>${report.timestamp}</td>
        <td>${report.language}</td>
        <td>${report.total}</td>
        <td>${report.warnings}</td>
        <td>${report.suggestions}</td>
      `;

      reportsTableBody.appendChild(tr);
    });
  }

  function addReport(language, result) {
    const now = new Date();
    const timestamp = now.toLocaleString();

    reports.unshift({
      timestamp,
      language,
      total: result.total ?? 0,
      warnings: result.warnings ?? 0,
      suggestions: result.suggestions ?? 0,
    });

    renderReportsTable();
  }

  // ---------- File upload ----------

  if (fileInput && codeInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        codeInput.value = String(event.target.result || "");
        updateCodeHighlight([]);
      };
      reader.readAsText(file);
    });
  }

  // ---------- Clear button ----------

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (codeInput) codeInput.value = "";
      if (resultsSection) resultsSection.classList.add("hidden");
      if (suggestionsSection) suggestionsSection.classList.add("hidden");
      if (suggestedCodeEl) suggestedCodeEl.value = "";
      updateCodeHighlight([]);
    });
  }

  // ---------- Copy button in suggestion box ----------

  if (copySuggestedBtn && suggestedCodeEl) {
    copySuggestedBtn.addEventListener("click", () => {
      navigator.clipboard
        .writeText(suggestedCodeEl.value || "")
        .then(() => {
          copySuggestedBtn.textContent = "Copied!";
          setTimeout(() => {
            copySuggestedBtn.textContent = "Copy";
          }, 1200);
        })
        .catch(() => {
          alert("Copy failed. Try manually.");
        });
    });
  }

  // ---------- Analyze button (main flow) ----------

  if (analyzeBtn && codeInput && languageSelect) {
    analyzeBtn.addEventListener("click", async () => {
      const code = codeInput.value;
      const language = languageSelect.value;

      if (!code.trim()) {
        alert("Please paste or type some code first.");
        return;
      }

      const originalText = analyzeBtn.textContent;
      
      // Set button to disabled/loading state
      analyzeBtn.disabled = true;
      analyzeBtn.classList.add("disabled-btn"); 
      analyzeBtn.textContent = "Analyzing..."; 

      try {
        const response = await fetch("http://localhost:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
        });

        if (!response.ok) {
          throw new Error("Server error: " + response.status);
        }

        const result = await response.json();

        // Render analysis results
        renderResults(result);
        addReport(language, result);

        // Highlight errored lines
        const errorLines = getErroredLineNumbers(result.issues || []);
        // updateCodeHighlight(errorLines); // Function is stubbed

        // Show AI-edited code if available, otherwise fallback
        if (suggestedCodeEl && suggestionsSection) {
          if (result.suggested_code) {
            suggestedCodeEl.value = result.suggested_code;
          } else {
            const suggested = buildSuggestedCode(code, language, result);
            suggestedCodeEl.value = suggested;
          }
          suggestionsSection.classList.remove("hidden");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to analyze code. Is the backend running?");
      } finally {
        // Reset button state
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove("disabled-btn");
        analyzeBtn.textContent = originalText;
      }
    });
  }
  
  // Initial rendering of reports table (should be at the end)
  renderReportsTable();
});