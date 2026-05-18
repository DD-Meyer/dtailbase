import { useState } from "react";
import { getAvailability, createBooking } from "../api";
import { showToast } from "../utils/uiFeedback";

export default function BookingForm() {
  const [date, setDate] = useState("");
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [slot, setSlot] = useState("");

  const loadAvailability = async () => {
    if (!date) {
      showToast("Pick a date first", "error");
      return;
    }

    const res = await getAvailability(date);
    setServices(res.data.services);
  };

  const submitBooking = async () => {
    if (!serviceId || !slot) {
      showToast("Missing fields", "error");
      return;
    }

    const [start, end] = slot.split("-");

    await createBooking({
      booking_date: date,
      booking_time: start,
      booking_end_time: end,
      service: serviceId,
      customer: "PUT_CUSTOMER_UUID_HERE",
      vehicle: "PUT_VEHICLE_UUID_HERE",
      notes: "",
    });

    showToast("Booking created", "success");
  };

  const selectedService = services.find(
    (s) => s.service.id === serviceId
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>New Booking</h2>

      <input type="date" onChange={(e) => setDate(e.target.value)} />
      <button onClick={loadAvailability}>Check</button>

      {services.length > 0 && (
        <>
          <h3>Service</h3>
          <select onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Select service</option>
            {services.map((s) => (
              <option key={s.service.id} value={s.service.id}>
                {s.service.name}
              </option>
            ))}
          </select>
        </>
      )}

      {selectedService && (
        <>
          <h3>Time Slot</h3>
          <select onChange={(e) => setSlot(e.target.value)}>
            <option value="">Select slot</option>
            {selectedService.available_slots.map((slot, i) => (
              <option
                key={i}
                value={`${slot.start}-${slot.end}`}
              >
                {slot.start} – {slot.end}
              </option>
            ))}
          </select>
        </>
      )}

      <br /><br />
      <button onClick={submitBooking}>Book</button>
    </div>
  );
}
