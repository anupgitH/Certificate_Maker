import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  Award, Download, FileImage, FileText, Upload, Palette, QrCode,
  Users, ShieldCheck, Plus, Trash2, Move, CheckCircle2,
  Search, LayoutTemplate, RotateCcw, Sparkles
} from "lucide-react";
import "./App.css";

/* ---------- constants ---------- */

const CERT_W = 1120;
const CERT_H = 792;

const templates = [
  { id: "classic", name: "Classic Gold", accent: "#b78a32", bg: "#fffdf7", font: "Georgia" },
  { id: "modern", name: "Modern Blue", accent: "#2463eb", bg: "#f8fbff", font: "Arial" },
  { id: "emerald", name: "Emerald", accent: "#087f68", bg: "#f7fffb", font: "Georgia" },
  { id: "midnight", name: "Midnight", accent: "#e9bd65", bg: "#172238", font: "Georgia" },
  { id: "premium-internship", name: "Premium Internship", accent: "#c49a43", bg: "#fffdf6", font: "Georgia" },
  { id: "royal", name: "Royal Navy & Gold", accent: "#b8923a", bg: "#fbf8f0", font: "Georgia" }
];

const certificateTypes = {
  achievement: { title: "CERTIFICATE", subtitle: "OF ACHIEVEMENT", description: "has successfully demonstrated outstanding achievement in" },
  internship: { title: "CERTIFICATE", subtitle: "OF INTERNSHIP", description: "has successfully completed the internship in" },
  completion: { title: "CERTIFICATE", subtitle: "OF COMPLETION", description: "has successfully completed the requirements for" },
  participation: { title: "CERTIFICATE", subtitle: "OF PARTICIPATION", description: "has participated in" }
};

const formatDate = d =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const today = () => formatDate(new Date());

