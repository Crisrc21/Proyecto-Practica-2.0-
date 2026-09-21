import { createProjectsService } from "../application/projects-service.js";
import { createProjectsRepository } from "../infrastructure/local-projects-repository.js";
import { HttpError } from "../../../shared/errors/http-error.js";

async function readProjectBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new HttpError(413, "El proyecto supera el tamaño permitido.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "No se pudo leer el proyecto enviado."); }
}
export const projectsRoutes = [
  { method: "GET", path: "/api/projects", handler: ({ env }) => createProjectsService(createProjectsRepository(env)).list() },
  { method: "POST", path: "/api/projects/save", handler: async ({ env, request }) => createProjectsService(createProjectsRepository(env)).save(await readProjectBody(request)) }
];
