@echo off
cd /d "%~dp0"
echo.
echo =====================================
echo   MSC Studio - inicializando...
echo =====================================
echo.

REM Tenta achar Python
where python >nul 2>nul
if errorlevel 1 (
  echo ERRO: Python nao encontrado no PATH.
  echo Instale Python em https://www.python.org/downloads/
  pause
  exit /b 1
)

echo [1/3] Verificando dependencias Python...
python -m pip install --quiet --disable-pip-version-check --upgrade pip 2>nul
python -m pip install --quiet --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
  echo Erro instalando dependencias. Tente rodar manualmente:
  echo    python -m pip install -r requirements.txt
  pause
  exit /b 1
)

echo [2/3] Cache da API Terasoft...
if not exist "cache\produtos.json" (
  echo    primeira execucao, baixando catalogo da API...
  python -c "import sys; sys.path.insert(0,'lib'); import terasoft_client as ts; ts.consultar_produtos(use_cache=False); print('   OK')"
)

echo [3/3] Iniciando servidor...
echo.
echo =====================================
echo   Abra o navegador em:
echo   http://localhost:8000
echo =====================================
echo.
echo (deixe esta janela aberta enquanto usa o app)
echo (pressione Ctrl+C para parar)
echo.

REM Tenta abrir o navegador automaticamente apos 2 segundos
start "" /min cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

python main.py

echo.
echo Servidor parado.
pause
