1. Test a workflow
Use the {{pwd}}/workspace and hopefully the 
Create tests which confirm that the following workflow works in node and python.
    a. core -p linux
    b. addOns -c  C:\Users\keste\Documents\projects\zap-downloader\config\release-config.yaml
    c. pack -> a file is created in workspace/packages
    d. unpack -> an installation is placed in install
    e. daemon --> starts and you can curl version curl -v "http://localhost:8080/JSON/core/view/version/"

2. Create 2 Github actions which do the workflow tests one per type (node / python)

3. Creation of toml configuration.
Create a new command in typescript and python which can create a zap.toml which will be placed in the workspace folder and should be used as an alternative -t --toml when present the daemon uses it to start the zap daemon:

[ENV]
# Workspace directory (default: workspace)
ZAP_DOWNLOADER_WORKSPACE=workspace
# Subdirectories
ZAP_DOWNLOADER_DOWNLOADS=downloads
ZAP_DOWNLOADER_INSTALL=install
ZAP_DOWNLOADER_PACKAGES=packages
ZAP_DOWNLOADER_ZAP_HOME=.zap

[SERVER]
PORT = 8080
HOST = "0.0.0.0"

[PATHS]
# the programme needs to work out where and which the jar is
JAR_PATH = "" 
DIR = ".zap"
# the programme needs to work out correct address
INSTALL_DIR = "install/zap"

[JAVA_OPTIONS]
flags = [
  "-Xms4g",
  "-Xmx4g",
  "-XX:+UseZGC",
  "-Xss512k",
  "-XX:+UseContainerSupport",
  "-XX:MaxRAMPercentage=80",
  "-Dzap.session=/zap/wrk/session.data"
]

[CONFIG]
flags = [
  "-config api.disablekey = true",
  "-config api.addrs.addr.name = .*",
  "-config api.addrs.addr.regex = true",
  "-config database.response.bodysize = 104857600",
  "-config database.cache.size = 1000000",
  "-config database.recoverylog = false"
]




