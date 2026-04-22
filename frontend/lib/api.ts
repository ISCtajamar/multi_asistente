import axios from "axios";
import { supabase } from "./supabase";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default api;
