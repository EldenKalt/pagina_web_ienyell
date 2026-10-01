@echo off
setlocal

start "IENYELL Backend" cmd.exe /k "cd /d C:\Users\aliss\Downloads\pagina_web_ienyell\backend && npm.cmd run dev"
start "IENYELL Frontend" cmd.exe /k "cd /d C:\Users\aliss\Downloads\pagina_web_ienyell && npm.cmd run dev"

endlocal
