@echo off
REM ===================================================================
REM  Memoria El Salado - instalacion completa y arranque automatico
REM
REM  Doble clic sobre este archivo para instalar y abrir la aplicacion.
REM  Funciona con MySQL (XAMPP) o con PostgreSQL: detecta cual esta corriendo.
REM  Se puede volver a ejecutar: conserva la configuracion y los datos.
REM ===================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

set DB_USUARIO=memoria
set DB_CLAVE=memoria
set DB_NOMBRE=memoria_el_salado
set DB_HOST=localhost
set DB_PUERTO=5432
set MYSQL_PORT=3306
set MOTOR=
set URL=http://localhost:3000

echo.
echo ============================================
echo   MEMORIA EL SALADO - Instalacion
echo ============================================

REM ---------------------------------------------------- 1. Requisitos
echo.
echo [1/6] Comprobando requisitos...

REM Si Node no esta instalado en el sistema, se busca una copia portatil en
REM una carpeta "node-portable" junto a esta, o dentro del propio proyecto.
where node >nul 2>&1
if errorlevel 1 (
  for %%D in ("..\node-portable" "node-portable") do (
    if exist "%%~fD\node.exe" set "PATH=%%~fD;!PATH!"
    for /d %%S in ("%%~fD\*") do (
      if exist "%%~fS\node.exe" set "PATH=%%~fS;!PATH!"
    )
  )
)

