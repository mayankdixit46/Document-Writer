// Document Writer Web App Client Logic

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Mermaid.js
    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    // UI Elements
    const tabGenerate = document.getElementById("tabGenerate");
    const tabPreview = document.getElementById("tabPreview");
    const viewGenerate = document.getElementById("viewGenerate");
    const viewPreview = document.getElementById("viewPreview");

    const templateFileInput = document.getElementById("templateFileInput");
    const templateFileName = document.getElementById("templateFileName");
    const fragmentedTextInput = document.getElementById("fragmentedTextInput");
    const screenshotsInput = document.getElementById("screenshotsInput");
    const screenshotsList = document.getElementById("screenshotsList");

    const transcriptFileInput = document.getElementById("transcriptFileInput");
    const transcriptFileName = document.getElementById("transcriptFileName");
    const btnSampleVtt = document.getElementById("btnSampleVtt");

    const apiKeyInput = document.getElementById("apiKeyInput");
    const btnSampleData = document.getElementById("btnSampleData");
    const btnProcess = document.getElementById("btnProcess");

    const progressModal = document.getElementById("progressModal");
    const progressStatus = document.getElementById("progressStatus");
    const progressBar = document.getElementById("progressBar");

    const btnDownloadDocx = document.getElementById("btnDownloadDocx");
    const btnDownloadPdf = document.getElementById("btnDownloadPdf");
    const mermaidRenderContainer = document.getElementById("mermaidRenderContainer");
    const rawMermaidText = document.getElementById("rawMermaidText");
    const btnReRenderDiagram = document.getElementById("btnReRenderDiagram");
    const documentTextPreview = document.getElementById("documentTextPreview");

    let uploadedScreenshots = [];

    // VTT & Transcript File Parser
    function cleanTranscriptText(text) {
        if (!text || !text.trim()) return "";
        let content = text.trim();

        if (content.startsWith("{") || content.startsWith("[")) {
            try {
                const data = JSON.parse(content);
                if (data.text) return data.text.trim();
                if (Array.isArray(data.segments)) {
                    return data.segments.map(s => s.text).filter(Boolean).join("\n");
                }
            } catch (e) {}
        }

        const lines = content.split(/\r?\n/);
        const cleaned = [];

        lines.forEach(line => {
            let l = line.trim();
            if (l.startsWith("WEBVTT") || l.startsWith("NOTE") || l.startsWith("STYLE") || l.startsWith("REGION") || l.startsWith("Kind:")) return;
            if (!l) return;
            if (/^\d+$/.test(l)) return;
            if (l.includes("-->") && /\d{2}:\d{2}/.test(l)) return;

            l = l.replace(/<[^>]+>/g, "").trim();
            l = l.replace(/^(?:\[|\()? \d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)? (?:\]|\))?\s*[\-:\s]*/i, "").trim();

            if (l) {
                if (cleaned.length === 0 || cleaned[cleaned.length - 1] !== l) {
                    cleaned.push(l);
                }
            }
        });

        return cleaned.join("\n");
    }

    // File Handler: VTT / Transcript File
    if (transcriptFileInput) {
        transcriptFileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    const rawContent = event.target.result;
                    const cleaned = cleanTranscriptText(rawContent);
                    fragmentedTextInput.value = cleaned;
                    transcriptFileName.innerText = `Loaded: ${file.name} (Parsed ${cleaned.split('\n').length} lines)`;
                    transcriptFileName.classList.add("text-indigo-400");
                };
                reader.readAsText(file);
            }
        });
    }

    // Tab Switching Logic
    tabGenerate.addEventListener("click", () => {
        tabGenerate.className = "px-5 py-3 text-sm font-semibold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition cursor-pointer";
        tabPreview.className = "px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition cursor-pointer";
        viewGenerate.classList.remove("hidden");
        viewPreview.classList.add("hidden");
    });

    tabPreview.addEventListener("click", () => {
        tabPreview.className = "px-5 py-3 text-sm font-semibold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition cursor-pointer";
        tabGenerate.className = "px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition cursor-pointer";
        viewPreview.classList.remove("hidden");
        viewGenerate.classList.add("hidden");
    });

    // File Input Handler: Template
    templateFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            templateFileName.innerText = `Selected Template: ${e.target.files[0].name}`;
            templateFileName.classList.add("text-blue-400");
        }
    });

    // File Input Handler: Screenshots
    screenshotsInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        uploadedScreenshots = uploadedScreenshots.concat(files);
        renderScreenshotList();
    });

    function renderScreenshotList() {
        if (uploadedScreenshots.length === 0) {
            screenshotsList.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4">No screenshots added yet.</p>`;
            return;
        }

        screenshotsList.innerHTML = "";
        uploadedScreenshots.forEach((file, index) => {
            const item = document.createElement("div");
            item.className = "flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300";
            item.innerHTML = `
                <div class="flex items-center gap-2 truncate">
                    <i class="fa-solid fa-image text-blue-400"></i>
                    <span class="truncate">${file.name}</span>
                </div>
                <button data-index="${index}" class="remove-shot text-slate-500 hover:text-red-400 transition">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            screenshotsList.appendChild(item);
        });

        // Add event listener to remove buttons
        document.querySelectorAll(".remove-shot").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.currentTarget.getAttribute("data-index"));
                uploadedScreenshots.splice(idx, 1);
                renderScreenshotList();
            });
        });
    }

    // Load Sample Data Presets
    btnSampleData.addEventListener("click", () => {
        fragmentedTextInput.value = `DOCUMENT TITLE: NBA Treatment and Offer Creation & Deployment Process Flow (1:1 Ops Manager)

PURPOSE:
This Standard Operating Procedure (SOP) defines the operational workflow for creating, configuring, testing, and deploying Next Best Action (NBA) treatments and marketing offer assets across operational environments.

SCOPE:
Applies to all marketing operations managers, campaign execution teams, and AI automation agents responsible for authoring and deploying 1:1 Ops Manager change requests.

DEFINITIONS, ACRONYMS AND ABBREVIATIONS:
- CEA: Campaign Execution Applications
- CDH-Internal: Lead Marketing Management System (internal)
- NBA: Next Best Action
- 1:1 Ops Manager: One-to-One Operations Manager (change request management system)
- BeeFree Editor: Email content editor for treatment authoring
- Persona/Seed List: Test contacts for personalization testing
- Treatment Name: Display name for the email treatment
- Asset Display Name: Derived from the Treatment Name
- Key Code: Set at the action level in the action flow
- Asset Name: Corresponds to the key code

PROCESS OBJECTIVE:
Ensure error-free, automated, and compliant creation of NBA email treatments, HTML email assembly in BeeFree Editor, preview authorization, and handoff for offer deployment.

TOOLS USED:
- CEA (Campaign Execution Applications)
- CDH-Internal
- 1:1 Ops Manager Portal
- Adobe DreamWeaver (for HTML creation)
- BeeFree Editor (for email content authoring)

PROCESS STEPS & SWIMLANES:
1. CEA System (Requester & Approver): Submit CEA Ticket (Issue, Topic, Notes, Metadata).
2. CEA System (Requester & Approver): Approver Review & Select NBA Checkbox (If Yes, move ticket to Pending Fulfillment stage; if No, return to ticket submission).
3. System Automation & AI Agent: Auto-Create Change Request (CR) in 1:1 Ops Manager (Linked by EM Number).
4. System Automation & AI Agent: AI Agent Completes Plan Stage Activities (Logs to Pulse) and opens in Build Stage.
5. 1:1 Ops Manager Portal (Super User): Log in as Super User & Navigate to Change Request.
6. 1:1 Ops Manager Portal (Super User): Locate CR by EM Number & Verify Build Stage.
7. 1:1 Ops Manager Portal (Super User): Navigate to Build Stage -> Email Treatment and Click Go on Author Treatment Step.
8. 1:1 Ops Manager Portal (Super User): Configure Treatment Details (Enter Name, Key Code auto-pulled).
9. 1:1 Ops Manager Portal (Super User): Create & Review Email Content in BeeFree Editor (Paste HTML from DreamWeaver, Select Blank Template, Visual Preview & Save).
10. 1:1 Ops Manager Portal (Super User): Preview and Test (Select Email Account, Enter Test/Litmus IDs, Send Test Email).
11. 1:1 Ops Manager Portal (Super User): Review & Share Preview (If Amends Needed, return to BeeFree Editor; if Approved, Share Preview to Requester in CEA Attachments).
12. 1:1 Ops Manager Portal (Super User): Attach Email Treatment Info & Submit.
13. CEA System (Requester & Approver): Requester Approval (If Rejected, return to Preview and Test; if Approved, Tag Mayank in Pulse Comments for Handoff).
14. 1:1 Ops Manager Portal (Mayank): Ticket Assigned to Mayank.
15. 1:1 Ops Manager Portal (Mayank): Create NBA Actions & Action Level Eligibility (End: Offer Deployed).

PROCEDURE & DETAILED STEPS:
Creating Action:
Newsletter Build:
- Clone the most recent approved newsletter or approved base template
- Remove unused modules (do not comment on them)
- Replace all placeholder text
- Update copy, URLs, icons, and CTAs
- Validate URLs, UTMs, and chronological blade tracking
- Ensure all links resolve to pega.com or Partner Portal unless approved otherwise

Template Variations:
Partner Newsletter:
- Remove highlighted speaker section
- Add table of contents
- Include consistent final resources module

Community Newsletter:
- Replace speaker section with "The latest Pega Community news" module
- Refresh copies monthly

Imagery and Icons:
- Reuse approved monthly banner images
- Banner links must resolve to Partner Portal or Community homepage
- Use standard DAM icons and hyperlink them to the primary CTA

Tracking and URLs:
- Apply PREFERRED_APP_AREA=banner_image or blade_xx to all URLs
- Keep blade numbers consistent within each module
- Use hidden formatting for date hyperlinks
- Exclude NBA secondary CTA from newsletters

Audience Management:
- Use approved base segments for Partner and Community newsletters
- Update Community Manual List monthly using Power BI Active 90Day Member List

VERSION HISTORY:
- Ver.1 | 21.05.2024 | Requested By: Operations Team | Prepared/Modified By: Sajan Myndapanda | Significant Changes: New process based on pillars`;
    });

    if (btnSampleVtt) {
        btnSampleVtt.addEventListener("click", () => {
            const sampleVtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.500
Welcome to the Equipment Maintenance SOP session.

2
00:00:04.600 --> 00:00:09.200
<v Operator>Operator:</v> Step 1: Check fluid levels and verify pressure reading.

3
00:00:09.300 --> 00:00:15.000
<v Supervisor>Supervisor:</v> Step 2: If pressure exceeds 60 PSI, activate emergency safety release valve.

4
00:00:15.100 --> 00:00:20.000
<v Technician>Technician:</v> Step 3: Log inspection metrics in digital safety portal.`;

            const cleaned = cleanTranscriptText(sampleVtt);
            fragmentedTextInput.value = cleaned;
            transcriptFileName.innerText = `Loaded: sample_meeting.vtt (Parsed 4 transcript lines)`;
            transcriptFileName.classList.add("text-indigo-400");
        });
    }

    // Main Process Document Submit
    btnProcess.addEventListener("click", async () => {
        const textContent = fragmentedTextInput.value.trim();
        if (!textContent) {
            alert("Please provide fragmented input text or upload a VTT / transcript file.");
            return;
        }

        // Show Progress Modal
        progressModal.classList.remove("hidden");
        updateProgress("Parsing VTT transcript & extracting formatting rules...", "25%");

        const formData = new FormData();
        if (templateFileInput.files.length > 0) {
            formData.append("template_file", templateFileInput.files[0]);
        }
        if (transcriptFileInput && transcriptFileInput.files.length > 0) {
            formData.append("transcript_file", transcriptFileInput.files[0]);
        }
        formData.append("raw_text", textContent);
        if (apiKeyInput.value.trim()) {
            formData.append("api_key", apiKeyInput.value.trim());
        }

        uploadedScreenshots.forEach(file => {
            formData.append("screenshots", file);
        });

        try {
            setTimeout(() => updateProgress("Gemini AI structuring content & analyzing process steps...", "50%"), 1000);
            setTimeout(() => updateProgress("Generating Mermaid Process Flowchart & Diagram...", "75%"), 2000);

            const response = await fetch("/api/process", {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Error processing document.");
            }

            const data = await response.json();

            updateProgress("Finalizing Word document & PDF exports...", "100%");

            setTimeout(() => {
                progressModal.classList.add("hidden");
                displayResults(data);
            }, 600);

        } catch (error) {
            progressModal.classList.add("hidden");
            alert(`Synthesis Error: ${error.message}`);
        }
    });

    function updateProgress(statusMessage, progressPercent) {
        progressStatus.innerText = statusMessage;
        progressBar.style.width = progressPercent;
    }

    function displayResults(data) {
        // Configure Download Links
        btnDownloadDocx.href = `/api/download/${data.files.docx}`;
        btnDownloadPdf.href = `/api/download/${data.files.pdf}`;

        // Setup Mermaid Diagram
        const code = data.mermaid_code || "graph TD\n  A[Start] --> B[Process]";
        rawMermaidText.value = code;
        renderMermaidDiagram(code);

        // Build Text Preview
        const structured = data.structured_data || {};
        let html = `
            <div class="border-b border-slate-800 pb-3 mb-3">
                <h3 class="text-base font-bold text-white">${structured.title || 'Standard Document'}</h3>
                <p class="text-xs text-blue-400 font-medium">${structured.subtitle || ''}</p>
            </div>
            <div class="bg-slate-950 p-3 rounded border border-slate-800 mb-4">
                <h4 class="font-semibold text-slate-300 text-xs mb-1">Executive Summary</h4>
                <p class="text-slate-400 italic">${structured.executive_summary || ''}</p>
            </div>
        `;

        (structured.sections || []).forEach(sec => {
            html += `
                <div class="mb-4">
                    <h4 class="font-bold text-slate-200 text-xs mb-1">${sec.heading}</h4>
                    ${(sec.paragraphs || []).map(p => `<p class="mb-1 text-slate-300">${p}</p>`).join('')}
                    ${(sec.bullet_points || []).length ? `
                        <ul class="list-disc list-inside text-slate-400 pl-2 mb-2">
                            ${sec.bullet_points.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${sec.callout_box ? `<div class="bg-amber-950/40 border-l-2 border-amber-500 p-2 my-2 text-amber-200 text-xs">${sec.callout_box}</div>` : ''}
                </div>
            `;
        });

        documentTextPreview.innerHTML = html;

        tabPreview.click();
    }

    async function renderMermaidDiagram(mermaidCode) {
        if (!mermaidCode || !mermaidCode.trim()) {
            mermaidRenderContainer.innerHTML = `<p class="text-xs text-amber-400">Please enter valid Mermaid diagram code.</p>`;
            return;
        }
        mermaidRenderContainer.removeAttribute("data-processed");
        mermaidRenderContainer.innerHTML = "";
        
        try {
            const id = "mermaid-svg-" + Math.floor(Math.random() * 100000);
            const { svg } = await mermaid.render(id, mermaidCode.trim());
            mermaidRenderContainer.innerHTML = svg;
        } catch (e) {
            console.error("Mermaid client-side render error:", e);
            mermaidRenderContainer.innerHTML = `
                <div class="p-4 bg-red-950/40 border border-red-800/80 rounded-xl text-left w-full">
                    <p class="text-xs font-bold text-red-400 mb-1"><i class="fa-solid fa-triangle-exclamation"></i> Diagram Syntax Error</p>
                    <pre class="text-[11px] text-red-300 font-mono whitespace-pre-wrap">${e.message || e}</pre>
                </div>
            `;
        }
    }

    // Render initial sample process flow diagram
    const defaultInitialMermaid = `graph TD
    classDef default fill:#EBF8FF,stroke:#1A365D,stroke-width:2px;
    S1["Requisitioner: Initiates Request"] --> S2["Manager: Approval Check"]
    S2 --> S3["Procurement: Verification"]
    S3 --> S4["Vendor: Delivery & Receiving"]
    S4 --> S5["Finance: Invoice Matching & Payment"]`;

    rawMermaidText.value = defaultInitialMermaid;
    renderMermaidDiagram(defaultInitialMermaid);

    documentTextPreview.innerHTML = `
        <div class="border-b border-slate-800 pb-3 mb-3">
            <h3 class="text-base font-bold text-white">Enterprise Purchase Requisition & Approval Process</h3>
            <p class="text-xs text-blue-400 font-medium">Standard Operating Procedure Sample</p>
        </div>
        <div class="bg-slate-950 p-3 rounded border border-slate-800 mb-4">
            <h4 class="font-semibold text-slate-300 text-xs mb-1">Executive Summary</h4>
            <p class="text-slate-400 italic">This SOP defines the required steps for creating, authorizing, and processing purchase requisitions across all operations units.</p>
        </div>
        <div class="mb-4">
            <h4 class="font-bold text-slate-200 text-xs mb-1">Interactive Process Flow Synthesizer</h4>
            <p class="text-slate-300 mb-1">You can edit the Mermaid flowchart code on the left and click "Re-render Diagram", or switch to "Document Synthesizer" to process custom text & templates.</p>
        </div>
    `;

    btnReRenderDiagram.addEventListener("click", () => {
        renderMermaidDiagram(rawMermaidText.value);
    });
});
