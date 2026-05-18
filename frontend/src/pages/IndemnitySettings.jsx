import { useState, useEffect } from "react";
import api from "../axios_instance";
import { useCompany } from "../context/CompanyContext";
import "../styles/IndemnitySettings.css";
import PlanUsageBanner from "../components/PlanUsageBanner";

function IndemnitySettings() {
  const { currentPlan, planLimits, nextPlan } = useCompany();
  const [templates, setTemplates] = useState([]);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState({
    id: null, // Add this
    title: "",
    body_html: "",
    version: "",
    is_active: true,
    template_pdf: null,
  });
  const [selectedTemplatePdf, setSelectedTemplatePdf] = useState(null);
  const [msg, setMsg] = useState("");
  const canUploadTemplatePdf = currentPlan === "PRO" || currentPlan === "ENTERPRISE";

  const getNextVersion = () => {
    const versions = templates
      .map((template) => Number.parseInt(template.version, 10))
      .filter((version) => Number.isFinite(version));

    return versions.length > 0 ? Math.max(...versions) + 1 : 1;
  };

  const handleTemplatePdfChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedTemplatePdf(file);

    if (!file) {
      return;
    }

    const fileTitle = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    setEditingTemplate((current) => ({
      ...current,
      title: current.title || fileTitle || "Indemnity Template",
      version: current.version || String(getNextVersion()),
    }));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("indemnity/templates/");
      setTemplates(res.data);
    } catch (err) {
      console.error("Error fetching templates", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedTemplatePdf && !canUploadTemplatePdf) {
        setMsg("PDF template uploads are available on Pro and Enterprise plans only.");
        return;
      }

      const payload = new FormData();
      payload.append("title", editingTemplate.title);
      payload.append("body_html", editingTemplate.body_html);
      payload.append("version", editingTemplate.version);
      payload.append("is_active", editingTemplate.is_active ? "true" : "false");

      if (selectedTemplatePdf) {
        payload.append("template_pdf", selectedTemplatePdf);
      }

      if (editingTemplate.id) {
        // If it has an ID, we are UPDATING (PUT)
        await api.put(`indemnity/templates/${editingTemplate.id}/`, payload);
        setMsg("Template updated successfully!");
      } else {
        // If no ID, we are CREATING (POST)
        await api.post("indemnity/templates/", payload);
        setMsg("New version published!");
      }
      
      // Reset form
      setEditingTemplate({ id: null, title: "", body_html: "", version: "", is_active: true, template_pdf: null });
      setSelectedTemplatePdf(null);
      fetchTemplates();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      // Check if backend sent a specific error message
      const errorDetail =
        err.response?.data?.template_pdf ||
        err.response?.data?.version ||
        err.response?.data?.detail ||
        "Error saving template.";
      setMsg(errorDetail);
    }
  };

  const handleLoadToEditor = (t) => {
    setEditingTemplate({
      id: t.id, // Keep track of the ID
      title: t.title,
      body_html: t.body_html,
      version: t.version,
      is_active: t.is_active,
      template_pdf: t.template_pdf || null,
    });
    setSelectedTemplatePdf(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetEditor = () => {
    setEditingTemplate({ id: null, title: "", body_html: "", version: "", is_active: true, template_pdf: null });
    setSelectedTemplatePdf(null);
  };

  return (
    <div className="settings-wrapper">
      <div className="settings-container">
        <header className="settings-header">
          <div>
            <h1>Indemnity Templates</h1>
            <p>Manage legal agreements and liability waivers.</p>
          </div>
        </header>



        {msg && <div className="alert-success">{msg}</div>}
        {/* Plan usage metrics */}
        {(() => {
          const historyLimit = planLimits?.indemnity_history_limit;
          const effectiveLimit = historyLimit === 0 ? 1 : (historyLimit ?? null);
          return (
            <PlanUsageBanner
              light
              currentPlan={currentPlan}
              nextPlan={nextPlan}
              metrics={[
                { label: "Template versions", used: templates.length, total: effectiveLimit },
                { label: "PDF upload", type: "feature", available: canUploadTemplatePdf },
              ]}
            />
          );
        })()}

        <section className="settings-card">
          <h2 className="card-title">🆕 Create New Version</h2>
          <form onSubmit={handleSave} className="form-grid">
            <div className="input-group full-width">
              <label>Agreement Title</label>
              <input 
                required={!selectedTemplatePdf}
                value={editingTemplate.title}
                onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
                placeholder="e.g. Standard Liability Waiver"
              />
            </div>
            <div className="input-group">
              <label>Version Number</label>
              <input 
                required={!selectedTemplatePdf}
                value={editingTemplate.version}
                onChange={e => setEditingTemplate({...editingTemplate, version: e.target.value})}
                placeholder="1.0"
              />
            </div>
            <div className="input-group checkbox-group">
              <label>Status</label>
              <div className="checkbox-wrapper">
                <input 
                  type="checkbox" 
                  checked={editingTemplate.is_active}
                  onChange={e => setEditingTemplate({...editingTemplate, is_active: e.target.checked})}
                />
                <span>Set as Active (Default)</span>
              </div>
            </div>
            <div className="input-group full-width">
              <label>Agreement Content (Plain Text or HTML)</label>
              <textarea 
                required={!selectedTemplatePdf}
                value={editingTemplate.body_html}
                onChange={(e) => setEditingTemplate({...editingTemplate, body_html: e.target.value})}
                placeholder={selectedTemplatePdf ? "Optional when a PDF is uploaded" : "Enter your legal text here..."}
                className="content-textarea"
              />
              <p className="helper-text">
                {selectedTemplatePdf
                  ? "A searchable PDF will be converted into template text automatically when you save."
                  : "You can either type the indemnity text here or upload a PDF and let us extract it for you."}
              </p>
            </div>
            <div className="input-group full-width">
              <label>Optional PDF Upload</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleTemplatePdfChange}
                disabled={!canUploadTemplatePdf}
              />
              <p className="helper-text">
                {canUploadTemplatePdf
                  ? "Pro and Enterprise plans can attach a PDF version of the indemnity for download and reference."
                  : "PDF uploads are available on Pro and Enterprise plans only."}
              </p>
              {editingTemplate.template_pdf && !selectedTemplatePdf && (
                <p className="helper-text existing-file">
                  Current PDF attached:{" "}
                  <a href={editingTemplate.template_pdf} target="_blank" rel="noreferrer">
                    Open current PDF
                  </a>
                </p>
              )}
            </div>
            <div className="save-button-container full-width" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn-save">
                {editingTemplate.id ? "Update Template" : "Publish Template"}
              </button>
              
              {editingTemplate.id && (
                <button 
                  type="button" 
                  onClick={resetEditor}
                  className="btn-text"
                  style={{ color: '#ef4444' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="settings-card">
          <h2 className="card-title">📜 Template History</h2>
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Version</th>
                  <th>PDF</th>
                  <th>Status</th>
                  <th style={{textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td data-label="Title"><strong>{t.title}</strong></td>
                  <td data-label="Version">v{t.version}</td>
                  <td data-label="PDF">
                    {t.template_pdf ? (
                      <a href={t.template_pdf} target="_blank" rel="noreferrer" className="pdf-link">
                        Open PDF
                      </a>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td data-label="Status">
                    {t.is_active ? 
                      <span className="status-badge active">Active</span> : 
                      <span className="status-badge archived">Archived</span>
                    }
                  </td>
                  <td data-label="Actions" style={{textAlign: 'right'}}>
                    <button onClick={() => setViewingTemplate(t)} className="btn-text">View</button>
                    <button onClick={() => handleLoadToEditor(t)} className="btn-text secondary">Edit</button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {viewingTemplate && (
        <div className="modal-overlay">
          <div className="card modal-container">
            <div className="modal-header">
              <h3>{viewingTemplate.title} <small>(v{viewingTemplate.version})</small></h3>
              <button onClick={() => setViewingTemplate(null)} className="close-x">&times;</button>
            </div>
            <div className="modal-body">
              <div className="template-view-meta">
                {viewingTemplate.template_pdf && (
                  <a href={viewingTemplate.template_pdf} target="_blank" rel="noreferrer" className="pdf-link">
                    Open attached PDF
                  </a>
                )}
              </div>
              <div 
                className="prose-content"
                style={{whiteSpace: 'pre-wrap'}}
                dangerouslySetInnerHTML={{ __html: viewingTemplate.body_html }} 
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setViewingTemplate(null)} className="btn-save btn-small">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IndemnitySettings;