REM Usar MySQL8 del sistema siempre que exista. XAMPP solo se usa como ultimo
REM recurso si no hay un cliente MySQL real instalado en Windows.
for %%D in ("C:\Program Files\MySQL\MySQL Server 8.0\bin" "C:\Program Files\MySQL\MySQL Server 8.0\bin" "!ProgramFiles(x86)!\MySQL\MySQL Server 8.0\bin" "!ProgramFiles!\MySQL\MySQL Server 8.0\bin") do (
  if exist "%%~fD\mysql.exe" set "PATH=%%~fD;!PATH!"
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo   ERROR: no se encontro Node.js.
  echo   Instalalo desde https://nodejs.org ^(version LTS^) y vuelve a ejecutar este archivo,
  echo   o descomprime una version portatil en una carpeta "node-portable"
  echo   al lado de esta y vuelve a intentarlo.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   Node.js %%v

REM En Windows, las herramientas de MySQL y PostgreSQL casi nunca quedan en el
REM PATH al instalarlas. Antes de rendirse, se buscan donde suelen estar.
REM Primero el servidor MySQL instalado como servicio; despues el de XAMPP.

where mysql >nul 2>&1
if errorlevel 1 (
  for /d %%D in ("%ProgramFiles%\MySQL\*") do (
    if exist "%%~D\bin\mysql.exe" set "PATH=%%~D\bin;!PATH!"
  )
)

where mysql >nul 2>&1
if errorlevel 1 (
  for %%D in ("C:\xampp\mysql\bin" "D:\xampp\mysql\bin") do (
    if exist "%%~D\mysql.exe" set "PATH=%%~D;!PATH!"
  )
)

where psql >nul 2>&1
if errorlevel 1 (
  for /d %%D in ("%ProgramFiles%\PostgreSQL\*") do (
    if exist "%%~D\bin\psql.exe" set "PATH=%%~D\bin;!PATH!"
  )
)


set TIENE_PSQL=0
set TIENE_MYSQL=0
where psql >nul 2>&1 && set TIENE_PSQL=1
where mysql >nul 2>&1 && set TIENE_MYSQL=1

if %TIENE_PSQL%==1 for /f "delims=" %%v in ('psql --version') do echo   %%v
if %TIENE_MYSQL%==1 for /f "delims=" %%d in ('where mysql') do echo   MySQL en %%d

if %TIENE_PSQL%==0 if %TIENE_MYSQL%==0 (
  echo.
  echo   ERROR: no se encontro ni MySQL ni PostgreSQL.
  echo.
  echo   Se busco en el PATH y en las carpetas habituales de instalacion.
  echo   Si tienes XAMPP en otra unidad, anade su carpeta mysql\bin al PATH,
  echo   por ejemplo C:\xampp\mysql\bin
  echo   O instala PostgreSQL desde https://www.postgresql.org/download/windows/
  echo.
  pause
  exit /b 1
)

REM ------------------------------------------------ 2. Motor de datos
echo.
echo [2/6] Detectando el motor de base de datos...

set MYSQL_VIVO=0
set PG_VIVO=0
if %TIENE_MYSQL%==1 (
  if defined MYSQL_PWD (
    mysqladmin -u root -h %DB_HOST% -p!MYSQL_PWD! ping --silent >nul 2>&1 && set MYSQL_VIVO=1
  ) else (
    mysqladmin -u root -h %DB_HOST% ping --silent >nul 2>&1 && set MYSQL_VIVO=1
  )
  REM Si root tiene contrasena, el ping puede fallar aunque el servidor este
  REM levantado. Que el puerto este a la escucha ya basta para saberlo.
  REM No se busca LISTENING: netstat lo traduce segun el idioma.
  if !MYSQL_VIVO!==0 netstat -an | findstr /r /c:"[.:]3306 " >nul 2>&1 && set MYSQL_VIVO=1
)
if %TIENE_PSQL%==1 (
  pg_isready -h %DB_HOST% -p 5432 >nul 2>&1 && set PG_VIVO=1
  if !PG_VIVO!==0 netstat -an | findstr /r /c:"[.:]5432 " >nul 2>&1 && set PG_VIVO=1
)

if %MYSQL_VIVO%==1 if %PG_VIVO%==1 (
  echo   Estan disponibles los dos motores.
  set /p RESP=  Cual usas? [mysql / postgres]:
)
if defined RESP (
  echo !RESP! | findstr /i "mysql" >nul && set MOTOR=mysql
  if not defined MOTOR set MOTOR=postgresql
)
if not defined MOTOR if %MYSQL_VIVO%==1 set MOTOR=mysql
if not defined MOTOR if %PG_VIVO%==1 set MOTOR=postgresql

if not defined MOTOR (
  echo.
  echo   ERROR: no hay ningun motor de base de datos corriendo.
  echo.
  echo   Si usas XAMPP, abre el panel de control y pulsa Start junto a MySQL.
  echo   Si tienes MySQL instalado como servicio de Windows, inicialo con:
  echo       net start MySQL80
  echo.
  pause
  exit /b 1
)

if "%MOTOR%"=="mysql" (
  set DB_PUERTO=%MYSQL_PORT%
  if exist "C:\xampp\mysql\bin\mysql.exe" (
    netstat -an | findstr /r /c:"[.:]3306 " >nul 2>&1
    if not errorlevel 1 (
      set "DB_PUERTO=3306"
      set "MYSQL_PORT=3306"
    )
  )
  echo   Motor: MySQL ^(puerto !DB_PUERTO!^)
) else (
  set DB_PUERTO=5432
  echo   Motor: PostgreSQL ^(puerto 5432^)
)

call node scripts\motor-bd.mjs %MOTOR% >nul

REM ----------------------------------------- 3. Usuario y base de datos
echo.
echo [3/6] Preparando la base de datos...

if "%MOTOR%"=="mysql" (
  if defined MYSQL_PWD (
    mysql -u root -h %DB_HOST% -P !DB_PUERTO! -p!MYSQL_PWD! -e "SELECT 1" >nul 2>&1
  ) else (
    mysql -u root -h %DB_HOST% -P !DB_PUERTO! -e "SELECT 1" >nul 2>&1
  )
  if errorlevel 1 (
    echo   Escribe la contrasena de root de MySQL ^(deja vacio si no tiene^):
    set /p MYSQL_PWD=  Contrasena:
  )
  if defined MYSQL_PWD (
    mysql -u root -h %DB_HOST% -P !DB_PUERTO! -p!MYSQL_PWD! -e "CREATE DATABASE IF NOT EXISTS %DB_NOMBRE% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
  ) else (
    mysql -u root -h %DB_HOST% -P !DB_PUERTO! -e "CREATE DATABASE IF NOT EXISTS %DB_NOMBRE% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
  )
  if errorlevel 1 (
    echo.
    echo   ERROR: no se pudo crear la base de datos en MySQL.
    echo   Verifica que MySQL este iniciado en XAMPP y la contrasena de root.
    echo.
    pause
    exit /b 1
  )
  echo   Base de datos "%DB_NOMBRE%" lista en MySQL
  if defined MYSQL_PWD (
    REM La contrasena viaja dentro de una URL, asi que hay que escaparla: una
    REM arroba o un signo de interrogacion la partirian en dos. Node ya esta
    REM disponible a estas alturas y sabe hacerlo bien.
    for /f "delims=" %%E in ('node -e "process.stdout.write(encodeURIComponent(process.env.MYSQL_PWD))"') do set "CLAVE_URL=%%E"
    set CADENA=mysql://root:!CLAVE_URL!@%DB_HOST%:%DB_PUERTO%/%DB_NOMBRE%
  ) else (
    set CADENA=mysql://root@%DB_HOST%:%DB_PUERTO%/%DB_NOMBRE%
  )
) else (
  psql -U postgres -h %DB_HOST% -p %DB_PUERTO% -c "SELECT 1" >nul 2>&1
  if errorlevel 1 (
    echo   Escribe la contrasena del usuario administrador "postgres":
    set /p PGPASSWORD=  Contrasena:
  )
  psql -U postgres -h %DB_HOST% -p %DB_PUERTO% -tAc "SELECT 1 FROM pg_roles WHERE rolname='%DB_USUARIO%'" | findstr "1" >nul
  if errorlevel 1 (
    psql -U postgres -h %DB_HOST% -p %DB_PUERTO% -c "CREATE USER %DB_USUARIO% WITH PASSWORD '%DB_CLAVE%';" >nul
    echo   Usuario "%DB_USUARIO%" creado.
  )
  psql -U postgres -h %DB_HOST% -p %DB_PUERTO% -c "ALTER USER %DB_USUARIO% CREATEDB;" >nul
  psql -U postgres -h %DB_HOST% -p %DB_PUERTO% -tAc "SELECT 1 FROM pg_database WHERE datname='%DB_NOMBRE%'" | findstr "1" >nul
  if errorlevel 1 (
    psql -U postgres -h %DB_HOST% -p %DB_PUERTO% -c "CREATE DATABASE %DB_NOMBRE% OWNER %DB_USUARIO%;" >nul
    echo   Base de datos "%DB_NOMBRE%" creada.
  )
  set PGPASSWORD=
  set CADENA=postgresql://%DB_USUARIO%:%DB_CLAVE%@%DB_HOST%:%DB_PUERTO%/%DB_NOMBRE%?schema=public
)

REM ----------------------------------------------- 4. Configuracion
echo.
echo [4/6] Configurando variables de entorno...

if exist ".env" (
  echo   El archivo .env ya existia, se conserva.
) else (
  for /f "delims=" %%s in ('node -p "require(\"node:crypto\").randomBytes(32).toString(\"base64\")"') do set "SECRETO=%%s"
  (
    echo DATABASE_URL="!CADENA!"
    echo AUTH_SECRET="!SECRETO!"
    echo AUTH_TRUST_HOST=true
  ) > .env
  echo   Archivo .env creado con un secreto generado al azar.
)

REM ------------------------------------------------- 5. Dependencias
echo.
echo [5/6] Instalando dependencias ^(puede tardar unos minutos^)...

if exist "node_modules\prisma" (
  echo   Ya estaban instaladas.
) else (
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   ERROR: fallo la instalacion de dependencias.
    echo.
    pause
    exit /b 1
  )
)

