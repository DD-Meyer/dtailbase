import React, { useState } from "react";
import PropTypes from "prop-types";
import "../styles/EditableRow.css";

function EditableRow({ data, fields, onSave, onCancel }) {
  const [formData, setFormData] = useState(data);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <tr className="editable-row">
      {fields.map((field) => (
        <td key={field.name} className="editable-cell">
          <input
            type="text"
            name={field.name}
            value={formData[field.name] || ""}
            onChange={handleChange}
            className="editable-input"
          />
        </td>
      ))}
      <td className="editable-actions">
        <button className="btn btn-primary save-btn" onClick={handleSave}>
          Save
        </button>
        <button className="btn btn-secondary cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </td>
    </tr>
  );
}

EditableRow.propTypes = {
  data: PropTypes.object.isRequired,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default EditableRow;