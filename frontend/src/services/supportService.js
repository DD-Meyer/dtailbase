import api from "../axios_instance";

export const fetchMySupportTickets = async () => {
  const response = await api.get("support/tickets/");
  return response.data;
};

export const createSupportTicket = async (payload) => {
  const response = await api.post("support/tickets/", payload);
  return response.data;
};

export const fetchSupportTicketMessages = async (ticketId) => {
  const response = await api.get(`support/tickets/${ticketId}/messages/`);
  return response.data;
};

export const updateSupportTicketStatus = async (ticketId, status) => {
  const response = await api.patch(`support/tickets/${ticketId}/`, { status });
  return response.data;
};

export const sendSupportTicketMessage = async (ticketId, message) => {
  const response = await api.post(`support/tickets/${ticketId}/messages/`, { message });
  return response.data;
};

export const fetchAdminSupportInbox = async () => {
  const response = await api.get("support/admin/inbox/");
  return response.data;
};
