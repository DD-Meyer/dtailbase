import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../axios_instance";
import "../styles/Customers.css";
import "../styles/EditableRow.css";
import { useCompany } from "../context/CompanyContext";
import EditableRow from "../components/EditableRow";
import UpgradeValueCards from "../components/UpgradeValueCards";
import PlanUsageBanner from "../components/PlanUsageBanner";
import { showConfirm, showToast } from "../utils/uiFeedback";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImportReport, setShowImportReport] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [editId, setEditId] = useState(null); // Track if we are editing
  const [formData, setFormData] = useState({ firstname: "", lastname: "", email: "", phone: "" });
  const { planLimits, currentPlan, nextPlan } = useCompany();
  const navigate = useNavigate();
  const csvInputRef = useRef(null);

  const normalizedPlan = String(currentPlan || "").trim().toUpperCase();
  const canUseCsvUpload =
    normalizedPlan === "PRO" ||
    normalizedPlan.startsWith("PRO_") ||
    normalizedPlan === "ENTERPRISE" ||
    normalizedPlan.startsWith("ENTERPRISE_") ||
    normalizedPlan === "ELITE";

  const fetchCustomers = async () => {
    try {
      const res = await api.get("customers/");
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch customers");
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const isUnlimited = planLimits.max_customers === null || 
                      planLimits.max_customers === undefined || 
                      planLimits.max_customers === Infinity;

  // 2. Determine if the user is blocked from adding more
  const isLimitReached = !isUnlimited && customers.length >= planLimits.max_customers;

  const handleAddNew = () => {
    if (isLimitReached) {
      showToast(`Customer limit reached for your current plan (${currentPlan}). Please upgrade to add more.`, "error");
      return;
    }
    setEditId(null);
    setFormData({ firstname: "", lastname: "", email: "", phone: "" });
    setShowModal(true);
  };

  const handleEdit = (customer) => {
    setEditId(customer.id);
    setFormData({
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email || "",
      phone: customer.phone || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        // UPDATE (PUT or PATCH)
        await api.put(`customers/${editId}/`, formData);
      } else {
        // CREATE (POST)
        await api.post("customers/", formData);
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      showToast("Error saving customer. Please check your data.", "error");
    }
  };

  const deleteCustomer = async (id) => {
    const confirmed = await showConfirm({
      title: "Delete customer",
      message: "Delete this customer and all their records?",
      confirmText: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    try {
      await api.delete(`customers/${id}/`);
      fetchCustomers();
      showToast("Customer deleted", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Unable to delete customer.", "error");
    }
  };

  const handleSaveCustomer = async (updatedCustomer) => {
    try {
      if (updatedCustomer.id) {
        await api.put(`customers/${updatedCustomer.id}/`, updatedCustomer);
      } else {
        await api.post("customers/", updatedCustomer);
      }
      fetchCustomers();
      setEditId(null);
    } catch (err) {
      showToast("Error saving customer. Please check your data.", "error");
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setShowModal(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("customers/template-csv/", { responseType: "blob" });
      const blobUrl = URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", "customers_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Could not download the CSV template right now.", "error");
    }
  };

  const openCsvPicker = () => {
    csvInputRef.current?.click();
  };

  const handleCsvAction = () => {
    if (canUseCsvUpload) {
      openCsvPicker();
      return;
    }

    navigate("/plans", {
      state: {
        fromPlanCta: true,
        selectedPlanId: "PRO",
        redirectTo: "/customers",
      },
    });
  };

  const handleCsvSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const payload = new FormData();
    payload.append("file", file);

    try {
      const res = await api.post("customers/import-csv/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data || {};
      setImportReport({
        created: data.created || 0,
        duplicates: data.duplicates || 0,
        skipped_due_limit: data.skipped_due_limit || 0,
        failed_row_count: data.failed_row_count || 0,
        total_rows: data.total_rows || 0,
        failed_rows: data.failed_rows || [],
      });
      const summary = `Imported ${data.created || 0}. Duplicates ${data.duplicates || 0}. Limit-skipped ${data.skipped_due_limit || 0}. Invalid rows ${data.failed_row_count || 0}.`;
      showToast(summary, "success");
      setShowImportReport(true);
      fetchCustomers();
    } catch (err) {
      const apiError = err.response?.data;
      const message = apiError?.error || apiError?.detail || "CSV import failed.";
      showToast(message, "error");
    } finally {
      e.target.value = "";
    }
  };

  const downloadImportErrorsCsv = () => {
    if (!importReport?.failed_rows?.length) {
      showToast("No failed rows to export.", "info");
      return;
    }

    const escapeCsv = (value) => {
      const stringValue = String(value ?? "");
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const header = ["line", "reason", "firstname", "lastname", "email", "phone"];
    const rows = importReport.failed_rows.map((row) => [
      row.line,
      row.reason,
      row.firstname || "",
      row.lastname || "",
      row.email || "",
      row.phone || "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "customer_import_errors.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filtered = customers.filter(c => 
    `${c.firstname} ${c.lastname}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="card-banner mb-6">
        <div className="page-banner">
          <div className="page-banner-copy">
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-50">Manage your customer records.</p>
          </div>

          <div className="page-banner-actions">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleCsvSelected}
            />
            <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
              Download CSV Template
            </button>
            <button
              className={`btn ${canUseCsvUpload ? "btn-secondary" : "btn-primary"}`}
              onClick={handleCsvAction}
              title={canUseCsvUpload ? "Upload customers via CSV" : "Upgrade to Pro or Enterprise to unlock CSV import"}
            >
              {canUseCsvUpload ? "Import CSV" : "Upgrade for CSV Import"}
            </button>
            <button 
              className={`btn ${isLimitReached ? 'btn-disabled opacity-50' : 'btn-primary'}`} 
              onClick={handleAddNew}
              disabled={isLimitReached} // Actually disable the button
              title={isLimitReached ? "Limit reached" : "Add new customer"}
            >
              {isLimitReached ? "Limit Reached" : "+ Add Customer"}
            </button>
          </div>
        </div>
      </div>

      <UpgradeValueCards currentPlan={currentPlan} />

      <div className="customers-usage-search-stack">
      <PlanUsageBanner
        metrics={[
          {
            label: "Customers",
            used: customers.length,
            total: isUnlimited ? null : planLimits.max_customers,
          },
        ]}
        currentPlan={currentPlan}
        nextPlan={nextPlan}
      />
        <div className="customers-search-wrapper mb-4">
          <input 
            type="text"
            className="search-input customers-search-input"
            placeholder="Search customers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)} 
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="card customers-table-container">
        <table className="table-standard customers-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer) => (
              <tr key={customer.id}>
                <td data-label="First Name">{customer.firstname}</td>
                <td data-label="Last Name">{customer.lastname}</td>
                <td data-label="Email">{customer.email}</td>
                <td data-label="Phone">{customer.phone}</td>
                <td data-label="Actions">
                  <div>
                    <button className="btn btn-xs team-action-btn team-action-edit" onClick={() => handleEdit(customer)}>
                      Edit
                    </button>
                    <button className="btn btn-xs team-action-btn team-action-delete" onClick={() => deleteCustomer(customer.id)}>
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
            <h2>{editId ? "Edit Customer" : "New Customer"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>First Name</label>
                <input 
                  value={formData.firstname}
                  required 
                  onChange={e => setFormData({...formData, firstname: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input 
                  value={formData.lastname}
                  required 
                  onChange={e => setFormData({...formData, lastname: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn btn-primary">
                  {editId ? "Update Customer" : "Save Customer"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportReport && importReport && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>CSV Import Report</h2>

            <div className="import-report-summary">
              <p><strong>Total Rows:</strong> {importReport.total_rows}</p>
              <p><strong>Created:</strong> {importReport.created}</p>
              <p><strong>Duplicates:</strong> {importReport.duplicates}</p>
              <p><strong>Skipped (Plan Limit):</strong> {importReport.skipped_due_limit}</p>
              <p><strong>Invalid Rows:</strong> {importReport.failed_row_count}</p>
            </div>

            {importReport.failed_rows.length > 0 ? (
              <div className="import-report-failures">
                <h3>Invalid Row Details</h3>
                <ul>
                  {importReport.failed_rows.map((row) => (
                    <li key={`${row.line}-${row.reason}`}>
                      <strong>Line {row.line}:</strong> {row.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No invalid rows were found.</p>
            )}

            <div className="flex gap-2 mt-4">
              {importReport.failed_rows.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={downloadImportErrorsCsv}
                >
                  Download Error CSV
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowImportReport(false)}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;