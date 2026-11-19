"""Assemble the bilingual readings and their audio in the Pages output."""
import csv
import hashlib
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory


def embedded(page, name):
    start = page.index(name) + len(name)
    value, size = json.JSONDecoder().raw_decode(page[start:])
    return value, page[start:start + size]


def paragraphs(sentences, breaks):
    starts = [0, *breaks]
    return [" ".join(sentences[a:b]) for a, b in zip(starts, [*breaks, len(sentences)])]


def narration(text, voice, wav):
    subprocess.run(["espeak-ng", "-v", voice, "-s", "155", "-w", wav, "--stdin"],
                   input=text, text=True, check=True)


def encode(inputs, output):
    command = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y"]
    for source in inputs:
        command.extend(["-i", source])
    if len(inputs) == 2:
        command.extend(["-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1"])
    subprocess.run([*command, "-ar", "24000", "-ac", "1", "-b:a", "32k", output], check=True)


def extend_readings(dest):
    content = Path(__file__).parent / "content" / "reading-extensions.tsv"
    with content.open() as stream:
        rows = list(csv.reader(stream, delimiter="\t"))
    levels = {"easy": [2, 6], "medium": [3, 9, 13], "hard": [2, 10, 13, 20]}
    additions = {(int(n), level): (en, tr) for n, level, en, tr in rows}
    expected = {(n, level) for n in range(6, 51) for level in levels}
    if len(rows) != len(expected) or additions.keys() != expected:
        raise ValueError("Expected one bilingual extension per reading in lessons 6–50")
    catalog_file = dest / "offline/catalog.json"
    inventory = json.loads(catalog_file.read_text())
    for lesson in inventory["lessons"]:
        if not lesson["id"].isdigit():
            continue
        number = int(lesson["id"])
        if number < 6:
            continue
        page_file = dest / f"lessons/{number}.html"
        page = page_file.read_text()
        passages, original = embedded(page, "const passageCatalog=")
        voices, original_voices = embedded(page, "const teacherAudioPaths=")
        folder = dest / f"audio/course/{number}"
        for level, breaks in levels.items():
            english, turkish = additions[number, level]
            passage = passages[level]
            passage["paragraphs"] = paragraphs([*passage["paragraphs"], english], breaks)
            passage["translations"] = paragraphs([*passage["translations"], turkish], breaks)
            note = [turkish, english.split(",")[0], "Cümleyi anlam gruplarıyla oku.",
                    "Metnin sonundaki örneği önceki paragrafla ilişkilendir."]
            passage["notes"].append(note)
            teacher = folder / f"teacher-extension-{level}.mp3"
            reading = folder / f"extended-{level}.mp3"
            with TemporaryDirectory() as tmp:
                wav = Path(tmp) / "voice.wav"
                narration(english, "en-gb", wav)
                encode([folder / f"reading-{level}.mp3", wav], reading)
                narration(turkish + " " + note[3], "tr", wav)
                encode([wav], teacher)
            for file in (reading, teacher):
                lesson["assets"].append("/" + file.relative_to(dest).as_posix())
            voices[level].append("/" + teacher.relative_to(dest).as_posix())
        page = page.replace(original, json.dumps(passages, ensure_ascii=False), 1)
        page = page.replace(original_voices, json.dumps(voices, ensure_ascii=False), 1)
        # The separate listening exercise retains its original track and transcript.
        prefix = f"/audio/course/{number}/"
        page = page.replace(prefix + "reading-easy.mp3", prefix + "extended-easy.mp3")
        page = page.replace(prefix + "reading-'+level+", prefix + "extended-'+level+")
        page_file.write_text(page)
        lesson["revision"] = hashlib.sha256(page.encode()).hexdigest()[:16]
        lesson["bytes"] = sum((dest / url.lstrip("/")).stat().st_size for url in lesson["assets"])
    catalog_file.write_text(json.dumps(inventory, ensure_ascii=False))
