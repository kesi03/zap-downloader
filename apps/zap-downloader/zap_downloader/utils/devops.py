import os
from typing import List, TypedDict


class DevOpsVariable(TypedDict):
    name: str
    value: str


def detect_devops_platform() -> str:
    if os.environ.get("AZURE_HTTP_USER_AGENT") or os.environ.get(
        "AZUREPS_HOST_ENVIRONMENT"
    ):
        return "azure-devops"
    if os.environ.get("GITHUB_ACTIONS") == "true":
        return "github-actions"
    if os.environ.get("TEAMCITY_VERSION"):
        return "teamcity"
    return "unknown"


def set_devops_variable(name: str, value: str) -> None:
    platform = detect_devops_platform()

    if platform == "azure-devops":
        print(f"##vso[task.setvariable variable={name}]{value}")
    elif platform == "github-actions":
        output_file = os.environ.get("GITHUB_OUTPUT")
        if output_file:
            with open(output_file, "a") as f:
                f.write(f"{name}={value}\n")
        else:
            print(f"::{name}::{value}")
    elif platform == "teamcity":
        print(f"##teamcity[setParameter name='{name}' value='{value}']")


def set_devops_variables(variables: List[DevOpsVariable]) -> None:
    for var in variables:
        set_devops_variable(var["name"], var["value"])
