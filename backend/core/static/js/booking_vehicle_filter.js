document.addEventListener("DOMContentLoaded", function () {
    const customerSelect = document.getElementById("id_customer");
    const vehicleSelect = document.getElementById("id_vehicle");

    if (!customerSelect || !vehicleSelect) return;

    customerSelect.addEventListener("change", function () {
        const customerId = this.value;

        // Clear current vehicle options
        vehicleSelect.innerHTML = "<option value=''>---------</option>";

        if (!customerId) return;

        // Fetch vehicles for selected customer via API
        fetch(`/api/vehicles/?customer=${customerId}`)
            .then(response => response.json())
            .then(data => {
                data.forEach(vehicle => {
                    const option = document.createElement("option");
                    option.value = vehicle.id;
                    option.text = `${vehicle.make} ${vehicle.model} (${vehicle.registration})`;
                    vehicleSelect.appendChild(option);
                });
            });
    });
});
