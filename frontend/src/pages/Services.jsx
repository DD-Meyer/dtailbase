import { useEffect, useState } from "react";
import api from "../axios_instance";
import { Plus, X } from "lucide-react";
import "../styles/Services.css";
import "../styles/EditableRow.css";
import EditableRow from "../components/EditableRow";
import { showConfirm, showToast } from "../utils/uiFeedback";
import { useCompany } from "../context/CompanyContext";

function Services() {
  const TABLET_BREAKPOINT = 1024;
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCompactView, setIsCompactView] = useState(() => window.innerWidth <= TABLET_BREAKPOINT);
  const [showServiceForm, setShowServiceForm] = useState(() => window.innerWidth > TABLET_BREAKPOINT);
  const [showModal, setShowModal] = useState(false);
  const [indemnityTemplates, setIndemnityTemplates] = useState([]);
  const { currentPlan } = useCompany();
  const isEnterprisePlan = currentPlan === "ENTERPRISE";
  const linkedTemplateCount = services.filter((service) => Boolean(service.service_indemnity_template)).length;
  const linkedTemplateLimit = 20;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: 60,
    base_price: "0.00",
    service_indemnity_template: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (!isEnterprisePlan) {
      setIndemnityTemplates([]);
      return;
    }

    const fetchIndemnityTemplates = async () => {
      try {
        const res = await api.get("indemnity/templates/");
        setIndemnityTemplates(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error loading indemnity templates:", err);
      }
    };

    fetchIndemnityTemplates();
  }, [isEnterprisePlan]);

  useEffect(() => {
    const handleResize = () => {
      const compact = window.innerWidth <= TABLET_BREAKPOINT;
      setIsCompactView(compact);
      if (!compact) {
        setShowServiceForm(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.get("services/?include_inactive=1");
      setServices(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
      };

      if (isEnterprisePlan) {
        payload.service_indemnity_template = formData.service_indemnity_template || null;
      } else {
        delete payload.service_indemnity_template;
      }

      if (editingId) {
        await api.patch(`services/${editingId}/`, payload);
      } else {
        await api.post("services/", payload);
      }
      resetForm();
      if (isCompactView) {
        setShowServiceForm(false);
      }
      fetchServices();
    } catch (err) {
      showToast("Error saving service: " + (err.response?.data?.error || "Check console"), "error");
    }
  };

  const handleSaveService = async (updatedService) => {
    try {
      if (updatedService.id) {
        await api.patch(`services/${updatedService.id}/`, updatedService);
      } else {
        await api.post("services/", updatedService);
      }
      fetchServices();
      setEditingId(null);
    } catch (err) {
      showToast("Error saving service. Please check your data.", "error");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowModal(false);
  };

  const startEdit = (service) => {
    setEditingId(service.id);
    setShowServiceForm(true);
    setFormData({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      base_price: service.base_price,
      service_indemnity_template: service.service_indemnity_template || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: "Delete service",
      message: "Are you sure? Services with booking history will be deactivated instead of deleted.",
      confirmText: "Delete",
      danger: true,
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`services/${id}/`);
      showToast(res.data?.message || "Service deleted successfully.", res.data?.deactivated ? "info" : "success");
      fetchServices();
    } catch (err) {
      showToast(err.response?.data?.error || "Delete error", "error");
    }
  };

  const handleToggleActive = async (service) => {
    const nextActiveState = !service.is_active;
    const action = nextActiveState ? "reactivate" : "deactivate";

    const confirmed = await showConfirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} service`,
      message: `Are you sure you want to ${action} this service?`,
      confirmText: nextActiveState ? "Reactivate" : "Deactivate",
      danger: !nextActiveState,
    });

    if (!confirmed) return;

    try {
      await api.patch(`services/${service.id}/`, { is_active: nextActiveState });
      showToast(`Service ${nextActiveState ? "reactivated" : "deactivated"} successfully.`, "success");
      fetchServices();
    } catch (err) {
      showToast(err.response?.data?.error || `Unable to ${action} service.`, "error");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      duration_minutes: 60,
      base_price: "0.00",
      service_indemnity_template: "",
    });
    setEditingId(null);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const shouldShowServiceForm = !isCompactView || showServiceForm || editingId !== null;

  const handleEdit = (service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      base_price: service.base_price,
      service_indemnity_template: service.service_indemnity_template || "",
    });
    setShowModal(true);
  };

  if (loading) return <div className="page-container">Loading Services...</div>;

  return (
    <div className="page-container">
      <div className="card-banner mb-6">
        <div className="page-banner">
          <div className="page-banner-copy">
            <h1 className="text-2xl font-bold">Service Management</h1>
            <p>{services.length} service packages ready for booking and pricing updates.</p>
            <p className="services-feature-highlight">
              {isEnterprisePlan
                ? `Enterprise smart-linking active: ${linkedTemplateCount}/${linkedTemplateLimit} service templates linked automatically.`
                : "Enterprise unlock: 20 Smart-Linked Service Templates with automatic legal routing per booking."}
            </p>
          </div>

          <div className="page-banner-actions services-header-actions">
          {isCompactView && (
            <button
              type="button"
              className="btn btn-primary services-toggle-btn"
              onClick={() => {
                if (editingId !== null) {
                  resetForm();
                  return;
                }
                setShowServiceForm(prev => !prev);
              }}
              aria-expanded={shouldShowServiceForm}
            >
              {editingId !== null || shouldShowServiceForm ? (
                <X size={14} aria-hidden="true" />
              ) : (
                <Plus size={14} aria-hidden="true" />
              )}
              {editingId !== null
                ? "Cancel Edit"
                : shouldShowServiceForm
                  ? "Hide Service Form"
                  : "Add Service"}
            </button>
          )}

          {shouldShowServiceForm && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                resetForm();
                if (isCompactView) {
                  setShowServiceForm(false);
                }
                window.scrollTo({ top: 0 });
              }}
            >
              {editingId ? "Cancel Edit" : "Reset Form"}
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Form Card */}
      {shouldShowServiceForm && (
      <div className="card mb-8">
        <h2 className="mb-4">{editingId ? "Update Existing Service" : "Create New Package"}</h2>
        <form onSubmit={handleSubmit} className="grid-form">
          <div className="form-group">
            <label>Service Name</label>
            <input
              name="name"
              placeholder="e.g. Full Interior Detail"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Base Price ($)</label>
            <input
              name="base_price"
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Duration (Minutes)</label>
            <input
              name="duration_minutes"
              type="number"
              value={formData.duration_minutes}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              name="description"
              placeholder="What is included in this service?"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Linked Indemnity Template</label>
            {isEnterprisePlan ? (
              <select
                name="service_indemnity_template"
                value={formData.service_indemnity_template || ""}
                onChange={handleInputChange}
              >
                <option value="">Use Active Default Template</option>
                {indemnityTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} (v{template.version})
                  </option>
                ))}
              </select>
            ) : (
              <input
                value="Enterprise-only feature"
                readOnly
                disabled
              />
            )}
          </div>
          <div className="mt-4">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Update Service" : "Add Service"}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Search Bar */}
      <div className="search-wrapper mb-4">
        <input 
          type="text" 
          placeholder="Search services by name or description..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>

      {/* Services Table */}
      <div className="card services-table-container">
        <table className="table-standard services-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Duration (minutes)</th>
              <th>Base Price</th>
              <th>Indemnity Template</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((service) => (
              <tr key={service.id}>
                <td data-label="Name">{service.name}</td>
                <td data-label="Description">{service.description}</td>
                <td data-label="Duration (Minutes)">{service.duration_minutes}</td>
                <td data-label="Base Price">{service.base_price}</td>
                <td data-label="Indemnity Template">
                  {service.service_indemnity_template_title || "Active Default Template"}
                </td>
                <td data-label="Status">
                  <span className={`badge ${service.is_active ? 'badge-success' : 'badge-ghost'}`}>
                    {service.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td data-label="Actions">
                  <div className="service-action-group">
                    <button className="btn btn-xs team-action-btn team-action-edit" onClick={() => handleEdit(service)}>
                      Edit
                    </button>
                    <button
                      className={`btn btn-xs team-action-btn ${service.is_active ? 'team-action-deactivate' : 'team-action-reactivate'}`}
                      onClick={() => handleToggleActive(service)}
                    >
                      {service.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                    <button className="btn btn-xs team-action-btn team-action-delete" onClick={() => handleDelete(service.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Service</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Duration (Minutes)</label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Base Price ($)</label>
                <input
                  type="number"
                  name="base_price"
                  step="0.01"
                  value={formData.base_price}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Linked Indemnity Template</label>
                {isEnterprisePlan ? (
                  <select
                    name="service_indemnity_template"
                    value={formData.service_indemnity_template || ""}
                    onChange={handleInputChange}
                  >
                    <option value="">Use Active Default Template</option>
                    {indemnityTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title} (v{template.version})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value="Enterprise-only feature"
                    readOnly
                    disabled
                  />
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary">
                  Update Service
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;