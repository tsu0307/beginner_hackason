import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from string import Template

from openai import OpenAI


PROMPT_FILE = Path("prompt.txt")


@dataclass
class StorySummaryRequest:
    age: int
    values: str
    interests: str
    personality: str
    route_history: str
    result_history: str


@dataclass
class StorySummaryResult:
    story_summary: str


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


def load_story_prompt_template() -> str:
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")
    start_marker = "3. 人生ストーリー要約用プロンプト"
    end_marker = "\n4.ユーザー追加分岐用プロンプト"
    start_index = prompt_text.find(start_marker)
    end_index = prompt_text.find(end_marker)
    if start_index == -1 or end_index == -1:
        raise ValueError("Could not find the story summary prompt section in prompt.txt.")
    return prompt_text[start_index + len(start_marker):end_index].strip()


def build_story_prompt(story_request: StorySummaryRequest) -> str:
    template = load_story_prompt_template()
    safe_template = Template(
        template
        .replace("{age}", "$age")
        .replace("{values}", "$values")
        .replace("{interests}", "$interests")
        .replace("{personality}", "$personality")
        .replace("{route_history}", "$route_history")
        .replace("{result_history}", "$result_history")
    )
    return safe_template.substitute(
        age=story_request.age,
        values=story_request.values,
        interests=story_request.interests,
        personality=story_request.personality,
        route_history=story_request.route_history,
        result_history=story_request.result_history,
    )


def parse_story_summary_response(response_text: str) -> StorySummaryResult:
    data = json.loads(response_text)
    story_summary = str(data.get("story_summary", "")).strip()
    if not story_summary:
        raise ValueError("story_summary must be a non-empty string.")
    return StorySummaryResult(story_summary=story_summary)


def generate_story_summary(client: OpenAI, story_request: StorySummaryRequest) -> StorySummaryResult:
    prompt = build_story_prompt(story_request)
    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5"),
        input=prompt,
    )
    return parse_story_summary_response(response.output_text)


def prompt_user(prompt_text: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{prompt_text}{suffix}: ").strip()
    return value if value else default


def load_story_request_from_file(path: str) -> StorySummaryRequest:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return StorySummaryRequest(
        age=int(data["age"]),
        values=str(data["values"]),
        interests=str(data["interests"]),
        personality=str(data["personality"]),
        route_history=str(data["route_history"]),
        result_history=str(data["result_history"]),
    )


def collect_story_request() -> StorySummaryRequest:
    age = int(prompt_user("年齢", "20"))
    values = prompt_user("価値観", "安定と成長の両立")
    interests = prompt_user("興味", "AI、ものづくり、学習")
    personality = prompt_user("性格傾向", "慎重だが興味があることには挑戦したい")
    route_history = prompt_user(
        "これまでの選択履歴",
        '[{"event":"研究室に集中する","stability":"高","challenge":"中"},{"event":"AIスタートアップの長期インターンに応募する","stability":"中","challenge":"高"}]',
    )
    result_history = prompt_user(
        "各選択後の結果一覧",
        '[{"result_summary":"研究の基礎は固まったが、実務経験の少なさに焦りも残った。","happiness":"中"},{"result_summary":"開発経験は大きく伸びた一方で、学業との両立に負担も出た。","happiness":"中"}]',
    )
    return StorySummaryRequest(
        age=age,
        values=values,
        interests=interests,
        personality=personality,
        route_history=route_history,
        result_history=result_history,
    )


def get_story_request_from_args() -> StorySummaryRequest:
    if len(sys.argv) >= 3 and sys.argv[1] == "--input":
        return load_story_request_from_file(sys.argv[2])
    return collect_story_request()


def main() -> None:
    client = get_openai_client()
    story_request = get_story_request_from_args()
    result = generate_story_summary(client, story_request)
    print(json.dumps(asdict(result), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
