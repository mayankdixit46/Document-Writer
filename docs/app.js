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

    // Tabs
    tabGenerate.addEventListener("click", () => {
        tabGenerate.className = "px-5 py-3 text-sm font-semibold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition";
        tabPreview.className = "px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition";
        viewGenerate.classList.remove("hidden");
        viewPreview.classList.add("hidden");
    });

    tabPreview.addEventListener("click", () => {
        if (tabPreview.disabled) return;
        tabPreview.className = "px-5 py-3 text-sm font-semibold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition";
        tabGenerate.className = "px-5 py-3 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition";
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
        const lines = text.split("\n").map(l => l.strip ? l.strip() : l.trim()).filter(Boolean);
        const title = lines[0] || "Standard Operating Document";
        
        return {
            title: title,
            subtitle: "Synthesized Document Standard",
            executive_summary: text.slice(0, 250) + "...",
            sections: [
                {
                    heading: "General Operating Instructions",
                    paragraphs: lines.slice(1, 4),
                    bullet_points: ["Compliance check required", "Safety protocol active"],
                    callout_box: "Maintain attached screenshots as per document standard."
                }
            ],
            process_title: "Operating Sequence",
            process_steps: [
                { step_number: 1, actor: "Operator", action_title: "Initial Check", description: "Verify controls and input text" },
                { step_number: 2, actor: "System", action_title: "AI Synthesis", description: "Re-organize sections and generate diagram" },
                { step_number: 3, actor: "User", action_title: "Download Output", description: "Export Word .docx document" }
            ],
            mermaid_code: "graph TD\n  S1[\"Operator: Initial Check\"] --> S2[\"System: AI Synthesis\"]\n  S2 --> S3[\"User: Download Output\"]"
        };
    }

    function fallbackMermaid(data) {
        return "graph TD\n  A[\"Input Processing\"] --> B[\"Process Flow Synthesis\"]\n  B --> C[\"Document Export\"]";
    }

    async function renderResults(data, mermaidCode) {
        // Render Mermaid
        mermaidRenderContainer.removeAttribute("data-processed");
        mermaidRenderContainer.innerHTML = mermaidCode;
        try {
            await mermaid.run({ nodes: [mermaidRenderContainer] });
        } catch (e) {
            console.error(e);
        }

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

    btnReRenderDiagram.addEventListener("click", () => {
        const code = rawMermaidText.value;
        mermaidRenderContainer.removeAttribute("data-processed");
        mermaidRenderContainer.innerHTML = code;
        mermaid.run({ nodes: [mermaidRenderContainer] });
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
