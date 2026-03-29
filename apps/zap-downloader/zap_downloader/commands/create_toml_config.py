import typer
from pathlib import Path
from rich.console import Console
from inquirer import List, Checkbox, Text, prompt
from ..workspace import (
    get_workspace,
    get_install_dir,
    get_packages_dir,
    get_zap_home_dir,
)

console = Console()

DEFAULT_CONFIG = {
    "env": {
        "workspace": "workspace",
        "downloads": "downloads",
        "install": "install",
        "packages": "packages",
        "zapHome": ".zap",
    },
    "server": {
        "port": 8080,
        "host": "0.0.0.0",
    },
    "paths": {
        "jarPath": "",
        "dir": ".zap",
        "installDir": "install",
    },
    "javaOptions": [
        "-Xms4g",
        "-Xmx4g",
        "-XX:+UseZGC",
        "-Xss512k",
        "-XX:+UseContainerSupport",
        "-XX:MaxRAMPercentage=80",
        "-Dzap.session=/zap/wrk/session.data",
    ],
    "config": [
        "-config api.disablekey = true",
        "-config api.addrs.addr.name = .*",
        "-config api.addrs.addr.regex = true",
        "-config database.response.bodysize = 104857600",
        "-config database.cache.size = 1000000",
        "-config database.recoverylog = false",
    ],
}


def edit_env_section(config: dict) -> dict:
    choices = [
        ("ZAP_DOWNLOADER_WORKSPACE", "workspace"),
        ("ZAP_DOWNLOADER_DOWNLOADS", "downloads"),
        ("ZAP_DOWNLOADER_INSTALL", "install"),
        ("ZAP_DOWNLOADER_PACKAGES", "packages"),
        ("ZAP_DOWNLOADER_ZAP_HOME", "zapHome"),
        ("Done", "done"),
    ]

    editing = True
    while editing:
        questions = [
            List(
                "field",
                message="Which ENV variable to change?",
                choices=[c[0] for c in choices],
            )
        ]
        answers = prompt(questions)
        field = dict(choices).get(answers["field"])

        if field == "done":
            editing = False
            continue

        questions = [
            Text(
                "value",
                message=f"Enter new value for {answers['field']}:",
                default=config["env"][field],
            )
        ]
        answers = prompt(questions)
        config["env"][field] = answers["value"]

    return config


def edit_server_section(config: dict) -> dict:
    choices = [
        ("PORT", "port"),
        ("HOST", "host"),
        ("Done", "done"),
    ]

    editing = True
    while editing:
        questions = [
            List(
                "field",
                message="Which SERVER setting to change?",
                choices=[c[0] for c in choices],
            )
        ]
        answers = prompt(questions)
        field = dict(choices).get(answers["field"])

        if field == "done":
            editing = False
            continue

        current_value = config["server"][field]
        questions = [
            Text(
                "value",
                message=f"Enter new value for {answers['field']}:",
                default=str(current_value),
            )
        ]
        answers = prompt(questions)

        if field == "port":
            config["server"]["port"] = int(answers["value"])
        else:
            config["server"]["host"] = answers["value"]

    return config


def edit_paths_section(config: dict) -> dict:
    choices = [
        ("JAR_PATH", "jarPath"),
        ("DIR", "dir"),
        ("INSTALL_DIR", "installDir"),
        ("Done", "done"),
    ]

    editing = True
    while editing:
        questions = [
            List(
                "field",
                message="Which PATH setting to change?",
                choices=[c[0] for c in choices],
            )
        ]
        answers = prompt(questions)
        field = dict(choices).get(answers["field"])

        if field == "done":
            editing = False
            continue

        questions = [
            Text(
                "value",
                message=f"Enter new value for {answers['field']}:",
                default=config["paths"][field],
            )
        ]
        answers = prompt(questions)
        config["paths"][field] = answers["value"]

    return config


def edit_java_options_section(config: dict) -> dict:
    choices = [
        ("List/Edit options", "edit"),
        ("Add new option", "add"),
        ("Done", "done"),
    ]

    editing = True
    while editing:
        questions = [
            List(
                "action",
                message="JAVA_OPTIONS - What to do?",
                choices=[c[0] for c in choices],
            )
        ]
        answers = prompt(questions)
        action = dict(choices).get(answers["action"])

        if action == "done":
            editing = False
            continue

        if action == "add":
            questions = [
                Text("newOption", message="Enter new JVM option (e.g., -Xms2g):")
            ]
            answers = prompt(questions)
            if answers["newOption"]:
                config["javaOptions"].append(answers["newOption"])
                console.print(f"[green]Added: {answers['newOption']}[/green]")
        elif action == "edit":
            if not config["javaOptions"]:
                console.print("[yellow]No options to edit[/yellow]")
                continue

            questions = [
                Checkbox(
                    "selected",
                    message="Select options to edit or remove:",
                    choices=config["javaOptions"],
                )
            ]
            answers = prompt(questions)

            for opt in answers["selected"]:
                action_choices = [
                    ("Change value", "change"),
                    ("Remove", "remove"),
                    ("Skip", "skip"),
                ]
                questions = [
                    List(
                        "editAction",
                        message=f"Option: {opt}",
                        choices=[c[0] for c in action_choices],
                    )
                ]
                edit_answer = prompt(questions)
                edit_action = dict(action_choices).get(edit_answer["editAction"])

                if edit_action == "remove":
                    config["javaOptions"].remove(opt)
                    console.print(f"[red]Removed: {opt}[/red]")
                elif edit_action == "change":
                    questions = [
                        Text("newValue", message="Enter new value:", default=opt)
                    ]
                    new_answer = prompt(questions)
                    idx = config["javaOptions"].index(opt)
                    config["javaOptions"][idx] = new_answer["newValue"]

    return config


