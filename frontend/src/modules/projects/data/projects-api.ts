import type { Project } from "../types";
const baseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() || "/api").replace(/\/$/, "");
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, options);
  let result;
  try { result = await response.json(); } catch { throw new Error("No se pudo leer la respuesta del servidor."); }
  if (!response.ok) throw new Error(result.error || "No se pudo guardar el cambio.");
  return result.data;
}
export function loadProjects() {
  return request<{ projects: Project[]; integration: { status: string; provider: string } }>("/projects");
}
export function saveProject(project: Project, reason: string) {
  return request<Project>("/projects/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, expectedRevision: project.revision, reason }) });
}
