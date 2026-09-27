// Document Writer - GitHub Pages Client Application

document.addEventListener("DOMContentLoaded", () => {
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
    const mermaidRenderContainer = document.getElementById("mermaidRenderContainer");
    const rawMermaidText = document.getElementById("rawMermaidText");
    const btnReRenderDiagram = document.getElementById("btnReRenderDiagram");
    const documentTextPreview = document.getElementById("documentTextPreview");

    let uploadedScreenshots = [];
    let currentStructuredData = null;

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

    // Tabs
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

    // Template input
    templateFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            templateFileName.innerText = `Template Selected: ${e.target.files[0].name}`;
            templateFileName.classList.add("text-blue-400");
        }
    });

    // Screenshots input
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

        document.querySelectorAll(".remove-shot").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.currentTarget.getAttribute("data-index"));
                uploadedScreenshots.splice(idx, 1);
                renderScreenshotList();
            });
        });
    }

    // Sample Data
    btnSampleData.addEventListener("click", () => {
        fragmentedTextInput.value = `DOCUMENT TITLE: Standard Equipment Maintenance Procedure

EXECUTIVE SUMMARY:
This document outlines standard maintenance and operating sequence for industrial pump units.

PROCESS STEPS:
1. Operator inspects fluid levels and checks pressure gauge.
2. If pressure exceeds 60 PSI, operator activates safety release valve.
3. Maintenance log is updated with digital signature.
4. Supervisor signs off on weekly report.

SAFETY NOTES:
- Retain all safety inspection screenshots attached to this SOP.`;
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

    // Synthesis Process
    btnProcess.addEventListener("click", async () => {
        const rawText = fragmentedTextInput.value.trim();
        if (!rawText) {
            alert("Please provide fragmented input text.");
            return;
        }

        progressModal.classList.remove("hidden");
        updateProgress("Structuring text content...", "30%");

        const apiKey = apiKeyInput.value.trim();

        try {
            let structured = null;
            if (apiKey) {
                structured = await callGeminiAPI(rawText, apiKey);
            } else {
                structured = fallbackParseText(rawText);
            }

            updateProgress("Generating Mermaid Process Diagram...", "60%");
            currentStructuredData = structured;

            const code = structured.mermaid_code || fallbackMermaid(structured);
            rawMermaidText.value = code;

            updateProgress("Rendering UI preview & preparing Word document...", "90%");
            renderResults(structured, code);

            setTimeout(() => {
                progressModal.classList.add("hidden");
                tabPreview.disabled = false;
                tabPreview.click();
            }, 500);

        } catch (err) {
            progressModal.classList.add("hidden");
            alert(`Synthesis Notice: ${err.message}. Using built-in parser.`);
            const fallbackData = fallbackParseText(rawText);
            renderResults(fallbackData, fallbackData.mermaid_code);
            tabPreview.disabled = false;
            tabPreview.click();
        }
    });

    function updateProgress(msg, width) {
        progressStatus.innerText = msg;
        progressBar.style.width = width;
    }

    async function callGeminiAPI(text, key) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        const prompt = `Structure the following raw text into JSON with fields: title, subtitle, executive_summary, sections (array of heading, paragraphs, bullet_points, callout_box), process_title, process_steps (array of step_number, actor, action_title, description), mermaid_code (Mermaid diagram graph TD code).
        Text: ${text}`;

        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!resp.ok) throw new Error("Gemini API error");
        const json = await resp.json();
        const outputText = json.candidates[0].content.parts[0].text;
        return JSON.parse(outputText);
    }

    function fallbackParseText(text) {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        const title = lines[0] || "Standard Operating Document";
        
        const extracted_steps = [];
        let step_idx = 1;
        lines.forEach(line => {
            const m = line.match(/^(?:[\-\*\•]\s*)?(?:step\s*)?(\d+)[\.\:\-\)]\s*(.+)/i);
            if (m) {
                const stepContent = m[2].strip ? m[2].strip() : m[2].trim();
                const parts = stepContent.split(/[:\-–]/);
                const titlePart = parts[0].trim();
                const descPart = parts.length > 1 ? parts[1].trim() : titlePart;
                const words = titlePart.split(/\s+/);
                const actor = (words && words[0] && words[0][0] === words[0][0].toUpperCase()) ? words[0] : "";
                extracted_steps.push({
                    step_number: step_idx,
                    actor: actor,
                    action_title: titlePart.slice(0, 45),
                    description: descPart,
                    is_decision: /if|check|verify|review|approve/i.test(descPart)
                });
                step_idx++;
            }
        });

        const steps = extracted_steps.length ? extracted_steps : [
            { step_number: 1, actor: "Operator", action_title: "Initial Check", description: "Verify controls and input text" },
            { step_number: 2, actor: "System", action_title: "AI Synthesis", description: "Re-organize sections and generate diagram" },
            { step_number: 3, actor: "User", action_title: "Download Output", description: "Export Word .docx document" }
        ];

        let mermaidLines = ["graph TD", "  classDef default fill:#EBF8FF,stroke:#1A365D,stroke-width:2px;"];
        steps.forEach((s, idx) => {
            const label = s.actor ? `${s.actor}: ${s.action_title}` : s.action_title;
            const cleanLabel = label.replace(/"/g, "'");
            if (s.is_decision) {
                mermaidLines.push(`  S${s.step_number}{"${cleanLabel}?"}`);
            } else {
                mermaidLines.push(`  S${s.step_number}["${cleanLabel}"]`);
            }
            if (idx > 0) {
                mermaidLines.push(`  S${steps[idx-1].step_number} --> S${s.step_number}`);
            }
        });

        return {
            title: title,
            subtitle: "Synthesized Document Standard",
            executive_summary: text.slice(0, 250) + "...",
            sections: [
                {
                    heading: "General Operating Instructions",
                    paragraphs: lines.slice(1, 5),
                    bullet_points: ["Compliance check required", "Safety protocol active"],
                    callout_box: "Maintain attached screenshots as per document standard."
                }
            ],
            process_title: title + " - Flow",
            process_steps: steps,
            mermaid_code: mermaidLines.join("\n")
        };
    }

    function fallbackMermaid(data) {
        return data.mermaid_code || "graph TD\n  A[\"Input Processing\"] --> B[\"Process Flow Synthesis\"]\n  B --> C[\"Document Export\"]";
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

    async function renderResults(data, mermaidCode) {
        const code = mermaidCode || fallbackMermaid(data);
        rawMermaidText.value = code;
        await renderMermaidDiagram(code);

        // Render Preview HTML
        let html = `
            <div class="border-b border-slate-800 pb-3 mb-3">
                <h3 class="text-base font-bold text-white">${data.title}</h3>
                <p class="text-xs text-blue-400 font-medium">${data.subtitle || ''}</p>
            </div>
            <div class="bg-slate-950 p-3 rounded border border-slate-800 mb-4">
                <h4 class="font-semibold text-slate-300 text-xs mb-1">Executive Summary</h4>
                <p class="text-slate-400 italic">${data.executive_summary || ''}</p>
            </div>
        `;

        (data.sections || []).forEach(sec => {
            html += `
                <div class="mb-4">
                    <h4 class="font-bold text-slate-200 text-xs mb-1">${sec.heading}</h4>
                    ${(sec.paragraphs || []).map(p => `<p class="mb-1 text-slate-300">${p}</p>`).join('')}
                    ${sec.callout_box ? `<div class="bg-amber-950/40 border-l-2 border-amber-500 p-2 my-2 text-amber-200 text-xs">${sec.callout_box}</div>` : ''}
                </div>
            `;
        });

        documentTextPreview.innerHTML = html;
    }

    // Initial default diagram render on load
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

    // Browser-Side Word (.docx) Generator using docx.js
    btnDownloadDocx.addEventListener("click", async () => {
        if (!window.docx) {
            alert("docx library loading...");
            return;
        }

        const data = currentStructuredData || fallbackParseText(fragmentedTextInput.value);
        const { Document, Paragraph, TextRun, HeadingLevel, Packer } = window.docx;

        const docChildren = [
            new Paragraph({
                text: data.title,
                heading: HeadingLevel.HEADING_1,
                spaceAfter: 200
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Subtitle: ", bold: true }),
                    new TextRun(data.subtitle || "Standard Document")
                ],
                spaceAfter: 300
            }),
            new Paragraph({
                text: "Executive Summary",
                heading: HeadingLevel.HEADING_2,
                spaceAfter: 150
            }),
            new Paragraph({
                text: data.executive_summary || "",
                spaceAfter: 300
            })
        ];

        (data.sections || []).forEach(sec => {
            docChildren.push(new Paragraph({
                text: sec.heading,
                heading: HeadingLevel.HEADING_2,
                spaceAfter: 150
            }));

            (sec.paragraphs || []).forEach(pText => {
                docChildren.push(new Paragraph({
                    text: pText,
                    spaceAfter: 100
                }));
            });

            if (sec.callout_box) {
                docChildren.push(new Paragraph({
                    children: [
                        new TextRun({ text: "Note: ", bold: true }),
                        new TextRun(sec.callout_box)
                    ],
                    spaceAfter: 200
                }));
            }
        });

        docChildren.push(new Paragraph({
            text: "Process Flow Summary",
            heading: HeadingLevel.HEADING_2,
            spaceAfter: 150
        }));

        (data.process_steps || []).forEach(step => {
            docChildren.push(new Paragraph({
                children: [
                    new TextRun({ text: `Step ${step.step_number}: `, bold: true }),
                    new TextRun({ text: `${step.actor || ''} - ${step.action_title || ''}: `, bold: true }),
                    new TextRun(step.description || '')
                ],
                spaceAfter: 80
            }));
        });

        const doc = new Document({
            sections: [{
                children: docChildren
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
        a.click();
    });
});
