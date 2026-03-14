import json
import os
import sys
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from string import Template

from openai import OpenAI


VALID_LEVELS = {"高", "中", "低"}
PROMPT_FILE = Path("prompt.txt")


@dataclass
class GeneratedBranch:
    event: str
    stability: str
    challenge: str


@dataclass
class BranchNode:
    id: str
    event: str
    stability: str
    challenge: str
    parentId: str


@dataclass
class BranchRequest:
    age: int
    values: str
    interests: str
    personality: str
    current_event: str
    story_summary: str
    parent_id: str


def load_env_file(path: str = ".env") -> None:
    try:
        with open(path, "r", encoding="utf-8") as env_file:
            for line in env_file:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key, value.strip())
    except FileNotFoundError:
        pass


def get_openai_client() -> OpenAI:
    load_env_file()
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set.")
    return OpenAI(api_key=api_key)


def load_branch_prompt_template() -> str:
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")
    start_marker = "1. AIによる2分岐生成用プロンプト"
    end_marker = "\n2.選択後の結果表示用プロンプト"

    start_index = prompt_text.find(start_marker)
    end_index = prompt_text.find(end_marker)
    if start_index == -1 or end_index == -1:
        raise ValueError("Could not find the branch prompt section in prompt.txt.")

    return prompt_text[start_index + len(start_marker):end_index].strip()


def build_branch_prompt(branch_request: BranchRequest) -> str:
    template = load_branch_prompt_template()
    safe_template = Template(
        template
        .replace("{age}", "$age")
        .replace("{values}", "$values")
        .replace("{interests}", "$interests")
        .replace("{personality}", "$personality")
        .replace("{current_event}", "$current_event")
        .replace("{story_summary}", "$story_summary")
    )
    return safe_template.substitute(
        age=branch_request.age,
        values=branch_request.values,
        interests=branch_request.interests,
        personality=branch_request.personality,
        current_event=branch_request.current_event,
        story_summary=branch_request.story_summary,
    )


def parse_branch_response(response_text: str) -> list[GeneratedBranch]:
    data = json.loads(response_text)
    branches = data.get("branches")
    if not isinstance(branches, list) or len(branches) != 2:
        raise ValueError("Response must contain exactly two branches.")

    parsed_branches = []
    for item in branches:
        if not isinstance(item, dict):
            raise ValueError("Each branch must be a JSON object.")

        event = str(item.get("event", "")).strip()
        stability = str(item.get("stability", "")).strip()
        challenge = str(item.get("challenge", "")).strip()

        if not event:
            raise ValueError("Each branch must include a non-empty event.")
        if stability not in VALID_LEVELS:
            raise ValueError("stability must be one of 高, 中, 低.")
        if challenge not in VALID_LEVELS:
            raise ValueError("challenge must be one of 高, 中, 低.")

        parsed_branches.append(
            GeneratedBranch(
                event=event,
                stability=stability,
                challenge=challenge,
            )
        )

    return parsed_branches


def to_branch_nodes(branches: list[GeneratedBranch], parent_id: str) -> list[BranchNode]:
    return [
        BranchNode(
            id=str(uuid.uuid4()),
            event=branch.event,
            stability=branch.stability,
            challenge=branch.challenge,
            parentId=parent_id,
        )
        for branch in branches
    ]


def generate_branches(client: OpenAI, branch_request: BranchRequest) -> list[BranchNode]:
    prompt = build_branch_prompt(branch_request)
    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5"),
        input=prompt,
    )
    generated_branches = parse_branch_response(response.output_text)
    return to_branch_nodes(generated_branches, branch_request.parent_id)


def load_branch_request_from_file(path: str) -> BranchRequest:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return BranchRequest(
        age=int(data["age"]),
        values=str(data["values"]),
        interests=str(data["interests"]),
        personality=str(data["personality"]),
        current_event=str(data["current_event"]),
        story_summary=str(data["story_summary"]),
        parent_id=str(data.get("parent_id", "root")),
    )


def prompt_user(prompt_text: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt_text}{suffix}: ").strip()
    return value if value else default


def collect_branch_request() -> BranchRequest:
    age = int(prompt_user("年齢", "20"))
    values = prompt_user("価値観", "安定と成長の両立")
    interests = prompt_user("興味", "AI、ものづくり、学習")
    personality = prompt_user("性格傾向", "慎重だが興味があることには挑戦したい")
    current_event = prompt_user("現在の出来事・状況", "進路や将来の方向性を考えている")
    story_summary = prompt_user(
        "これまでの人生ストーリー要約",
        "まだ大きな分岐は少なく、将来の土台を作っている段階",
    )
    parent_id = prompt_user("親ノードID", "root")

    return BranchRequest(
        age=age,
        values=values,
        interests=interests,
        personality=personality,
        current_event=current_event,
        story_summary=story_summary,
        parent_id=parent_id,
    )


def get_branch_request_from_args() -> BranchRequest:
    if len(sys.argv) >= 3 and sys.argv[1] == "--input":
        return load_branch_request_from_file(sys.argv[2])
    return collect_branch_request()


def main() -> None:
    client = get_openai_client()
    branch_request = get_branch_request_from_args()
    branch_nodes = generate_branches(client, branch_request)
    print(
        json.dumps(
            {"branches": [asdict(branch) for branch in branch_nodes]},
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