const makeId = () =>
  `CERT-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const initialFields = [
  { id: "issuer", label: "Organization", x: 50, y: 30, size: 17, bold: true },
  { id: "recipient", label: "Recipient name", x: 50, y: 52, size: 40, bold: true },
  { id: "description", label: "Description", x: 50, y: 62, size: 15, bold: false },
  { id: "course", label: "Internship role", x: 50, y: 70, size: 23, bold: true },
  { id: "date", label: "Issue date", x: 27, y: 86, size: 14, bold: false }
];

const CORE_IDS = ["issuer", "recipient", "course", "date", "description"];
const PROTECTED_IDS = ["recipient", "course", "issuer"];

const readImage = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const safeName = value => String(value || "certificate").replace(/[^a-z0-9-_]/gi, "-");

const verificationUrl = id =>
  `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(id)}`;

const makeQr = id =>
  QRCode.toDataURL(verificationUrl(id), { width: 220, margin: 1, errorCorrectionLevel: "M" });

/* ---------- storage (demo only) ---------- */

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem("certify-certificates") || "{}");
  } catch {
    return {};
  }
}

function saveRecord(record) {
  try {
    const records = loadRecords();
    records[record.certificateId] = record;
    localStorage.setItem("certify-certificates", JSON.stringify(records));
  } catch (error) {
    console.error("Unable to save certificate record:", error);
  }
}

/* ---------- certificate (shared by preview, PNG, PDF and bulk) ---------- */

function Certificate({
  templateId, certificateType, fields, values, logo, signature, qr,
  certificateId, accent, background, font,
  duration, startDate, endDate, selectedId, onFieldPointerDown
}) {
  const typeInfo = certificateTypes[certificateType] || certificateTypes.internship;
  const dark = templateId === "midnight";
  const textColor = dark ? "#fff8e8" : "#263449";
  const editable = typeof onFieldPointerDown === "function";

  return (
    <div
      className={`certificate theme-${templateId}`}
      style={{
        width: CERT_W,
        height: CERT_H,
        background,
        color: dark ? "#fff" : "#24334a",
        fontFamily: font,
        borderColor: accent
      }}
    >
      <div className="certificate-inner" style={{ borderColor: accent }}>
        {["tl", "tr", "bl", "br"].map(c => (
          <div key={c} className={`corner corner-${c}`} style={{ borderColor: accent }} />
        ))}

        {logo && <img className="certificate-logo" src={logo} alt="Organization logo" />}

        <div className="certificate-emblem" style={{ color: accent, borderColor: accent }}>
          <Award size={28} />
        </div>

        <div className="certificate-title" style={{ color: accent }}>{typeInfo.title}</div>
        <div className="certificate-subtitle">{typeInfo.subtitle}</div>
        <div className="certificate-rule" style={{ background: accent }} />

        {fields.map(field => {
          const value = values[field.id] ?? field.text ?? "";
          return (
            <div
              key={field.id}
              className={`draggable-text ${editable ? "editable" : ""} ${
                editable && selectedId === field.id ? "is-selected" : ""
              }`}
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                fontSize: `${field.size}px`,
                fontWeight: field.bold ? 700 : 400,
                color: textColor,
                fontFamily: font
              }}
              onPointerDown={editable ? event => onFieldPointerDown(event, field) : undefined}
            >
              <span>{value}</span>
              {editable && selectedId === field.id && (
                <i className="selection-handle editor-only"><Move size={11} /></i>
              )}
            </div>
          );
        })}

        {certificateType === "internship" && (duration || (startDate && endDate)) && (
          <div className="internship-meta" style={{ color: accent }}>
            {duration && <span>{duration}</span>}
            {startDate && endDate && <span>{startDate} — {endDate}</span>}
          </div>
        )}

        {signature && <img className="signature-image" src={signature} alt="Authorized signature" />}
        <div className="signature-line" style={{ borderColor: accent }}>AUTHORIZED SIGNATURE</div>

        {qr && (
          <div className="certificate-qr">
            <img src={qr} alt="Certificate verification QR code" />
            <small>SCAN TO VERIFY</small>
          </div>
        )}

        <div className="certificate-id">ID: {certificateId}</div>
        <div className="certificate-watermark" style={{ color: accent }}>✦</div>
      </div>
    </div>
  );
}

/* Render a Certificate off-screen at full size and capture it. */
async function renderToCanvas(props, scale = 2) {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-20000px;top:0;";
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(<Certificate {...props} />));

    if (document.fonts?.ready) await document.fonts.ready;

    await Promise.all(
      [...host.querySelectorAll("img")].map(img =>
        img.complete
          ? null
          : new Promise(resolve => {
              img.onload = img.onerror = resolve;
            })
      )
    );

    return await html2canvas(host.firstChild, {
      scale,
      useCORS: true,
      backgroundColor: props.background
    });
  } finally {
    root.unmount();
    host.remove();
  }
}

function canvasToPdf(canvas) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 297, 210);
  return pdf;
}

/* ---------- app ---------- */

export default function App() {
  const [activeTab, setActiveTab] = useState("design");
  const [templateId, setTemplateId] = useState("premium-internship");
  const [certificateType, setCertificateType] = useState("internship");

  const [recipient, setRecipient] = useState("Alex Morgan");
  const [course, setCourse] = useState("Software Development");
  const [issuer, setIssuer] = useState("CERTIFY STUDIO ACADEMY");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState(certificateTypes.internship.description);
  const [certificateId, setCertificateId] = useState(makeId());

  const [internshipDuration, setInternshipDuration] = useState("3 Months");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [accent, setAccent] = useState("#c49a43");
  const [background, setBackground] = useState("#fffdf6");
  const [font, setFont] = useState("Georgia");

  const [fields, setFields] = useState(initialFields);
  const [selectedId, setSelectedId] = useState("recipient");

  const [logo, setLogo] = useState("");
  const [signature, setSignature] = useState("");
  const [qrData, setQrData] = useState("");

  const [verifyInput, setVerifyInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);

  const [bulkRows, setBulkRows] = useState([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [dragging, setDragging] = useState(null);
  const [scale, setScale] = useState(1);

  const stageRef = useRef(null);
  const canvasAreaRef = useRef(null);

  const selectedField = fields.find(field => field.id === selectedId);

  /* single source of truth for core field text */
  const values = { issuer, recipient, course, date, description };
  const setters = {
    issuer: setIssuer,
    recipient: setRecipient,
    course: setCourse,
    date: setDate,
    description: setDescription
  };

  const fieldText = field => values[field.id] ?? field.text ?? "";

  function updateFieldText(id, text) {
    if (setters[id]) setters[id](text);
    else updateField(id, { text });
  }

  function certificateProps(overrides = {}) {
    return {
      templateId,
      certificateType,
      fields,
      values,
      logo,
      signature,
      qr: qrData,
      certificateId,
      accent,
      background,
      font,
      duration: internshipDuration,
      startDate,
      endDate,
      ...overrides
    };
  }

  function getCertificateRecord() {
    return {
      certificateId,
      certificateType,
      recipient,
      course,
      issuer,
      date,
      internshipDuration,
      startDate,
      endDate,
      issuedAt: new Date().toISOString()
    };
  }

  /* ----- template / type handlers ----- */

  function selectTemplate(id) {
    const next = templates.find(item => item.id === id);
    if (!next) return;

    setTemplateId(id);
    setAccent(next.accent);
    setBackground(next.bg);
    setFont(next.font);

    if (id === "premium-internship") changeType("internship");
  }

  function changeType(type) {
    setCertificateType(type);
    setDescription(certificateTypes[type].description);
  }

  /* ----- QR (regenerated only when the ID changes) ----- */

  useEffect(() => {
    let cancelled = false;
    makeQr(certificateId)
      .then(url => !cancelled && setQrData(url))
      .catch(error => console.error("QR generation failed:", error));
    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  /* ----- preview scaling ----- */

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;

    const parent = el.parentElement;

    const update = () => {
      // parent padding (16*2) + canvas padding (16*2)
      const available = parent.getBoundingClientRect().width - 64;
      setScale(Math.max(0.3, Math.min(1, available / CERT_W)));
    };

    update();
    window.addEventListener("resize", update);

    const observer = new ResizeObserver(update);
    observer.observe(parent);

    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [activeTab]);

  /* ----- verification ----- */

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("verify");
    if (id) {
      setActiveTab("verify");
      setVerifyInput(id);
      verifyCertificate(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function verifyCertificate(id = verifyInput) {
    const searchId = String(id || "").trim();

    if (!searchId) {
      setVerifyResult({ valid: false, message: "Please enter a certificate ID." });
      return;
    }

    const record = loadRecords()[searchId];

    setVerifyResult(
      record
        ? { valid: true, record }
        : {
            valid: false,
            message:
              "No record found in this browser. Certificates are only recorded when exported, " +
              "and cross-device verification requires a server and database."
          }
    );
  }

  /* ----- fields ----- */

  function updateField(id, changes) {
    setFields(current =>
      current.map(field => (field.id === id ? { ...field, ...changes } : field))
    );
  }

  function addTextField() {
    const id = `text-${Date.now()}`;
    setFields(current => [
      ...current,
      { id, label: "Custom text", text: "Your text", x: 50, y: 78, size: 16, bold: false }
    ]);
    setSelectedId(id);
  }

  function deleteField() {
    if (!selectedField || PROTECTED_IDS.includes(selectedId) || CORE_IDS.includes(selectedId)) return;
    setFields(current => current.filter(field => field.id !== selectedId));
    setSelectedId("recipient");
  }

  async function uploadImage(event, type) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    try {
      const data = await readImage(file);
      if (type === "logo") setLogo(data);
      if (type === "signature") setSignature(data);
    } catch {
      alert("Unable to read image.");
    }

    event.target.value = "";
  }

  /* ----- dragging ----- */

  function handlePointerDown(event, field) {
    if (event.button !== 0) return;
    event.preventDefault();
    setSelectedId(field.id);

    const rect = stageRef.current.getBoundingClientRect();

    setDragging({
      id: field.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: field.x,
      originalY: field.y,
      width: rect.width,
      height: rect.height
    });
  }

  useEffect(() => {
    if (!dragging) return;

    function move(event) {
      const dx = ((event.clientX - dragging.startX) / dragging.width) * 100;
      const dy = ((event.clientY - dragging.startY) / dragging.height) * 100;

      updateField(dragging.id, {
        x: Math.max(2, Math.min(98, dragging.originalX + dx)),
        y: Math.max(3, Math.min(97, dragging.originalY + dy))
      });
    }

    const stop = () => setDragging(null);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);

  /* ----- export ----- */

  async function downloadPNG() {
    try {
      const canvas = await renderToCanvas(certificateProps(), 2);
      saveRecord(getCertificateRecord());

      const link = document.createElement("a");
      link.download = `${safeName(recipient)}-certificate.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      alert(`PNG export failed: ${error.message}`);
    }
  }

  async function downloadPDF() {
    try {
      const canvas = await renderToCanvas(certificateProps(), 2);
      saveRecord(getCertificateRecord());
      canvasToPdf(canvas).save(`${safeName(recipient)}-certificate.pdf`);
    } catch (error) {
      alert(`PDF export failed: ${error.message}`);
    }
  }

  /* ----- bulk ----- */

  function uploadBulkFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = result => {
      try {
        const workbook = XLSX.read(result.target.result, { type: "array", cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const clean = value => (value instanceof Date ? formatDate(value) : String(value).trim());

        const normalized = rows.map((row, index) => {
          const data = Object.fromEntries(
            Object.entries(row).map(([key, value]) => [String(key).trim().toLowerCase(), clean(value)])
          );

          return {
            recipient: data.name || data.recipient || data["recipient name"] || `Recipient ${index + 1}`,
            course: data.course || data.role || course,
            issuer: data.organization || data.issuer || issuer,
            date: data.date || date,
            id: data.id || data["certificate id"] || makeId()
          };
        });

        setBulkRows(normalized);
        setBulkMessage(`Loaded ${normalized.length} recipients.`);
      } catch (error) {
        setBulkMessage(`Unable to read file: ${error.message}`);
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = "";
  }

  async function generateBulkCertificates() {
    if (!bulkRows.length) {
      setBulkMessage("Upload a CSV or Excel file first.");
      return;
    }

    setBusy(true);
    const zip = new JSZip();

    try {
      for (let index = 0; index < bulkRows.length; index++) {
        const row = bulkRows[index];
        setBulkMessage(`Generating certificate ${index + 1} of ${bulkRows.length}...`);

        const qr = await makeQr(row.id);

        const canvas = await renderToCanvas(
          certificateProps({
            values: {
              issuer: row.issuer,
              recipient: row.recipient,
              course: row.course,
              date: row.date,
              description
            },
            certificateId: row.id,
            qr
          }),
          1.5
        );

        zip.file(`${safeName(row.recipient)}-${row.id}.pdf`, canvasToPdf(canvas).output("blob"));

        saveRecord({
          certificateId: row.id,
          certificateType,
          recipient: row.recipient,
          course: row.course,
          issuer: row.issuer,
          date: row.date,
          issuedAt: new Date().toISOString()
        });
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "certificates.zip";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setBulkMessage(`Successfully generated ${bulkRows.length} PDFs.`);
    } catch (error) {
      setBulkMessage(`Generation failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function resetCertificate() {
    selectTemplate("premium-internship");
    changeType("internship");
    setRecipient("Alex Morgan");
    setCourse("Software Development");
    setIssuer("CERTIFY STUDIO ACADEMY");
    setDate(today());
    setCertificateId(makeId());
    setInternshipDuration("3 Months");
    setStartDate("");
    setEndDate("");
    setFields(initialFields);
    setLogo("");
    setSignature("");
    setSelectedId("recipient");
  }

  const tabs = [
    { id: "design", label: "Certificate editor", icon: LayoutTemplate },
    { id: "bulk", label: "Bulk generation", icon: Users },
    { id: "verify", label: "Verify certificate", icon: ShieldCheck }
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          href="#"
          className="brand"
          onClick={event => {
            event.preventDefault();
            setActiveTab("design");
          }}
        >
          <span className="brand-mark"><Award size={22} /></span>
          <span>
            certify<span className="brand-light">studio</span>
            <small>CERTIFICATE MAKER</small>
          </span>
        </a>

        <div className="top-actions">
          <button className="button button-quiet" onClick={resetCertificate}>
            <RotateCcw size={15} /> Reset
          </button>
          <button className="button button-secondary" onClick={downloadPNG}>
            <FileImage size={16} /> PNG
          </button>
          <button className="button button-primary" onClick={downloadPDF}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </header>

      <div className="page-intro">
        <div className="eyebrow"><Sparkles size={14} /> DESIGN • GENERATE • VERIFY</div>
        <h1>Make every achievement <span>official.</span></h1>
        <p>Create professional certificates with your own branding.</p>
      </div>

      <nav className="tabbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={17} /> {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "design" && (
        <main className="workspace">
          <aside className="sidebar">
            <section className="panel-section">
              <div className="section-heading">
                <span className="section-icon"><LayoutTemplate size={16} /></span>
                <div><h2>Choose a template</h2><p>Try the new premium internship design</p></div>
              </div>

              <div className="template-list">
                {templates.map(item => (
                  <button
                    key={item.id}
                    className={`template-option ${templateId === item.id ? "chosen" : ""}`}
                    onClick={() => selectTemplate(item.id)}
                  >
                    <span
                      className="template-swatch"
                      style={{ background: item.bg, borderColor: item.accent }}
                    >
                      <i style={{ background: item.accent }} />
                    </span>
                    <span>{item.name}</span>
                    {templateId === item.id && <CheckCircle2 size={15} />}
                  </button>
                ))}
              </div>
            </section>

            <section className="panel-section">
              <div className="section-heading">
                <span className="section-icon"><FileText size={16} /></span>
                <div><h2>Certificate details</h2><p>Edit the certificate content</p></div>
              </div>

              <label className="field-label">Certificate type</label>
              <select className="text-input" value={certificateType} onChange={e => changeType(e.target.value)}>
                <option value="internship">Certificate of Internship</option>
                <option value="achievement">Certificate of Achievement</option>
                <option value="completion">Certificate of Completion</option>
                <option value="participation">Certificate of Participation</option>
              </select>

              <label className="field-label">Intern / recipient name</label>
              <input className="text-input" value={recipient} onChange={e => setRecipient(e.target.value)} />

              <label className="field-label">Internship role / course</label>
              <input className="text-input" value={course} onChange={e => setCourse(e.target.value)} />

              <label className="field-label">Issuing organization</label>
              <input className="text-input" value={issuer} onChange={e => setIssuer(e.target.value)} />

              <label className="field-label">Internship duration</label>
              <input
                className="text-input"
                value={internshipDuration}
                onChange={e => setInternshipDuration(e.target.value)}
                placeholder="e.g. 3 Months"
              />

              <div className="two-fields">
                <div>
                  <label className="field-label">Start date</label>
                  <input className="text-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">End date</label>
                  <input className="text-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <label className="field-label">Issue date</label>
              <input className="text-input" value={date} onChange={e => setDate(e.target.value)} />

              <label className="field-label">Certificate ID</label>
              <div className="input-with-button">
                <input className="text-input" value={certificateId} onChange={e => setCertificateId(e.target.value)} />
                <button title="Generate a new ID" onClick={() => setCertificateId(makeId())}>
                  <RotateCcw size={15} />
                </button>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-heading">
                <span className="section-icon"><Palette size={16} /></span>
                <div><h2>Branding</h2><p>Customize colors and images</p></div>
              </div>

              <label className="field-label">Accent color</label>
              <input type="color" value={accent} onChange={e => setAccent(e.target.value)} />

              <label className="field-label">Background color</label>
              <input type="color" value={background} onChange={e => setBackground(e.target.value)} />

              <label className="field-label">Font family</label>
              <select className="text-input" value={font} onChange={e => setFont(e.target.value)}>
                <option>Georgia</option>
                <option>Arial</option>
                <option>Verdana</option>
                <option>Times New Roman</option>
                <option>Trebuchet MS</option>
              </select>

              <div className="upload-grid">
                <label className="upload-tile">
                  <Upload size={18} />
                  <span>{logo ? "Change logo" : "Upload logo"}</span>
                  <small>PNG or JPG</small>
                  <input hidden type="file" accept="image/*" onChange={e => uploadImage(e, "logo")} />
                </label>

                <label className="upload-tile">
                  <FileImage size={18} />
                  <span>{signature ? "Change signature" : "Upload signature"}</span>
                  <small>PNG recommended</small>
                  <input hidden type="file" accept="image/*" onChange={e => uploadImage(e, "signature")} />
                </label>
              </div>
            </section>

            <section className="panel-section">
              <div className="section-heading">
                <span className="section-icon"><Move size={16} /></span>
                <div><h2>Text elements</h2><p>Select and reposition text</p></div>
              </div>

              <div className="field-list">
                {fields.map(field => (
                  <button
                    key={field.id}
                    className={`field-item ${selectedId === field.id ? "selected" : ""}`}
                    onClick={() => setSelectedId(field.id)}
                  >
                    <span className="field-dot" />
                    <span>{field.label}</span>
                  </button>
                ))}
              </div>

              <button className="button button-outline full-width" onClick={addTextField}>
                <Plus size={16} /> Add text element
              </button>
            </section>
          </aside>

          <section className="editor-main">
            <div className="editor-toolbar">
              <div>
                <strong>Live preview</strong>
                <span className="preview-tag"><span /> LIVE</span>
              </div>
              <div className="toolbar-right">
                <span><Move size={14} /> Drag text to reposition</span>
                <button
                  className="icon-button"
                  onClick={deleteField}
                  disabled={!selectedField || CORE_IDS.includes(selectedId)}
                  title="Delete selected text (custom text only)"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="canvas-area" ref={canvasAreaRef}>
              <div
                className="stage-sizer"
                style={{ width: CERT_W * scale, height: CERT_H * scale }}
              >
                <div
                  ref={stageRef}
                  className="stage"
                  style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                >
                  <Certificate
                    {...certificateProps()}
                    selectedId={selectedId}
                    onFieldPointerDown={handlePointerDown}
                  />
                </div>
              </div>
            </div>

            <div className="properties-panel">
              <div className="properties-heading">
                <Palette size={17} />
                <strong>Selected text properties</strong>
                {selectedField && <span>{selectedField.label}</span>}
              </div>

              {selectedField ? (
                <div className="properties-grid">
                  <div className="property-control property-wide">
                    <label>Text content</label>
                    <input
                      className="text-input"
                      value={fieldText(selectedField)}
                      onChange={e => updateFieldText(selectedId, e.target.value)}
                    />
                  </div>

                  <div className="property-control">
                    <label>Font size: {selectedField.size}px</label>
                    <input
                      type="range" min="10" max="58"
                      value={selectedField.size}
                      onChange={e => updateField(selectedId, { size: Number(e.target.value) })}
                    />
                  </div>

                  <div className="property-control">
                    <label>Horizontal: {Math.round(selectedField.x)}%</label>
                    <input
                      type="range" min="2" max="98"
                      value={selectedField.x}
                      onChange={e => updateField(selectedId, { x: Number(e.target.value) })}
                    />
                  </div>

                  <div className="property-control">
                    <label>Vertical: {Math.round(selectedField.y)}%</label>
                    <input
                      type="range" min="3" max="97"
                      value={selectedField.y}
                      onChange={e => updateField(selectedId, { y: Number(e.target.value) })}
                    />
                  </div>

                  <label className="bold-toggle">
                    <input
                      type="checkbox"
                      checked={!!selectedField.bold}
                      onChange={e => updateField(selectedId, { bold: e.target.checked })}
                    />
                    Bold text
                  </label>
                </div>
              ) : (
                <p>Select a text element to edit its properties.</p>
              )}
            </div>
          </section>
        </main>
      )}

      {activeTab === "bulk" && (
        <main className="tool-page">
          <div className="tool-page-header">
            <div className="large-tool-icon"><Users size={25} /></div>
            <div>
              <div className="eyebrow">BULK GENERATION</div>
              <h2>Generate multiple certificates</h2>
              <p>Upload an Excel or CSV file to create a PDF for each recipient, using the design from the editor.</p>
            </div>
          </div>

          <section className="bulk-card">
            <h3><Upload size={18} /> Upload recipient list</h3>
            <p>Expected columns: name, course, organization, date, certificate id.</p>

            <input type="file" accept=".csv,.xls,.xlsx" onChange={uploadBulkFile} />

            <p>{bulkRows.length} recipients loaded.</p>

            {bulkRows.length > 0 && (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Role / Course</th><th>Date</th><th>ID</th></tr>
                  </thead>
                  <tbody>
                    {bulkRows.slice(0, 50).map((row, index) => (
                      <tr key={`${row.id}-${index}`}>
                        <td>{row.recipient}</td>
                        <td>{row.course}</td>
                        <td>{row.date}</td>
                        <td>{row.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p>{bulkMessage}</p>

            <button
              className="button button-primary"
              disabled={!bulkRows.length || busy}
              onClick={generateBulkCertificates}
            >
              <Download size={16} /> {busy ? "Generating..." : "Generate PDF ZIP"}
            </button>
          </section>
        </main>
      )}

      {activeTab === "verify" && (
        <main className="tool-page verify-page">
          <div className="verify-hero">
            <div className="large-tool-icon"><ShieldCheck size={28} /></div>
            <div className="eyebrow">CERTIFICATE AUTHENTICITY</div>
            <h2>Verify a certificate</h2>
            <p>Enter the certificate ID to check for a saved record.</p>
          </div>

          <section className="verify-card">
            <form
              onSubmit={event => {
                event.preventDefault();
                verifyCertificate();
              }}
            >
              <label className="field-label">Certificate ID</label>
              <div className="verify-input-row">
                <input
                  className="text-input"
                  value={verifyInput}
                  onChange={e => setVerifyInput(e.target.value)}
                  placeholder="CERT-2026-ABC123"
                />
                <button className="button button-primary" type="submit">
                  <Search size={16} /> Verify
                </button>
              </div>
            </form>

            {verifyResult && (
              <div className={`verification-result ${verifyResult.valid ? "valid" : "invalid"}`}>
                {verifyResult.valid ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}

                <div>
                  <h3>{verifyResult.valid ? "Record found" : "Verification failed"}</h3>
                  {!verifyResult.valid ? (
                    <p>{verifyResult.message}</p>
                  ) : (
                    <dl>
                      <dt>Certificate type</dt>
                      <dd>{certificateTypes[verifyResult.record.certificateType]?.subtitle || "CERTIFICATE"}</dd>
                      <dt>Recipient</dt>
                      <dd>{verifyResult.record.recipient}</dd>
                      <dt>Internship role / course</dt>
                      <dd>{verifyResult.record.course}</dd>
                      <dt>Organization</dt>
                      <dd>{verifyResult.record.issuer}</dd>
                      <dt>Issue date</dt>
                      <dd>{verifyResult.record.date}</dd>
                      <dt>Certificate ID</dt>
                      <dd>{verifyResult.record.certificateId}</dd>
                    </dl>
                  )}
                </div>
              </div>
            )}

            <div className="verification-note">
              <QrCode size={18} />
              <div>
                <strong>Verification limitation</strong>
                <p>
                  The QR code contains a URL, but this demo stores records in browser localStorage,
                  which is not shared between devices. To verify certificates from any phone, deploy
                  the app publicly and connect a backend/database.
                </p>
              </div>
            </div>
          </section>
        </main>
      )}

      <footer className="footer">
        <div className="footer-brand"><Award size={17} /> certify<span>studio</span></div>
        <span>Professional certificates made simple.</span>
        <span className="footer-right"><ShieldCheck size={14} /> Local demo</span>
      </footer>
    </div>
  );
}
