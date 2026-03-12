import { useEffect, useState } from "react";
import api from "../axios_instance";

function Services() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.get("services/")
      .then(res => setServices(res.data))
      .catch(err => console.error("Services error:", err));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Services</h1>

      <ul>
        {services.map(s => (
          <li key={s.id}>
            {s.name} – {s.duration_minutes} mins – R{s.base_price}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Services;
