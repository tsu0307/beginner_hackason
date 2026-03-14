import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from string import Template

from openai import OpenAI


VALID_LEVELS = {"高", "中", "低"}
PROMPT_FILE = Path("prompt.txt")


@dataclass
class OutcomeRequest:
    age: int
    values: str
    interests: str
    personality: str
    story_summary: str
    selected_branch: str


@dataclass
class OutcomeResult:
    result_summary: str
    happiness: str


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


def load_outcome_prompt_template() -> str:
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")
    start_marker = "2.選択後の結果表示用プロンプト"
    end_marker = "\n3. 人生ストーリー要約用プロンプト"
    start_index = prompt_text.find(start_marker)
    end_index = prompt_text.find(end_marker)
    if start_index == -1 or end_index == -1:
        raise ValueError("Could not find the outcome prompt section in prompt.txt.")
    return prompt_text[start_index + len(start_marker):end_index].strip()


def build_outcome_prompt(outcome_request: OutcomeRequest) -> str:
    template = load_outcome_prompt_template()
    safe_template = Template(
        template
        .replace("{age}", "$age")
        .replace("{values}", "$values")
        .replace("{interests}", "$interests")
        .replace("{personality}", "$personality")
        .replace("{story_summary}", "$story_summary")
        .replace("{selected_branch}", "$selected_branch")
    )
    return safe_template.substitute(
        age=outcome_request.age,
        values=outcome_request.values,
        interests=outcome_request.interests,
        personality=outcome_request.personality,
        story_summary=outcome_request.story_summary,
        selected_branch=outcome_request.selected_branch,
    )


def parse_outcome_response(response_text: str) -> OutcomeResult:
    data = json.loads(response_text)
    result_summary = str(data.get("result_summary", "")).strip()
    happiness = str(data.get("happiness", "")).strip()

    if not result_summary:
        raise ValueError("result_summary must be a non-empty string.")
    if happiness not in VALID_LEVELS:
        raise ValueError("happiness must be one of 高, 中, 低.")

    return OutcomeResult(result_summary=result_summary, happiness=happiness)


def generate_outcome(client: OpenAI, outcome_request: OutcomeRequest) -> OutcomeResult:
    prompt = build_outcome_prompt(outcome_request)
    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5"),
        input=prompt,
    )
    return parse_outcome_response(response.output_text)


def prompt_user(prompt_text: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt_text}{suffix}: ").strip()
    return value if value else default


def load_outcome_request_from_file(path: str) -> OutcomeRequest:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return OutcomeRequest(
        age=int(data["age"]),
        values=str(data["values"]),
        interests=str(data["interests"]),
        personality=str(data["personality"]),
        story_summary=str(data["story_summary"]),
        selected_branch=str(data["selected_branch"]),
    )


def collect_outcome_request() -> OutcomeRequest:
    age = int(prompt_user("年齢", "20"))
    values = prompt_user("価値観", "安定と成長の両立")
    interests = prompt_user("興味", "AI、ものづくり、学習")
    personality = prompt_user("性格傾向", "慎重だが興味があることには挑戦したい")
    story_summary = prompt_user(
        "これまでの人生ストーリー要約",
        "まだ大きな分岐は少なく、将来の土台を作っている段階",
    )
    selected_branch = prompt_user(
        "今回ユーザーが選んだ分岐",
        '{"event":"AIスタートアップの長期インターンに応募する","stability":"中","challenge":"高"}',
    )
    return OutcomeRequest(
        age=age,
        values=values,
        interests=interests,
        personality=personality,
        story_summary=story_summary,
        selected_branch=selected_branch,
    )


def get_outcome_request_from_args() -> OutcomeRequest:
    if len(sys.argv) >= 3 and sys.argv[1] == "--input":
        return load_outcome_request_from_file(sys.argv[2])
    return collect_outcome_request()


def main() -> None:
    client = get_openai_client()
    outcome_request = get_outcome_request_from_args()
    result = generate_outcome(client, outcome_request)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
