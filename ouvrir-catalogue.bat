@echo off
rem Ouvre le catalogue vivant de GTRoyal (catalogue.html) dans le navigateur.
rem Il doit etre servi par un serveur local : un double-clic sur catalogue.html ne marche pas
rem (le navigateur interdit a une page ouverte en fichier de lire le jeu).
rem Si le port 8080 est deja pris (live-server deja lance), live-server en prend un autre.
cd /d "%~dp0"
npx live-server --host=0.0.0.0 --port=8080 --open=/catalogue.html
