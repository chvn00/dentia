# 🦷 DentIA — Agente Clínico IA para Prótesis Híbridas Implantosoportadas

**DentIA** es una aplicación web de soporte clínico desarrollada en la **Universidad Santo Tomás — Seccional Bucaramanga (USTA)** para asistir en la toma de decisiones durante el diseño y planificación de prótesis híbridas implantosoportadas en mandíbula edéntula.

---

## ✨ Funcionalidades

### 🤖 Agente IA — Consulta Clínica
Agente conversacional fundamentado en una base de conocimiento de **170 artículos científicos indexados** (38 revistas) y el **Protocolo Clínico Validado USTA**. Responde preguntas clínicas y biomecánicas con referencias clickeables que navegan directamente al artículo en la base de conocimiento.

### ⚙️ Simulador de Protocolo
Simulador interactivo que recomienda combinaciones óptimas de geometría de barra y material (PR-CC, PI-TI, PC-ZR, etc.) según parámetros clínicos del paciente:
- Técnica quirúrgica (implantes rectos / All-on-4)
- Calidad y cantidad ósea
- Longitud de cantilever
- Espacio interoclusal
- Bruxismo, estética, análisis FEA, demanda masticatoria

### 📚 Base de Conocimiento
Explorador de los 170 artículos con filtros por categoría (FEA, Materiales, Clínicos, Revisiones sistemáticas), búsqueda por texto y DOI como hipervínculo verificado.

### 📊 Estadísticas
Panel de uso: total de consultas, tokens generados, modelos utilizados, artículos más citados y distribución por categoría.

### ℹ️ Acerca De
Información del equipo de desarrollo, motor de IA, institución y diagrama de arquitectura del sistema.

---

## 🧠 Modelos de IA soportados

### Ollama (Local — sin internet)
| Modelo | RAM | Uso recomendado |
|--------|-----|-----------------|
| Llama 3.2 3B | 4 GB | Equipos con bajo hardware |
| **Qwen3 8B** ⭐ | 8 GB | Estándar · Rápido |
| Gemma3 12B | 12 GB | Literatura científica |
| Qwen3 14B | 16 GB | Alta precisión clínica |
| Qwen3 32B Q4 | 20 GB | Máxima precisión · M4 Pro |

### Groq Cloud (con internet)
| Modelo | Descripción |
|--------|-------------|
| Llama 3.3 70B Versatile | Máxima calidad · Recomendado |
| Llama 3.1 8B Instant | Ultra rápido |
| Gemma2 9B IT | Balance calidad / velocidad |

---

## 🏗️ Arquitectura

```
Usuario → Navegador → DentIA App (HTML/CSS/JS)
                           │
                ┌──────────┴──────────┐
                │                     │
         Ollama local            Groq Cloud
         localhost:11434      /api/groq (proxy)
                │
         articulos.json (170 artículos)
         localStorage (historial · estadísticas)
```

- **Frontend:** HTML5 + CSS3 + JavaScript (monolito)
- **Backend:** Node.js (server.js) — sirve estáticos y proxea Groq
- **IA local:** Ollama (100% offline, corre en el equipo del usuario)
- **IA cloud:** Groq API (requiere API Key y conexión a internet)
- **Persistencia:** localStorage del navegador

---

## 🚀 Despliegue en Railway

La app está desplegada en Railway conectada a este repositorio.

### Variable de entorno requerida
| Variable | Descripción |
|----------|-------------|
| `GROQ_API_KEY` | API Key de Groq ([obtener gratis](https://console.groq.com/keys)) |

### Pasos para redesplegar
1. Hacer cambios y `git push` a `main`
2. Railway redespliega automáticamente

---

## 💻 Ejecución local

### Requisitos
- [Ollama](https://ollama.com/download) instalado
- Modelo descargado: `ollama pull qwen3:8b`

### Opción A — Con servidor Node (recomendado)
```bash
npm start
```
Abre `http://localhost:3000` en el navegador.

### Opción B — Directo en Chrome (sin servidor)
```bash
ollama serve
```
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --allow-file-access-from-files \
  --disable-web-security \
  --user-data-dir=/tmp/dentia \
  "file:///ruta/a/DentIA/AgenteDentIA_ProtesisHibridas.html"
```

---

## 📁 Estructura del proyecto

```
DentIA/
├── AgenteDentIA_ProtesisHibridas.html   # App principal
├── css/
│   └── dentia.css                        # Estilos
├── js/
│   └── dentia.js                         # Lógica
├── data/
│   └── articulos.json                    # Base de conocimiento (170 artículos)
├── server.js                             # Servidor Node (proxy Groq + estáticos)
├── package.json
├── CHANGELOG.txt                         # Historial de cambios
└── INSTRUCCIONES_EJECUCION.txt
```

---

## 👥 Desarrolladores

| | Nombre | Formación |
|---|--------|-----------|
| 👨‍💼 | **Dr. Ing. Cesar Hernando Valencia Niño** | Doctor en Ingeniería Eléctrica (IA) · Magister en Ingeniería Mecánica · Especialista en Telecomunicaciones · Ingeniero Electrónico |
| 👩‍⚕️ | **Dra. Lina Maria Rodriguez Cuellar** | Doctora en Odontología · Magister en Odontología · Especialista en Rehabilitación Oral · Odontóloga |

**Institución:** Universidad Santo Tomás — Seccional Bucaramanga · 2026

---

## 📋 Versión actual

**v1.5.4** — Soporte dual Ollama + Groq Cloud

Ver historial completo en [`CHANGELOG.txt`](CHANGELOG.txt)
