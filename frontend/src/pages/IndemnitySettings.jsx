import { useState, useEffect } from "react";
import api from "../axios_instance";
import "../styles/IndemnitySettings.css";

function IndemnitySettings() {
  const [templates, setTemplates] = useState([]);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState({
    id: null, // Add this
    title: "",
    body_html: "",
    version: "",
    is_active: true
  });
  const [msg, setMsg] = useState("");

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
      if (editingTemplate.id) {
        // If it has an ID, we are UPDATING (PUT)
        await api.put(`indemnity/templates/${editingTemplate.id}/`, editingTemplate);
        setMsg("Template updated successfully!");
      } else {
        // If no ID, we are CREATING (POST)
        await api.post("indemnity/templates/", editingTemplate);
        setMsg("New version published!");
      }
      
      // Reset form
      setEditingTemplate({ id: null, title: "", body_html: "", version: "", is_active: true });
      fetchTemplates();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      // Check if backend sent a specific error message
      const errorDetail = err.response?.data?.version || "Error saving template.";
      setMsg(errorDetail);
    }
  };

  const handleLoadToEditor = (t) => {
    setEditingTemplate({
      id: t.id, // Keep track of the ID
      title: t.title,
      body_html: t.body_html,
      version: t.version,
      is_active: t.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

        <section className="settings-card">
          <h2 className="card-title">🆕 Create New Version</h2>
          <form onSubmit={handleSave} className="form-grid">
            <div className="input-group full-width">
              <label>Agreement Title</label>
              <input 
                required
                value={editingTemplate.title}
                onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
                placeholder="e.g. Standard Liability Waiver"
              />
            </div>
            <div className="input-group">
              <label>Version Number</label>
              <input 
                required
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
                required
                value={editingTemplate.body_html}
                onChange={(e) => setEditingTemplate({...editingTemplate, body_html: e.target.value})}
                placeholder="Enter your legal text here..."
                className="content-textarea"
              />
            </div>
            <div className="save-button-container full-width" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="submit" className="btn-save">
                {editingTemplate.id ? "Update Template" : "Publish Template"}
              </button>
              
              {editingTemplate.id && (
                <button 
                  type="button" 
                  onClick={() => setEditingTemplate({ id: null, title: "", body_html: "", version: "", is_active: true })}
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
                  <th>Status</th>
                  <th style={{textAlign: 'right'}}>Actions</th>
                </tr>
              </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.title}</strong></td>
                  <td>v{t.version}</td>
                  <td>
                    {t.is_active ? 
                      <span className="status-badge active">Active</span> : 
                      <span className="status-badge archived">Archived</span>
                    }
                  </td>
                  <td style={{textAlign: 'right'}}>
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
          <div className="modal-container">
            <div className="modal-header">
              <h3>{viewingTemplate.title} <small>(v{viewingTemplate.version})</small></h3>
              <button onClick={() => setViewingTemplate(null)} className="close-x">&times;</button>
            </div>
            <div className="modal-body">
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