def edit_config_section(config: dict) -> dict:
    choices = [
        ("List/Edit options", "edit"),
        ("Add new option", "add"),
        ("Done", "done"),
    ]

    editing = True
    while editing:
        questions = [
            List(
                "action",
                message="CONFIG - What to do?",
                choices=[c[0] for c in choices],
            )
        ]
        answers = prompt(questions)
        action = dict(choices).get(answers["action"])

        if action == "done":
            editing = False
            continue

        if action == "add":
            questions = [
                Text(
                    "newOption",
                    message="Enter new config option (e.g., -config api.key=secret):",
                )
            ]
            answers = prompt(questions)
            if answers["newOption"]:
                config["config"].append(answers["newOption"])
                console.print(f"[green]Added: {answers['newOption']}[/green]")
        elif action == "edit":
            if not config["config"]:
                console.print("[yellow]No options to edit[/yellow]")
                continue

            questions = [
                Checkbox(
                    "selected",
                    message="Select options to edit or remove:",
                    choices=config["config"],
                )
            ]
            answers = prompt(questions)

            for opt in answers["selected"]:
                action_choices = [
                    ("Change value", "change"),
                    ("Remove", "remove"),
                    ("Skip", "skip"),
                ]
                questions = [
                    List(
                        "editAction",
                        message=f"Option: {opt}",
                        choices=[c[0] for c in action_choices],
                    )
                ]
                edit_answer = prompt(questions)
                edit_action = dict(action_choices).get(edit_answer["editAction"])

                if edit_action == "remove":
                    config["config"].remove(opt)
                    console.print(f"[red]Removed: {opt}[/red]")
                elif edit_action == "change":
                    questions = [
                        Text("newValue", message="Enter new value:", default=opt)
                    ]
                    new_answer = prompt(questions)
                    idx = config["config"].index(opt)
                    config["config"][idx] = new_answer["newValue"]

    return config


def generate_toml(config: dict) -> str:
    java_flags = ",\n".join(f'  "{opt}"' for opt in config["javaOptions"])
    config_flags = ",\n".join(f'  "{opt}"' for opt in config["config"])

    return f"""[ENV]
# Workspace directory (default: workspace)
ZAP_DOWNLOADER_WORKSPACE={config["env"]["workspace"]}
# Subdirectories
ZAP_DOWNLOADER_DOWNLOADS={config["env"]["downloads"]}
ZAP_DOWNLOADER_INSTALL={config["env"]["install"]}
ZAP_DOWNLOADER_PACKAGES={config["env"]["packages"]}
ZAP_DOWNLOADER_ZAP_HOME={config["env"]["zapHome"]}

[SERVER]
PORT = {config["server"]["port"]}
HOST = "{config["server"]["host"]}"

[PATHS]
# the programme needs to work out where and which the jar is
JAR_PATH = "{config["paths"]["jarPath"]}"
DIR = "{config["paths"]["dir"]}"
# the programme needs to work out correct address
INSTALL_DIR = "{config["paths"]["installDir"]}"

[JAVA_OPTIONS]
flags = [
{java_flags}
]

[CONFIG]
flags = [
{config_flags}
]
"""


def create_toml_config(
    output: str = typer.Option(
        None, "--output", "-o", help="Output file path (default: workspace/zap.toml)"
    ),
):
    """Create zap.toml configuration file for daemon."""
    workspace = get_workspace()

    if output is None:
        output = str(Path(workspace) / "zap.toml")

    config = {
        k: v.copy() if isinstance(v, dict) else v[:] for k, v in DEFAULT_CONFIG.items()
    }
    config["env"]["workspace"] = workspace
    config["paths"]["installDir"] = str(Path(workspace) / get_install_dir()).replace(
        "\\", "/"
    )

    section_choices = [
        ("[ENV] - Workspace and directories", "env"),
        ("[SERVER] - Port and host", "server"),
        ("[PATHS] - JAR and installation paths", "paths"),
        ("[JAVA_OPTIONS] - JVM flags", "java"),
        ("[CONFIG] - ZAP configuration", "config"),
        ("Save and exit", "save"),
    ]

    console.print("\n[blue]=== ZAP TOML Configuration ===[/blue]\n")

    done = False
    while not done:
        questions = [
            List(
                "section",
                message="Which section to edit?",
                choices=[c[0] for c in section_choices],
            )
        ]
        answers = prompt(questions)
        section = dict(section_choices).get(answers["section"])

        if section == "env":
            config = edit_env_section(config)
        elif section == "server":
            config = edit_server_section(config)
        elif section == "paths":
            config = edit_paths_section(config)
        elif section == "java":
            config = edit_java_options_section(config)
        elif section == "config":
            config = edit_config_section(config)
        elif section == "save":
            done = True

    toml_content = generate_toml(config)

    with open(output, "w") as f:
        f.write(toml_content)

    console.print(f"[green]Created zap.toml: {output}[/green]")
