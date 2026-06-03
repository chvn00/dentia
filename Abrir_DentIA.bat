@echo off
title Agente DentIA
color 3F

echo.
echo  ========================================
echo  Agente DentIA - Protesis Hibridas
echo  Powered by CHVN
echo  ========================================
echo.

echo  [1/3] Verificando Ollama...
curl -s http://localhost:11434 > nul 2>&1
if %errorlevel% neq 0 (
    echo  Iniciando Ollama...
    start "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
    timeout /t 4 /nobreak > nul
) else (
    echo  Ollama activo OK
)

echo  [2/3] Modelo Phi-3 Mini OK
echo  [3/3] Abriendo Agente DentIA en Chrome...

set HTML_PATH=%~dp0AgenteDentIA_ProtesisHibridas.html
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set CHROME2="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if exist %CHROME% (
    start "" %CHROME% --allow-file-access-from-files --disable-web-security --user-data-dir="C:\temp\dentia" "%HTML_PATH%"
) else if exist %CHROME2% (
    start "" %CHROME2% --allow-file-access-from-files --disable-web-security --user-data-dir="C:\temp\dentia" "%HTML_PATH%"
) else (
    echo  Chrome no encontrado. Abra manualmente el HTML.
    pause
)

echo  DentIA listo.
timeout /t 2 /nobreak > nul
