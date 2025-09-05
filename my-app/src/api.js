import axios from "axios";

const apiUrl = import.meta.env.VITE_APP_API_URL;

export async function fetchStats(endpoint) {
  try {
    const response = await axios.get(apiUrl+endpoint);
    return response.data;

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}


