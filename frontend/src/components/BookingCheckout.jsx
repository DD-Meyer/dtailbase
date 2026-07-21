import { showToast } from "../utils/uiFeedback";

const handlePayment = async (bookingId, price) => {
  try {
    const res = await api.post("payments/initiate/", { 
      booking_id: bookingId, 
      amount: price 
    });
    
    // PayFast requires a standard HTML Form POST
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://sandbox.payfast.co.za/eng/process'; // Use live URL for production

    Object.keys(res.data).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = res.data[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  } catch (err) {
    showToast("Payment initialization failed.", "error");
  }
};