if not exist "node_modules\prisma" (
  echo.
  echo   ERROR: Prisma no quedo instalado correctamente.
  echo   Reinstalando dependencias...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   ERROR: no se pudo instalar Prisma.
    echo.
    pause
    exit /b 1
  )
)

REM ---------------------------------------- 6. Migraciones y datos
echo.
echo [6/6] Creando las tablas y cargando los datos...

if "%MOTOR%"=="postgresql" (
  call npm exec --yes prisma migrate deploy
) else (
  call npm exec --yes prisma db push
)
if errorlevel 1 (
  echo.
  echo   ERROR: fallaron las migraciones. Revisa la cadena DATABASE_URL del archivo .env
  echo.
  pause
  exit /b 1
)
call npm exec --yes prisma generate >nul

REM La semilla solo se carga si la base esta vacia, para no borrar trabajo previo.
set USUARIOS=0
if "%MOTOR%"=="mysql" (
  if defined MYSQL_PWD (
    for /f "delims=" %%u in ('mysql -u root -h %DB_HOST% -P !DB_PUERTO! -p!MYSQL_PWD! -D %DB_NOMBRE% -N -B -e "SELECT count(*) FROM User" 2^>nul') do set USUARIOS=%%u
  ) else (
    for /f "delims=" %%u in ('mysql -u root -h %DB_HOST% -P !DB_PUERTO! -D %DB_NOMBRE% -N -B -e "SELECT count(*) FROM User" 2^>nul') do set USUARIOS=%%u
  )
) else (
  set PGPASSWORD=%DB_CLAVE%
  for /f "delims=" %%u in ('psql -U %DB_USUARIO% -h %DB_HOST% -p %DB_PUERTO% -d %DB_NOMBRE% -tAc "SELECT count(*) FROM \"User\"" 2^>nul') do set USUARIOS=%%u
  set PGPASSWORD=
)

if "%USUARIOS%"=="0" (
  call npm run db:seed
) else (
  echo   Ya habia datos cargados ^(%USUARIOS% usuarios^), no se recarga la semilla.
  echo   Para reiniciarlos desde cero: npm run db:seed
)

REM --------------------------------------------------------- Arranque
echo.
echo Iniciando la aplicacion...
start "" /b cmd /c "npm run dev"

echo   Esperando a que el servidor responda...
set LISTO=0
for /l %%i in (1,1,90) do (
  if !LISTO!==0 (
    curl -fsS %URL%/login >nul 2>&1
    if not errorlevel 1 set LISTO=1
    if !LISTO!==0 timeout /t 1 /nobreak >nul
  )
)

if !LISTO!==0 (
  echo.
  echo   El servidor tardo demasiado. Abre %URL% manualmente en el navegador.
) else (
  start "" %URL%
)

echo.
echo ============================================
echo   La aplicacion esta en %URL%
echo ============================================
echo.
echo   Unico usuario creado ^(administrador^)
echo.
echo     Usuario                 admin.sistema
echo     Contrasena provisional  Mh7#tQvk.Rz3
echo.
echo   Al entrar, la plataforma te pedira cambiarla por una tuya.
echo.
echo   El sistema arranca vacio. Como administrador puedes crear
echo   al docente en "Docentes" y subir una guia del CNMH en
echo   "Importar modulo". El docente crea luego a sus estudiantes.
echo.
echo   Cierra esta ventana para detener la aplicacion.
echo.
pause
