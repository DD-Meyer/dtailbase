import axios from "axios";

const api = axios.create({
  // This is the magic change:
  baseURL: "/api/", 
  withCredentials: true, 
});

export default api;