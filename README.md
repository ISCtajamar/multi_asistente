# 🤖 Multi-Asistente RAG (Retrieval-Augmented Generation)

Una solución full-stack avanzada para la gestión de asistentes de IA personalizados, capaces de responder preguntas basadas exclusivamente en documentos específicos cargados por el usuario.

## 🌟 Descripción General

Esta plataforma permite a los usuarios crear múltiples asistentes virtuales especializados. Cada asistente posee su propio conjunto de documentos y directrices de comportamiento, garantizando que las respuestas sean precisas, contextualizadas y basadas en evidencia (sin alucinaciones).

La aplicación utiliza una arquitectura de **Generación Aumentada por Recuperación (RAG)**, donde el sistema busca en tiempo real la información más relevante dentro de los archivos del asistente antes de generar una respuesta mediante un modelo de lenguaje de última generación.

---

## 🚀 Características Principales

- **Aislamiento Total**: Cada asistente es independiente. Los documentos y conversaciones de un asistente no interfieren con otros.
- **Seguridad Multi-usuario**: Implementación de *Row Level Security* (RLS) para asegurar que cada usuario solo acceda a su propia información.
- **Gestión Documental Inteligente**: Soporte para múltiples formatos (PDF, DOCX, PPTX, TXT, MD) con procesamiento automático de fragmentación (chunking) y generación de embeddings.
- **Búsqueda Vectorial Semántica**: Recuperación de información basada en el significado y no solo en palabras clave, utilizando `pgvector`.
- **Citas y Transparencia**: El sistema indica exactamente qué fragmentos de qué documentos utilizó para generar cada respuesta.
- **Interfaz Moderna**: Experiencia de usuario fluida construida con Next.js 14, incluyendo dashboards de gestión y chats en tiempo real.

---

## 🏗️ Arquitectura del Sistema

El proyecto se divide en tres capas principales:

### 1. Frontend (Next.js 14)
- Interfaz reactiva con App Router.
- Gestión de sesiones y autenticación mediante Supabase Auth.
- Dashboard para la creación de asistentes, carga de documentos y chat interactivo.

### 2. Backend (FastAPI)
- API robusta en Python que gestiona la lógica de negocio.
- Procesamiento de documentos: extracción de texto, limpieza y fragmentación.
- Integración con OpenAI para la generación de embeddings y respuestas inteligentes.

### 3. Base de Datos y Almacenamiento (Supabase)
- **PostgreSQL + pgvector**: Almacenamiento de metadatos y vectores de alta dimensionalidad.
- **Storage**: Almacenamiento seguro de los archivos físicos cargados por los usuarios.
- **Auth**: Gestión completa del ciclo de vida del usuario.

---

## 🛠️ Tecnologías Utilizadas

| Capa | Tecnología |
|---|---|
| **Lenguajes** | TypeScript, Python, SQL |
| **Frameworks** | Next.js 14, FastAPI |
| **IA / LLM** | OpenAI (GPT-4o, text-embedding-3) |
| **Base de Datos** | Supabase (PostgreSQL + pgvector) |
| **Estilos** | Tailwind CSS |

---

## 📖 Flujo de Funcionamiento

1. **Ingesta**: El usuario sube un documento. El backend lo divide en fragmentos pequeños ("chunks").
2. **Vectorización**: Cada fragmento se convierte en un vector numérico que representa su significado semántico.
3. **Consulta**: Cuando el usuario hace una pregunta, el sistema busca los fragmentos más similares en la base de datos vectorial.
4. **Generación**: Se envía la pregunta junto con los fragmentos encontrados al modelo de IA, que redacta la respuesta final citando las fuentes.

---

## ⚡ Ejecución Rápida

Para poner en marcha la aplicación de forma local, sigue estos pasos:

1. **Configuración**: Asegúrate de tener un archivo `.env` en la raíz con tus credenciales de Supabase y OpenAI.
2. **Lanzamiento**: Ejecuta el archivo automatizado:
   ```bash
   .\run_app.bat
   ```
   *Esto iniciará automáticamente tanto el servidor de backend (puerto 8000) como el frontend (puerto 3000).*

---

## 🛠️ Estructura del Proyecto

```text
multi_asistente/
├── frontend/         # Aplicación Next.js (Interfaz de usuario)
├── backend/          # API FastAPI (Lógica de IA y procesamiento)
├── supabase/         # Scripts de base de datos y migraciones
├── run_app.bat       # Script de ejecución automática
└── .env              # Configuración de variables de entorno
```
